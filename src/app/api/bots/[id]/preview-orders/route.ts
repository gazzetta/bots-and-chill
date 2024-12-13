import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { createOrders } from '@/lib/orders/createOrders';

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

      // Generate orders using current market price
      const orders = createOrders({
        bot,
        pair: bot.pair,
        symbol: bot.pair.symbol,
        currentPrice: ticker.bid,
        isPreview: true
      });

      // Calculate totals
      const baseOrderCost = orders.stage1.amount * ticker.bid;
      const totalOrders = 1 + orders.stage2.safetyOrders.length + 1; // Base + SOs + TP

      return NextResponse.json({ 
        success: true, 
        stages: {
          stage1: {
            baseOrder: {
              type: 'MARKET',
              side: 'BUY',
              symbol: bot.pair.symbol,
              amount: orders.stage1.amount,
              estimatedPrice: ticker.bid,
              estimatedCost: baseOrderCost,
              ccxtParams: {
                createOrder: {
                  symbol: bot.pair.symbol,
                  type: 'market',
                  side: 'buy',
                  amount: orders.stage1.amount,
                  params: {
                    timeInForce: 'GTC'
                  }
                }
              }
            }
          },
          stage2: {
            safetyOrders: orders.stage2.safetyOrders.map(so => ({
              type: 'LIMIT',
              side: 'BUY',
              symbol: so.symbol,
              amount: so.amount,
              price: so.price,
              estimatedCost: so.amount * so.price,
              ccxtParams: {
                createOrder: {
                  symbol: so.symbol,
                  type: 'limit',
                  side: 'buy',
                  amount: so.amount,
                  price: so.price,
                  params: {
                    timeInForce: 'PO',
                    postOnly: true
                  }
                }
              }
            })),
            takeProfit: {
              type: 'LIMIT',
              side: 'SELL',
              symbol: orders.stage2.takeProfit.symbol,
              amount: orders.stage2.takeProfit.amount,
              price: orders.stage2.takeProfit.price,
              estimatedReturn: orders.stage2.takeProfit.amount * orders.stage2.takeProfit.price,
              ccxtParams: {
                createOrder: {
                  symbol: orders.stage2.takeProfit.symbol,
                  type: 'limit',
                  side: 'sell',
                  amount: orders.stage2.takeProfit.amount,
                  price: orders.stage2.takeProfit.price,
                  params: {
                    timeInForce: 'PO',
                    postOnly: true
                  }
                }
              }
            }
          }
        },
        summary: {
          name: bot.name,
          pair: bot.pair.symbol,
          estimatedEntryPrice: ticker.bid,
          currentMarketPrice: ticker.bid,
          takeProfitPrice: orders.stage2.takeProfit.price,
          totalQuantity: orders.stage1.amount,
          totalCost: baseOrderCost,
          numberOfOrders: totalOrders,
          note: "Base order will be executed at market price. Safety orders and take profit will be adjusted based on actual entry price."
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