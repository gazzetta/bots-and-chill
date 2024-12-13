interface OrderStages {
  stage1: {
    symbol: string;      // Trading pair (e.g., "BTC/USDT")
    amount: number;      // Base order quantity
  };
  stage2: {
    safetyOrders: Array<{
      symbol: string;    // Trading pair
      amount: number;    // SO quantity
      price: number;     // SO trigger price
      params: { 
        timeInForce: string;  // "PO" for Post-Only
      }
    }>;
    takeProfit: {
      symbol: string;    // Trading pair
      amount: number;    // TP quantity
      price: number;     // TP trigger price
      params: { 
        timeInForce: string;  // "PO" for Post-Only
      }
    }
  }
}

export function createOrders({ bot, pair, symbol, currentPrice, fillPrice }: CreateOrdersConfig): OrderStages {
  // Base order calculations
  const baseOrderAmount = bot.baseOrderSize / currentPrice;
  const stage1 = {
    symbol,
    amount: baseOrderAmount
  };

  const referencePrice = fillPrice || currentPrice;
  
  // Calculate safety orders
  const safetyOrders = [];
  let previousPrice = referencePrice;
  let deviation = bot.priceDeviation;

  for (let i = 0; i < bot.maxSafetyOrders; i++) {
    let soPrice;
    if (i === 0) {
      soPrice = previousPrice * (1 - deviation / 100);
    } else {
      deviation = deviation * bot.safetyOrderPriceStep;
      soPrice = previousPrice * (1 - deviation / 100);
    }
    
    // Volume calculation stays the same
    let soAmount;
    if (i === 0) {
      soAmount = bot.safetyOrderSize / soPrice;
    } else {
      soAmount = (bot.safetyOrderSize * Math.pow(bot.safetyOrderVolumeStep, i)) / soPrice;
    }

    safetyOrders.push({
      symbol,
      amount: soAmount,
      price: soPrice,
      params: { timeInForce: 'PO' }
    });

    previousPrice = soPrice;  // Use this price as reference for next SO
  }

  const takeProfitPrice = referencePrice * (1 + bot.takeProfit / 100);

  return {
    stage1,
    stage2: {
      safetyOrders,
      takeProfit: {
        symbol,
        amount: baseOrderAmount,
        price: takeProfitPrice,
        params: { timeInForce: 'PO' }
      }
    }
  };
}

