import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { DealStatus, OrderStatus, OrderType, OrderSide, OrderMethod } from '@prisma/client';
import { decrypt } from '@/lib/encryption';
import { createOrders } from '@/lib/orders/createOrders';
import { placeBaseOrder } from '@/lib/orders/placeBaseOrder';

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
    exchange.setSandboxMode(bot.exchangeKey.isTestnet);

    // Start a database transaction
    const deal = await prisma.$transaction(async (tx) => {
      console.log('1. Starting transaction...');
      const { deal, baseOrder } = await placeBaseOrder({ bot, exchange, tx });
      console.log('2. Initial deal created in DB:', deal);

      try {
        // Stage 2: Place Safety Orders and Take Profit using actual fill price
        const stage2Orders = createOrders({
          bot,
          pair: bot.pair,
          symbol: bot.pair.symbol,
          currentPrice: baseOrder.price,
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
              method: OrderMethod.LIMIT,
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
            method: OrderMethod.LIMIT,
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

        console.log('21. Updating bot status if needed...');
        if (bot.status === 'STOPPED') {
          await tx.bot.update({
            where: { id: bot.id },
            data: { status: 'RUNNING' }
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