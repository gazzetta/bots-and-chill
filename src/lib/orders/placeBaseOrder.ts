import { Bot, Deal, OrderType, OrderStatus, OrderSide, OrderMethod, DealStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { Exchange } from 'ccxt';
import { logMessage, LogType } from '@/lib/logging';
import { createOrders } from './createOrders';

interface PlaceBaseOrderParams {
  bot: Bot & { pair: any };  // Add proper type for pair
  exchange: Exchange;
  tx: PrismaClient;          // For transaction context
  existingDeal?: Deal;       // Optional - if deal already exists
}

export async function placeBaseOrder({
  bot,
  exchange,
  tx,
  existingDeal
}: PlaceBaseOrderParams) {
  try {
    // 1. Create deal if not provided
    const deal = existingDeal || await tx.deal.create({
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

    // 2. Get current market price
    const ticker = await exchange.fetchTicker(bot.pair.symbol);
    if (!ticker || typeof ticker.bid !== 'number') {
      throw new Error(`Invalid ticker data for ${bot.pair.symbol}`);
    }

    // 3. Generate orders
    const orders = createOrders({
      bot,
      pair: bot.pair,
      symbol: bot.pair.symbol,
      currentPrice: ticker.bid
    });

    // 4. Place market order
    const baseOrder = await exchange.createMarketBuyOrder(
      orders.stage1.symbol,
      orders.stage1.amount
    );

    // 5. Save to database
    await tx.order.create({
      data: {
        dealId: deal.id,
        type: OrderType.BASE,
        side: OrderSide.BUY,
        method: OrderMethod.MARKET,
        status: OrderStatus.FILLED,
        symbol: bot.pair.symbol,
        quantity: Number(baseOrder.amount),
        price: Number(baseOrder.price),
        filled: Number(baseOrder.amount),
        remaining: 0,
        cost: Number(baseOrder.cost),
        exchangeOrderId: baseOrder.id,
        filledAt: new Date()
      }
    });

    // 6. Update deal
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        status: DealStatus.ACTIVE,
        currentQuantity: baseOrder.amount,
        averagePrice: baseOrder.price,
        totalCost: baseOrder.cost
      }
    });

    logMessage(LogType.INFO, 'Base order placed successfully', {
      dealId: deal.id,
      botId: bot.id,
      orderId: baseOrder.id,
      amount: baseOrder.amount,
      price: baseOrder.price
    });

    return { deal, baseOrder };

  } catch (error) {
    logMessage(LogType.ERROR, 'Failed to place base order', {
      botId: bot.id,
      error
    });
    throw error;
  }
} 