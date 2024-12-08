import { Bot } from '@prisma/client';
import { OrderStages } from './types';

interface CreateOrdersConfig {
  bot: Bot;
  symbol: string;
  currentPrice: number;
  fillPrice?: number;  // Only needed for actual placement of SO/TP
  isPreview?: boolean;
}

export function createOrders({ bot, symbol, currentPrice, fillPrice, isPreview = false }: CreateOrdersConfig): OrderStages {
  // Stage 1: Base Order (Market)
  const baseOrderAmount = bot.baseOrderSize / currentPrice;
  const stage1 = {
    symbol,
    type: 'market',
    side: 'buy',
    amount: baseOrderAmount
  };

  // Stage 2: Safety Orders + Take Profit (using fillPrice if available, otherwise currentPrice)
  const referencePrice = fillPrice || currentPrice;
  
  // Safety Orders
  const safetyOrders = [];
  for (let i = 0; i < bot.maxSafetyOrders; i++) {
    const deviation = bot.priceDeviation * Math.pow(bot.safetyOrderPriceStep, i);
    const price = referencePrice * (1 - deviation / 100);
    const sizeInUSDT = bot.safetyOrderSize * (i === 0 ? 1 : Math.pow(bot.safetyOrderVolumeStep, i));
    const sizeInBTC = sizeInUSDT / price;

    safetyOrders.push({
      symbol,
      type: 'limit',
      side: 'buy',
      amount: sizeInBTC,
      price: price,
      params: {
        timeInForce: 'PO'
      }
    });
  }

  // Take Profit
  const takeProfitPrice = referencePrice * (1 + bot.takeProfit / 100);
  const takeProfit = {
    symbol,
    type: 'limit',
    side: 'sell',
    amount: baseOrderAmount,
    price: takeProfitPrice,
    params: {
      timeInForce: 'PO'
    }
  };

  return {
    stage1: stage1,
    stage2: {
      safetyOrders,
      takeProfit
    }
  };
} 