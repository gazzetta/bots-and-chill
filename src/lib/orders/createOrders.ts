import { Decimal } from 'decimal.js';
import { Bot, TradingPair } from '@prisma/client';
import { OrderStages } from './types';
import { toDecimal, formatDecimal } from '@/lib/decimal';

interface CreateOrdersConfig {
  bot: Bot;
  pair: TradingPair;
  symbol: string;
  currentPrice: number;
  fillPrice?: number;
  isPreview?: boolean;
}

interface OrderConfig {
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: Decimal;
  price?: Decimal;
  params?: any;
}

export function createOrders({ bot, pair, symbol, currentPrice, fillPrice, isPreview = false }: CreateOrdersConfig): OrderStages {
  // Helper to round according to pair's minimum quantity
  const roundToMinQuantity = (amount: Decimal): Decimal => {
    const precision = Math.log10(1 / Number(pair.minQuantity));
    return amount.toDecimalPlaces(precision);
  };

  // Stage 1: Base Order (Market)
  const baseOrderAmount = roundToMinQuantity(
    toDecimal(bot.baseOrderSize).div(currentPrice)
  );

  const stage1 = {
    symbol,
    type: 'market',
    side: 'buy',
    amount: baseOrderAmount
  };

  // Stage 2: Safety Orders + Take Profit
  const referencePrice = toDecimal(fillPrice || currentPrice);
  
  // Safety Orders
  const safetyOrders = [];
  for (let i = 0; i < bot.maxSafetyOrders; i++) {
    let deviationPercent;
    if (i === 0) {
      deviationPercent = toDecimal(bot.priceDeviation);
    } else {
      const previousDeviation = toDecimal(bot.priceDeviation)
        .mul(toDecimal(bot.safetyOrderPriceStep).pow(i - 1));
      deviationPercent = previousDeviation.add(
        previousDeviation.mul(bot.safetyOrderPriceStep)
      );
    }

    const price = i === 0 
      ? referencePrice.mul(toDecimal(1).minus(deviationPercent.div(100)))
      : safetyOrders[i-1].price.mul(toDecimal(1).minus(deviationPercent.div(100)));
    
    const sizeInUSDT = toDecimal(bot.safetyOrderSize)
      .mul(i === 0 ? 1 : toDecimal(bot.safetyOrderVolumeStep).pow(i));
    
    const sizeInBTC = roundToMinQuantity(sizeInUSDT.div(price));

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
  const takeProfitPrice = referencePrice
    .mul(toDecimal(1).plus(toDecimal(bot.takeProfit).div(100)));
  
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