import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Exchange } from 'ccxt';
import { decrypt } from '@/lib/encryption';
import { OrderStatus, DealStatus, OrderType, Deal, Order, Bot, TradingPair, ExchangeKey, OrderSide, OrderMethod } from '@prisma/client';
import { logMessage, LogType } from '@/lib/logging';
import { createOrders } from '@/lib/orders/createOrders';
import ccxt from 'ccxt';

const DEV_MODE = process.env.DEV_MODE_MANUAL_CHECKER;
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:3002';

// Helper functions
async function startNewDeal(deal: DealWithRelations, exchange: Exchange, debugActions: DebugAction[]) {
  if (!DEV_MODE) {
    try {
      // Get auth token from the current request
      const authData = await auth();
      const token = await authData.getToken();

      // Use the existing bot orders endpoint with full URL and auth
      const response = await fetch(`${API_HOST}/api/bots/${deal.bot.id}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start new deal');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to start new deal');
      }

      debugActions.push({
        type: 'INFO',
        description: 'Started new deal via bot orders endpoint',
        details: {
          newDealId: result.deal.id,
          status: result.deal.status
        }
      });
    } catch (error) {
      debugActions.push({
        type: 'ERROR',
        description: 'Failed to start new deal',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  } else {
    // In DEV_MODE, just show what would happen
    const ticker = await exchange.fetchTicker(deal.bot.pair.symbol);
    const orders = createOrders({
      bot: deal.bot,
      pair: deal.bot.pair,
      symbol: deal.bot.pair.symbol,
      currentPrice: ticker.bid
    });

    debugActions.push({
      type: 'SQL_CREATE',
      description: 'Would create new deal',
      details: {
        botId: deal.bot.id,
        status: DealStatus.PENDING
      }
    });

    debugActions.push({
      type: 'CCXT_ORDER',
      description: 'Would place base market buy order',
      details: {
        symbol: orders.stage1.symbol,
        amount: orders.stage1.amount
      }
    });

    // Show what SO and TP orders would be placed
    orders.stage2.safetyOrders.forEach((so, index) => {
      debugActions.push({
        type: 'CCXT_ORDER',
        description: `Would place SO ${index + 1}`,
        details: {
          symbol: so.symbol,
          type: 'limit',
          side: 'buy',
          amount: so.amount,
          price: so.price,
          params: { timeInForce: 'PO', postOnly: true }
        }
      });
    });

    debugActions.push({
      type: 'CCXT_ORDER',
      description: 'Would place TP order',
      details: {
        symbol: orders.stage2.takeProfit.symbol,
        type: 'limit',
        side: 'sell',
        amount: orders.stage1.amount,
        price: orders.stage2.takeProfit.price,
        params: { timeInForce: 'PO', postOnly: true }
      }
    });
  }
}

async function completeDeal(deal: DealWithRelations, debugActions: DebugAction[]) {
  const now = new Date();
  
  if (!DEV_MODE) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        status: DealStatus.COMPLETED,
        currentQuantity: 0,
        updatedAt: now,
        closedAt: now
      }
    });
  }

  debugActions.push({
    type: 'SQL_UPDATE',
    description: 'Would mark deal as completed',
    details: {
      dealId: deal.id,
      updates: {
        status: DealStatus.COMPLETED,
        currentQuantity: 0,
        updatedAt: now,
        closedAt: now
      }
    }
  });
}

async function updateDealTotals(deal: DealWithRelations, totalQuantity: number, totalCost: number, debugActions: DebugAction[]) {
  const averagePrice = totalCost / totalQuantity;

  if (!DEV_MODE) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        currentQuantity: Number(totalQuantity),
        totalCost: Number(totalCost),
        averagePrice: Number(averagePrice)
      }
    });
  }

  debugActions.push({
    type: 'SQL_UPDATE',
    description: 'Would update deal totals',
    details: {
      dealId: deal.id,
      updates: {
        currentQuantity: Number(totalQuantity).toFixed(8),
        totalCost: Number(totalCost).toFixed(8),
        averagePrice: Number(averagePrice).toFixed(8)
      }
    }
  });
}

interface DealWithRelations extends Deal {
  bot: Bot & {
    pair: TradingPair;
    exchangeKey: ExchangeKey;
  };
  orders: Order[];
}

interface ExchangeOrder {
  id: string;
  status: string;
  filled: number;
  price: number;
  lastTradeTimestamp: number;
  amount: number;
}

interface DebugAction {
  type: 'SQL_UPDATE' | 'SQL_CREATE' | 'CCXT_ORDER' | 'CCXT_CANCEL' | 'INFO' | 'ERROR';
  description: string;
  details: Record<string, unknown>;
}

async function calculateTakeProfitPrice(averagePrice: number, takeProfit: number): Promise<number> {
  return averagePrice * (1 + takeProfit / 100);
}

async function handleState1(deal: DealWithRelations, exchange: Exchange, debugActions: DebugAction[]) {
  // State 1: SOs filled + TP filled
  const unfilledSOs = deal.orders.filter(o => 
    o.type === OrderType.SAFETY && o.status !== OrderStatus.FILLED
  );

  let totalQuantity = Number(deal.currentQuantity);
  let totalCost = Number(deal.totalCost);
  let newlyFilledSOQuantity = 0;
  let newlyFilledSOCost = 0;

  // First process filled SOs
  for (const so of unfilledSOs) {
    const orderStatus = await exchange.fetchOrder(so.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
    debugActions.push({
      type: 'CCXT_ORDER',
      description: 'Checked SO order status',
      details: { 
        orderId: so.exchangeOrderId, 
        status: orderStatus.status,
        filled: orderStatus.filled,
        price: orderStatus.price
      }
    });

    if (orderStatus.status === 'closed') {
      // Track newly discovered filled SOs
      newlyFilledSOQuantity += Number(orderStatus.filled);
      newlyFilledSOCost += Number(orderStatus.filled) * Number(orderStatus.price);

      if (!DEV_MODE) {
        await prisma.order.update({
          where: { id: so.id },
          data: {
            status: OrderStatus.FILLED,
            filled: orderStatus.filled,
            remaining: 0,
            filledAt: new Date(orderStatus.lastTradeTimestamp),
            cost: orderStatus.filled * orderStatus.price
          }
        });
      }
      debugActions.push({
        type: 'SQL_UPDATE',
        description: 'Would update SO as filled',
        details: {
          orderId: so.id,
          status: OrderStatus.FILLED,
          filled: orderStatus.filled,
          cost: orderStatus.filled * orderStatus.price
        }
      });
      totalQuantity = Number(totalQuantity) + Number(orderStatus.filled);
      totalCost = Number(totalCost) + (Number(orderStatus.filled) * Number(orderStatus.price));
    } else {
      // Cancel unfilled SOs
      debugActions.push({
        type: 'CCXT_CANCEL',
        description: 'Would cancel unfilled SO',
        details: { orderId: so.exchangeOrderId }
      });

      if (!DEV_MODE) {
        await exchange.cancelOrder(so.exchangeOrderId, deal.bot.pair.symbol);
        await prisma.order.update({
          where: { id: so.id },
          data: {
            status: OrderStatus.CANCELLED,
            remaining: 0,
            updatedAt: new Date()
          }
        });
      }
    }
  }

  // Update deal totals with proper number formatting
  debugActions.push({
    type: 'INFO',
    description: 'Current totals before update',
    details: {
      totalQuantity,
      totalCost,
      averagePrice: totalCost / totalQuantity,
      newlyFilledSOQuantity,
      newlyFilledSOCost
    }
  });

  await updateDealTotals(deal, totalQuantity, totalCost, debugActions);

  // Process TP
  const tpOrder = deal.orders.find(o => o.type === OrderType.TAKE_PROFIT);
  if (tpOrder) {
    const tpStatus = await exchange.fetchOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
    if (!DEV_MODE) {
      await prisma.order.update({
        where: { id: tpOrder.id },
        data: {
          status: OrderStatus.FILLED,
          filled: tpStatus.filled,
          remaining: 0,
          filledAt: new Date(tpStatus.lastTradeTimestamp),
          cost: tpStatus.filled * tpStatus.price
        }
      });
    }
    debugActions.push({
      type: 'SQL_UPDATE',
      description: 'Would update TP as filled',
      details: {
        orderId: tpOrder.id,
        status: OrderStatus.FILLED,
        filled: tpStatus.filled,
        cost: tpStatus.filled * tpStatus.price
      }
    });
  }

  // Complete deal with warning if needed
  if (newlyFilledSOQuantity > 0) {
    const warningMessage = `You still have ${newlyFilledSOQuantity.toFixed(8)} ${deal.bot.pair.symbol.split('/')[0]} that you purchased via Safety Orders at an average price of ${(newlyFilledSOCost / newlyFilledSOQuantity).toFixed(8)} that has not been sold due to the deal closing abnormally. You may wish to sell them to replenish your quote currency (${deal.bot.pair.symbol.split('/')[1]}).`;
    
    if (!DEV_MODE) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          warningMessage
        }
      });
    }
    
    debugActions.push({
      type: 'INFO',
      description: 'Added warning about unsold coins',
      details: { warningMessage }
    });
  }

  await completeDeal(deal, debugActions);
  await startNewDeal(deal, exchange, debugActions);
}

async function handleState2(deal: DealWithRelations, exchange: Exchange, debugActions: DebugAction[]) {
  // State 2: SOs filled + TP not filled
  const unfilledSOs = deal.orders.filter(o => 
    o.type === OrderType.SAFETY && o.status !== OrderStatus.FILLED
  );

  let totalQuantity = Number(deal.currentQuantity);
  let totalCost = Number(deal.totalCost);

  // Process filled SOs
  for (const so of unfilledSOs) {
    const orderStatus = await exchange.fetchOrder(so.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
    debugActions.push({
      type: 'CCXT_ORDER',
      description: 'Checked SO order status',
      details: { 
        orderId: so.exchangeOrderId, 
        status: orderStatus.status,
        filled: orderStatus.filled,
        price: orderStatus.price
      }
    });

    if (orderStatus.status === 'closed') {
      if (!DEV_MODE) {
        await prisma.order.update({
          where: { id: so.id },
          data: {
            status: OrderStatus.FILLED,
            filled: orderStatus.filled,
            remaining: 0,
            filledAt: new Date(orderStatus.lastTradeTimestamp),
            cost: orderStatus.filled * orderStatus.price
          }
        });
      }
      debugActions.push({
        type: 'SQL_UPDATE',
        description: 'Would update SO as filled',
        details: {
          orderId: so.id,
          status: OrderStatus.FILLED,
          filled: orderStatus.filled,
          cost: orderStatus.filled * orderStatus.price
        }
      });
      totalQuantity = Number(totalQuantity) + Number(orderStatus.filled);
      totalCost = Number(totalCost) + (Number(orderStatus.filled) * Number(orderStatus.price));
    }
  }

  // Update deal totals
  await updateDealTotals(deal, totalQuantity, totalCost, debugActions);

  // Update TP
  const tpOrder = deal.orders.find(o => o.type === OrderType.TAKE_PROFIT);
  if (tpOrder) {
    debugActions.push({
      type: 'CCXT_CANCEL',
      description: 'Would cancel current TP order',
      details: { orderId: tpOrder.exchangeOrderId }
    });

    // Cancel old TP
    if (!DEV_MODE) {
      await exchange.cancelOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol);
      await prisma.order.update({
        where: { id: tpOrder.id },
        data: {
          status: OrderStatus.CANCELLED,
          remaining: 0,
          updatedAt: new Date()
        }
      });
    }

    // Calculate and place new TP
    const averagePrice = Number(totalCost) / Number(totalQuantity);
    const newTPPrice = await calculateTakeProfitPrice(averagePrice, Number(deal.bot.takeProfit));

    debugActions.push({
      type: 'CCXT_ORDER',
      description: 'Would place new TP order',
      details: {
        symbol: deal.bot.pair.symbol,
        type: 'limit',
        side: 'sell',
        amount: Number(totalQuantity),
        price: newTPPrice,
        params: { timeInForce: 'PO', postOnly: true }
      }
    });

    try {
      const newTP = !DEV_MODE ? await exchange.createOrder(
        deal.bot.pair.symbol,
        'limit',
        'sell',
        Number(totalQuantity),
        newTPPrice,
        { timeInForce: 'PO', postOnly: true }
      ) as ExchangeOrder : null;

      if (!DEV_MODE && newTP) {
        await prisma.order.create({
          data: {
            dealId: deal.id,
            type: OrderType.TAKE_PROFIT,
            side: OrderSide.SELL,
            method: OrderMethod.LIMIT,
            status: OrderStatus.PLACED,
            symbol: deal.bot.pair.symbol,
            quantity: Number(totalQuantity),
            price: newTPPrice,
            filled: 0,
            remaining: Number(totalQuantity),
            cost: 0,
            exchangeOrderId: newTP.id
          }
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'OrderImmediatelyFillable') {
        debugActions.push({
          type: 'CCXT_ORDER',
          description: 'Would place market sell order (TP price below market)',
          details: {
            symbol: deal.bot.pair.symbol,
            type: 'market',
            side: 'sell',
            amount: Number(totalQuantity)
          }
        });

        // Place market sell order instead
        const marketTP = !DEV_MODE ? await exchange.createMarketOrder(
          deal.bot.pair.symbol,
          'sell',
          Number(totalQuantity)
        ) as ExchangeOrder : null;

        if (!DEV_MODE && marketTP) {
          await prisma.order.create({
            data: {
              dealId: deal.id,
              type: OrderType.TAKE_PROFIT,
              side: OrderSide.SELL,
              method: OrderMethod.MARKET,
              status: OrderStatus.FILLED,
              symbol: deal.bot.pair.symbol,
              quantity: Number(marketTP.amount),
              price: Number(marketTP.price),
              filled: Number(marketTP.amount),
              remaining: 0,
              cost: Number(marketTP.amount) * Number(marketTP.price),
              exchangeOrderId: marketTP.id,
              filledAt: new Date(marketTP.lastTradeTimestamp || Date.now())
            }
          });

          // Complete this deal and start new one
          await completeDeal(deal, debugActions);
          await startNewDeal(deal, exchange, debugActions);
        }
      }
    }
  }
}

async function handleState3(deal: DealWithRelations, exchange: Exchange, debugActions: DebugAction[]) {
  // State 3: No SOs filled + TP filled
  const unfilledSOs = deal.orders.filter(o => 
    o.type === OrderType.SAFETY && o.status !== OrderStatus.FILLED
  );

  // Cancel all unfilled SOs
  for (const so of unfilledSOs) {
    debugActions.push({
      type: 'CCXT_CANCEL',
      description: 'Would cancel unfilled SO',
      details: { orderId: so.exchangeOrderId }
    });

    if (!DEV_MODE) {
      await exchange.cancelOrder(so.exchangeOrderId, deal.bot.pair.symbol);
      await prisma.order.update({
        where: { id: so.id },
        data: {
          status: OrderStatus.CANCELLED,
          remaining: 0,
          updatedAt: new Date()
        }
      });
    }
  }

  // Process TP
  const tpOrder = deal.orders.find(o => o.type === OrderType.TAKE_PROFIT);
  if (tpOrder) {
    const tpStatus = await exchange.fetchOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
    debugActions.push({
      type: 'SQL_UPDATE',
      description: 'Would update TP as filled',
      details: {
        orderId: tpOrder.id,
        status: OrderStatus.FILLED,
        filled: tpStatus.filled,
        cost: tpStatus.filled * tpStatus.price
      }
    });

    if (!DEV_MODE) {
      await prisma.order.update({
        where: { id: tpOrder.id },
        data: {
          status: OrderStatus.FILLED,
          filled: tpStatus.filled,
          remaining: 0,
          filledAt: new Date(tpStatus.lastTradeTimestamp),
          cost: tpStatus.filled * tpStatus.price
        }
      });
    }
  }

  // Complete deal and start new one
  await completeDeal(deal, debugActions);
  await startNewDeal(deal, exchange, debugActions);
}

async function failedWebsocketDealChecker(deal: DealWithRelations, exchange: Exchange) {
  const debugActions: DebugAction[] = [];
  try {
    // First gather all order statuses
    const tpOrder = deal.orders.find(o => o.type === OrderType.TAKE_PROFIT);
    let tpFilledIRL = false;
    let tpStatus: ExchangeOrder | null = null;
    
    // Check TP status first
    if (tpOrder) {
      tpStatus = await exchange.fetchOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
      if (tpStatus.status === 'canceled') {
        if (!DEV_MODE) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: { status: DealStatus.FAILED }
          });
        }
        return DEV_MODE ? { 
          success: true, 
          updated: false,
          DEV_MODE,
          actions: debugActions 
        } : {
          success: true,
          updated: false
        };
      }
      tpFilledIRL = tpStatus.status === 'closed';
    }

    // Check unfilled SO orders
    const unfilledSOs = deal.orders.filter(o => 
      o.type === OrderType.SAFETY && o.status !== OrderStatus.FILLED
    );

    // Count how many SOs are filled IRL
    let soFilledCount = 0;
    for (const so of unfilledSOs) {
      const orderStatus = await exchange.fetchOrder(so.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
      if (orderStatus.status === 'canceled') {
        if (!DEV_MODE) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: { status: DealStatus.FAILED }
          });
        }
        return DEV_MODE ? { 
          success: true, 
          updated: false,
          DEV_MODE,
          actions: debugActions 
        } : {
          success: true,
          updated: false
        };
      }
      if (orderStatus.status === 'closed') {
        soFilledCount++;
      }
    }

    // Determine state of play
    let stateOfPlay = 4; // Default to "do nothing"
    
    if (soFilledCount > 0 && tpFilledIRL) {
      stateOfPlay = 1;
      await handleState1(deal, exchange, debugActions);
    } else if (soFilledCount > 0 && !tpFilledIRL) {
      stateOfPlay = 2;
      await handleState2(deal, exchange, debugActions);
    } else if (soFilledCount === 0 && tpFilledIRL) {
      stateOfPlay = 3;
      await handleState3(deal, exchange, debugActions);
    }

    return DEV_MODE ? { 
      success: true, 
      updated: stateOfPlay !== 4,
      DEV_MODE,
      actions: debugActions 
    } : {
      success: true,
      updated: stateOfPlay !== 4
    };

  } catch (error) {
    logMessage(LogType.ERROR, 'Failed to check deal status', { error, dealId: deal.id });
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: id },
      include: {
        bot: {
          include: {
            pair: true,
            exchangeKey: true
          }
        },
        orders: true
      }
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const exchange = new ccxt.binance({
      apiKey: decrypt(deal.bot.exchangeKey.apiKey),
      secret: decrypt(deal.bot.exchangeKey.apiSecret),
      enableRateLimit: true,
    });

    exchange.setSandboxMode(deal.bot.exchangeKey.isTestnet);

    const result = await failedWebsocketDealChecker(deal, exchange);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Failed to check deal status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check deal status' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

