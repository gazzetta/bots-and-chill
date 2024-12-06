import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';

export const dynamic = 'force-dynamic';


export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {

  const { id } = await params;

  // Block compilation if no ID
  if (!id || id === '[id]') {
    return NextResponse.json(
      { success: false, error: 'Invalid bot ID' },
      { status: 400 }
    );
  }

  
  console.log('Routing via sec/app/api/bots/[id]/preview-orders/route.ts');
  console.log('Processing preview for bot:', id);

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bot = await prisma.bot.findUnique({
      where: { id: id },
      include: { 
        pair: true,
        exchangeKey: true,
      },
    });

    if (!bot) {
      return NextResponse.json({ success: false, error: 'Bot not found' }, { status: 404 });
    }

    // Initialize Binance Testnet
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
        createMarketBuyOrderRequiresPrice: false,
        warnOnFetchOHLCVLimitArgument: false,
      },
      urls: {
        api: {
          rest: 'https://testnet.binance.vision/api',
        },
      }
    });

    try {
      const ticker = await exchange.fetchTicker(bot.pair.symbol);
      if (!ticker || !ticker.bid) {
        throw new Error(`Could not fetch price for ${bot.pair.symbol}`);
      }

      // Get current price from ticker
      const currentPrice = ticker.bid;
      const baseOrderPrice = currentPrice * 0.999; // 0.1% below current bid

      // Convert USDT amounts to BTC
      const baseOrderAmountInBTC = bot.baseOrderSize / baseOrderPrice; // Convert USDT to BTC
      let safetyOrderSizeInBTC = bot.safetyOrderSize / baseOrderPrice; // Convert USDT to BTC

      const orders = [];

      // 1. Base Order
      orders.push({
        symbol: bot.pair.symbol,
        type: 'limit',
        side: 'buy',
        amount: baseOrderAmountInBTC, // Now in BTC
        price: baseOrderPrice,
        params: {
          timeInForce: 'PO',
          postOnly: true,
        }
      });

      // 2. Safety Orders
      for (let i = 0; i < bot.maxSafetyOrders; i++) {
        const deviation = bot.priceDeviation * Math.pow(bot.safetyOrderPriceStep, i);
        const price = baseOrderPrice * (1 - deviation / 100);
        
        // Calculate size in USDT first, then convert to BTC
        const sizeInUSDT = bot.safetyOrderSize * (i === 0 ? 1 : Math.pow(bot.safetyOrderVolumeStep, i));
        const sizeInBTC = sizeInUSDT / price;

        orders.push({
          symbol: bot.pair.symbol,
          type: 'limit',
          side: 'buy',
          amount: sizeInBTC, // Now in BTC
          price: price,
          params: {
            timeInForce: 'GTC',
          }
        });
      }

      // 3. Take Profit Order - Initially only for base order amount
      const takeProfitPrice = baseOrderPrice * (1 + bot.takeProfit / 100);

      orders.push({
        symbol: bot.pair.symbol,
        type: 'limit',
        side: 'sell',
        amount: baseOrderAmountInBTC, // Only the base order amount initially
        price: takeProfitPrice,
        params: {
          timeInForce: 'GTC',
        }
      });

      return NextResponse.json({ 
        success: true, 
        orders,
        summary: {
          name: bot.name,
          pair: bot.pair.symbol,
          baseOrderPrice,
          currentMarketPrice: currentPrice,
          averageEntryPrice: baseOrderPrice, // Initial average is just the base order price
          takeProfitPrice,
          totalQuantity: baseOrderAmountInBTC, // Only base order quantity
          totalCost: baseOrderAmountInBTC * baseOrderPrice, // Only base order cost
          numberOfOrders: orders.length,
        }
      });

    } catch (exchangeError) {
      console.error('Exchange error:', exchangeError);
      return NextResponse.json(
        { success: false, error: `Exchange error: ${exchangeError.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Failed to preview orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview orders' },
      { status: 500 }
    );
  }
} 