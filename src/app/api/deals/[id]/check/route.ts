import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Exchange } from 'ccxt';
import { decrypt } from '@/lib/encryption';
import { OrderStatus, DealStatus, OrderType, Deal, Order, Bot, TradingPair, ExchangeKey, OrderSide, OrderMethod } from '@prisma/client';
import { calculateTakeProfitPrice } from '@/lib/exchange/orders';
import { logMessage, LogType } from '@/lib/logging';
import { createOrders } from '@/lib/orders/createOrders';
import { placeBaseOrder } from '@/lib/orders/placeBaseOrder';
import ccxt from 'ccxt';

const DEV_MODE = process.env.DEV_MODE_MANUAL_CHECKER;


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
}

interface DebugAction {
  type: 'SQL_UPDATE' | 'SQL_CREATE' | 'CCXT_ORDER' | 'CCXT_CANCEL';
  description: string;
  details: any;
}

async function failedWebsocketDealChecker(deal: DealWithRelations, exchange: Exchange) {
  const debugActions: DebugAction[] = [];
  try {
  
  
    // 1. First check TP status
    const tpOrder = deal.orders.find(o => o.type === OrderType.TAKE_PROFIT);
    let tpFilledIRL = false;
    
    if (tpOrder) {
      const tpStatus = await exchange.fetchOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
      tpFilledIRL = tpStatus.status === 'closed';
      
      debugActions.push({
        type: 'CCXT_ORDER',
        description: 'Checked TP order status',
        details: { orderId: tpOrder.exchangeOrderId, status: tpStatus.status }
      });

      // If TP is filled, update it in DB
      if (tpFilledIRL && tpOrder.status !== OrderStatus.FILLED) {
        debugActions.push({
          type: 'SQL_UPDATE',
          description: 'Would update TP order as filled',
          details: {
            orderId: tpOrder.id,
            updates: {
              status: OrderStatus.FILLED,
              filled: tpStatus.filled,
              remaining: 0,
              filledAt: new Date(tpStatus.lastTradeTimestamp),
              cost: tpStatus.filled * tpStatus.price
            }
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
    }

    // 2. Check unfilled SO orders
    const unfilledSOs = deal.orders.filter(o => 
      o.type === OrderType.SAFETY && o.status !== OrderStatus.FILLED
    );

    let totalQuantity = deal.currentQuantity;
    let totalCost = deal.totalCost;
    let needNewTP = false;

    // Process each unfilled SO
    for (const so of unfilledSOs) {
      const orderStatus = await exchange.fetchOrder(so.exchangeOrderId, deal.bot.pair.symbol) as ExchangeOrder;
      debugActions.push({
        type: 'CCXT_ORDER',
        description: 'Checked SO order status',
        details: { orderId: so.exchangeOrderId, status: orderStatus.status }
      });
      
      if (orderStatus.status === 'closed') {
        debugActions.push({
          type: 'SQL_UPDATE',
          description: 'Would update SO order as filled',
          details: {
            orderId: so.id,
            updates: {
              status: OrderStatus.FILLED,
              filled: orderStatus.filled,
              remaining: 0,
              filledAt: new Date(orderStatus.lastTradeTimestamp),
              cost: orderStatus.filled * orderStatus.price
            }
          }
        });

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

        totalQuantity = totalQuantity.plus(orderStatus.filled);
        totalCost = totalCost.plus(orderStatus.filled * orderStatus.price);
        needNewTP = true;
      }
    }

    // 3. Handle TP updates if needed
    if (needNewTP && !tpFilledIRL) {
      if (tpOrder) {
        debugActions.push({
          type: 'CCXT_CANCEL',
          description: 'Would cancel old TP order',
          details: { orderId: tpOrder.exchangeOrderId }
        });

        if (!DEV_MODE) {
          await exchange.cancelOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol);
          
          // Add the missing DB update for cancelled TP
          await prisma.order.update({
            where: { id: tpOrder.id },
            data: {
              status: OrderStatus.CANCELLED,
              remaining: 0,
              updatedAt: new Date()
            }
          });

          debugActions.push({
            type: 'SQL_UPDATE',
            description: 'Updated cancelled TP order in DB',
            details: {
              orderId: tpOrder.id,
              updates: {
                status: OrderStatus.CANCELLED,
                remaining: 0,
                updatedAt: new Date()
              }
            }
          });
        }
      }

      const averagePrice = totalCost.toNumber() / totalQuantity.toNumber()  ;
      const newTPPrice = calculateTakeProfitPrice(averagePrice, deal.bot.takeProfit.toNumber());

      debugActions.push({
        type: 'CCXT_ORDER',
        description: 'Would place new TP order',
        details: {
          symbol: deal.bot.pair.symbol,
          type: 'limit',
          side: 'sell',
          amount: totalQuantity,
          price: newTPPrice,
          params: { timeInForce: 'PO', postOnly: true }
        }
      });

      if (!DEV_MODE) {
        try {
          if (tpOrder) {
            await exchange.cancelOrder(tpOrder.exchangeOrderId, deal.bot.pair.symbol);
          }

          const newTP = await exchange.createOrder(
            deal.bot.pair.symbol,
            'limit',
            'sell',
            totalQuantity.toNumber(),
            newTPPrice,
            { timeInForce: 'PO', postOnly: true }
          ) as ExchangeOrder;

          debugActions.push({
            type: 'SQL_CREATE',
            description: 'Would create new TP order in DB',
            details: {
              dealId: deal.id,
              type: OrderType.TAKE_PROFIT,
              side: 'SELL',
              status: OrderStatus.PLACED,
              symbol: deal.bot.pair.symbol,
              quantity: totalQuantity,
              price: newTPPrice,
              exchangeOrderId: newTP.id
            }
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'OrderImmediatelyFillable') {
            debugActions.push({
              type: 'CCXT_ORDER',
              description: 'Would place market sell order (TP price below market)',
              details: {
                symbol: deal.bot.pair.symbol,
                type: 'market',
                side: 'sell',
                amount: totalQuantity
              }
            });

            debugActions.push({
              type: 'SQL_UPDATE',
              description: 'Would mark deal as completed',
              details: {
                dealId: deal.id,
                updates: {
                  status: DealStatus.COMPLETED,
                  currentQuantity: 0,
                  updatedAt: new Date()
                }
              }
            });
          }
        }
      }
    }

    // 4. Update deal totals if needed
    if (needNewTP) {
      const filledOrders = deal.orders.filter(o => o.status === OrderStatus.FILLED);
      const totalQuantity = filledOrders.reduce((sum, order) => {
        return sum + Number(order.filled);
      }, 0);

      const totalCost = filledOrders.reduce((sum, order) => {
        return sum + (Number(order.filled) * Number(order.price));
      }, 0);

      const averagePrice = totalCost / totalQuantity;

      debugActions.push({
        type: 'SQL_UPDATE',
        description: 'Would update deal totals',
        details: {
          dealId: deal.id,
          updates: {
            currentQuantity: totalQuantity,
            totalCost: totalCost,
            averagePrice: averagePrice
          }
        }
      });

      if (!DEV_MODE) {
        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            currentQuantity: totalQuantity,
            totalCost: totalCost,
            averagePrice: averagePrice
          }
        });
      }
    }

    if (tpFilledIRL) {
      debugActions.push({
        type: 'SQL_UPDATE',
        description: 'Would mark current deal as completed',
        details: {
          dealId: deal.id,
          status: DealStatus.COMPLETED
        }
      });

      if (!DEV_MODE) {
        // Mark current deal as completed
        await prisma.deal.update({
          where: { id: deal.id },
          data: {
            status: DealStatus.COMPLETED,
            currentQuantity: 0,
            updatedAt: new Date()
          }
        });

        // Start new deal
        const ticker = await exchange.fetchTicker(deal.bot.pair.symbol);
        const newDeal = await prisma.deal.create({
          data: {
            botId: deal.bot.id,
            status: DealStatus.PENDING,
            currentQuantity: 0,
            averagePrice: 0,
            totalCost: 0,
            currentProfit: 0
          }
        });

        // Use createOrders to generate order parameters
        const orders = createOrders({
          bot: deal.bot,
          pair: deal.bot.pair,
          symbol: deal.bot.pair.symbol,
          currentPrice: ticker.bid
        });

        // Place and save base order
        const baseOrder = await exchange.createMarketBuyOrder(
          orders.stage1.symbol,
          orders.stage1.amount
        );

        await prisma.order.create({
          data: {
            dealId: newDeal.id,
            type: OrderType.BASE,
            side: OrderSide.BUY,
            method: OrderMethod.MARKET,
            status: OrderStatus.FILLED,
            symbol: deal.bot.pair.symbol,
            quantity: Number(baseOrder.amount),
            price: Number(baseOrder.price),
            filled: Number(baseOrder.amount),
            remaining: 0,
            cost: Number(baseOrder.cost),
            exchangeOrderId: baseOrder.id,
            filledAt: new Date()
          }
        });

        // After placing base order for new deal...
        const stage2Orders = createOrders({
          bot: deal.bot,
          pair: deal.bot.pair,
          symbol: deal.bot.pair.symbol,
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
          await prisma.order.create({
            data: {
              dealId: newDeal.id,
              type: OrderType.SAFETY,
              side: OrderSide.BUY,
              method: OrderMethod.LIMIT,
              status: OrderStatus.PLACED,
              symbol: deal.bot.pair.symbol,
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
          baseOrder.amount,
          tp.price,
          tp.params
        );
        await prisma.order.create({
          data: {
            dealId: newDeal.id,
            type: OrderType.TAKE_PROFIT,
            side: OrderSide.SELL,
            method: OrderMethod.LIMIT,
            status: OrderStatus.PLACED,
            symbol: deal.bot.pair.symbol,
            quantity: Number(baseOrder.amount),
            price: Number(tp.price),
            filled: 0,
            remaining: Number(baseOrder.amount),
            cost: 0,
            exchangeOrderId: takeProfitOrder.id
          }
        });

        // Update deal status to ACTIVE
        await prisma.deal.update({
          where: { id: newDeal.id },
          data: {
            status: DealStatus.ACTIVE,
            currentQuantity: baseOrder.amount,
            averagePrice: baseOrder.price,
            totalCost: baseOrder.cost
          }
        });
      }
    }

    return { 
      success: true, 
      updated: needNewTP,
      DEV_MODE,
      actions: debugActions 
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

    /*if (DEV_MODE) {
      console.log ("dev mode");
      return;
    } else {
      console.log ("no dev mode");
      return;
    }*/

    const {id} = await params;
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