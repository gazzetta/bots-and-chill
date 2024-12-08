import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { DealStatus, OrderStatus, OrderType, OrderSide } from '@prisma/client';
import { decrypt } from '@/lib/encryption';
import { createOrders } from '@/lib/orders/createOrders';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    // Add validation for bot ID
    if (!id) {
      return NextResponse.json({ success: false, error: 'Bot ID is required' }, { status: 400 });
    }

    console.log('Starting order creation for bot:', id);

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

    // Initialize exchange
    const exchange = new ccxt.binance({
      apiKey: decrypt(bot.exchangeKey.apiKey),
      secret: decrypt(bot.exchangeKey.apiSecret),
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
        createMarketBuyOrderRequiresPrice: false,
      }
    });
    exchange.setSandboxMode(true);

    // Start a database transaction
    const deal = await prisma.$transaction(async (tx) => {
      console.log('1. Starting transaction...');
      const deal = await tx.deal.create({
        data: {
          botId: bot.id,
          status: DealStatus.PENDING,
          currentQuantity: 0,
          averagePrice: 0,
          totalCost: 0,
          currentProfit: 0,
          actualSafetyOrders: 0,
        }
      });
      console.log('2. Initial deal created in DB:', deal);

      try {
        // Stage 1: Place Base Order
        console.log('3. Fetching current price from Binance...');
        const ticker = await exchange.fetchTicker(bot.pair.symbol);
        if (!ticker || typeof ticker.bid !== 'number') {
          throw new Error(`Invalid ticker data for ${bot.pair.symbol}: ${JSON.stringify(ticker)}`);
        }
        console.log('4. Current price:', ticker.bid);
        
        const orders = createOrders({
          bot,
          symbol: bot.pair.symbol,
          currentPrice: ticker.bid
        });

        console.log('Generated orders:', JSON.stringify(orders, null, 2));

        // Place market order
        console.log('Placing market order...');
        const baseOrder = await exchange.createMarketBuyOrder(
          orders.stage1.symbol,
          orders.stage1.amount
        );
        console.log('Market order response:', JSON.stringify(baseOrder, null, 2));

        // Save base order to DB
        await tx.order.create({
          data: {
            dealId: deal.id,
            type: OrderType.BASE,
            side: OrderSide.BUY,
            status: OrderStatus.FILLED,
            symbol: bot.pair.symbol,
            quantity: Number(baseOrder.amount),
            price: Number(baseOrder.price),
            filled: Number(baseOrder.amount),
            remaining: 0,
            cost: Number(baseOrder.cost),
            exchangeOrderId: baseOrder.id
          }
        });
        console.log('9. Base order saved to DB');

        // Stage 2: Place Safety Orders and Take Profit using actual fill price
        const stage2Orders = createOrders({
          bot,
          symbol: bot.pair.symbol,
          currentPrice: ticker.bid,
          fillPrice: baseOrder.price
        }).stage2;

        // Place safety orders
        for (const so of stage2Orders.safetyOrders) {
          const safetyOrder = await exchange.createLimitBuyOrder(
            so.symbol,
            so.amount,
            so.price,
            so.params
          );
          await tx.order.create({
            data: {
              dealId: deal.id,
              type: OrderType.SAFETY,
              side: OrderSide.BUY,
              status: OrderStatus.PLACED,
              symbol: bot.pair.symbol,
              quantity: Number(so.amount),
              price: Number(so.price),
              filled: 0,
              remaining: Number(so.amount),
              cost: 0,
              exchangeOrderId: safetyOrder.id
            }
          });
        }

        // Place take profit
        const tp = stage2Orders.takeProfit;
        const takeProfitOrder = await exchange.createLimitSellOrder(
          tp.symbol,
          baseOrder.amount, // Use actual filled amount
          tp.price,
          tp.params
        );
        await tx.order.create({
          data: {
            dealId: deal.id,
            type: OrderType.TAKE_PROFIT,
            side: OrderSide.SELL,
            status: OrderStatus.PLACED,
            symbol: bot.pair.symbol,
            quantity: Number(baseOrder.amount),
            price: Number(tp.price),
            filled: 0,
            remaining: Number(baseOrder.amount),
            cost: 0,
            exchangeOrderId: takeProfitOrder.id
          }
        });

        // Update deal status
        await tx.deal.update({
          where: { id: deal.id },
          data: {
            status: DealStatus.ACTIVE,
            currentQuantity: baseOrder.amount,
            averagePrice: baseOrder.price,
            totalCost: baseOrder.cost
          }
        });

        console.log('21. Updating bot status if needed...');
        if (bot.status === 'stopped') {
          await tx.bot.update({
            where: { id: bot.id },
            data: { status: 'active' }
          });
        }

        console.log('22. Transaction successful, returning deal:', deal);
        return deal;

      } catch (txError) {
        console.error('Transaction error:', {
          message: txError instanceof Error ? txError.message : 'Unknown transaction error',
          stack: txError instanceof Error ? txError.stack : undefined
        });
        throw txError;
      }
    });

    console.log('After transaction, deal:', deal);

    // Make sure we have a deal before sending response
    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Failed to create deal - no deal returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      deal: deal
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create deal';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    console.error('Failed to create deal:', {
      message: errorMessage,
      stack: errorDetails
    });

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}