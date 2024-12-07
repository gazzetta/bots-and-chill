import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { DealStatus, OrderStatus, OrderType, OrderSide } from '@prisma/client';
import { decrypt } from '@/lib/encryption';
import { wsManager } from '@/lib/exchange/websocket-manager';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get bot with exchange key
    const bot = await prisma.bot.findUnique({
      where: { id: params.id },
      include: {
        exchangeKey: true,
        pair: true,
      }
    });

    if (!bot) {
      return NextResponse.json({ success: false, error: 'Bot not found' }, { status: 404 });
    }

    // Create exchange instance
    const exchange = new ccxt.binance({
      apiKey: decrypt(bot.exchangeKey.apiKey),
      secret: decrypt(bot.exchangeKey.apiSecret),
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true,
      }
    });

    if (bot.exchangeKey.isTestnet) {
      exchange.setSandboxMode(true);
    }

    // Place orders using CCXT
    const baseOrder = await exchange.createOrder(
      bot.pair.symbol,
      'market',
      'buy',
      bot.baseOrderSize
    );

    // Base order will be filled immediately, so we can:
    // 1. Get the actual fill price
    const fillPrice = baseOrder.price;
    const fillQuantity = baseOrder.filled;

    // 2. Place TP order
    const takeProfitPrice = fillPrice * (1 + (bot.takeProfit / 100));
    const tpOrder = await exchange.createOrder(
      bot.pair.symbol,
      'limit',
      'sell',
      fillQuantity,
      takeProfitPrice,
      { timeInForce: 'PO' }
    );

    // 3. Place Safety Orders
    for (let i = 0; i < bot.maxSafetyOrders; i++) {
      const soPrice = fillPrice * (1 - (bot.priceDeviation * Math.pow(bot.safetyOrderPriceStep, i) / 100));
      const soSize = bot.safetyOrderSize * Math.pow(bot.safetyOrderVolumeStep, i);
      
      const soOrder = await exchange.createOrder(
        bot.pair.symbol,
        'limit',
        'buy',
        soSize,
        soPrice,
        { timeInForce: 'PO' }
      );

      await prisma.order.create({
        data: {
          dealId: deal.id,
          type: OrderType.SAFETY,
          side: OrderSide.BUY,
          status: OrderStatus.PLACED,
          price: marketPrice,
          quantity: soSize,
          orderId: soOrder.id,
        }
      });
    }

    // Save TP order to DB
    await prisma.order.create({
      data: {
        dealId: deal.id,
        type: OrderType.TAKE_PROFIT,
        side: OrderSide.SELL,
        status: OrderStatus.PLACED,
        price: marketPrice,
        quantity: fillQuantity,
        orderId: tpOrder.id,
      }
    });

    // After all orders placed
    await prisma.deal.update({
      where: { id: deal.id },
      data: { status: DealStatus.ACTIVE }
    });

    // If first deal
    await prisma.bot.update({
      where: { id: bot.id },
      data: { status: 'ACTIVE' }
    });

    // When starting bot
    await wsManager.addConnection(bot.exchangeKey);

    return NextResponse.json({ 
      success: true, 
      deal,
      baseOrder 
    });

  } catch (error) {
    console.error('Failed to start deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start deal' },
      { status: 500 }
    );
  }
}