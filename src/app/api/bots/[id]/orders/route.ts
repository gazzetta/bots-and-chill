import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { DealStatus, OrderStatus, OrderType, OrderSide, HistoryType } from '@prisma/client';
import { format } from 'date-fns';

// Helper function for pretty logging
function logExchangeMessage(type: string, message: any) {
  const timestamp = format(new Date(), 'HH:mm:ss.SSS');
  console.log(`[${timestamp}] ${type}: `, JSON.stringify(message, null, 2));
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bot = await prisma.bot.findUnique({
      where: { id },
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
      apiKey: bot.exchangeKey.apiKey,
      secret: bot.exchangeKey.apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
        createMarketBuyOrderRequiresPrice: false,
      },
      urls: {
        api: {
          rest: 'https://testnet.binance.vision/api',
        },
      }
    });

    // Log exchange initialization
    logExchangeMessage('EXCHANGE_INIT', {
      exchange: 'Binance Testnet',
      symbol: bot.pair.symbol
    });

    const MAX_RETRIES = 3;
    let attempt = 1;
    
    while (attempt <= MAX_RETRIES) {
      try {
        // Get current price with logging
        const ticker = await exchange.fetchTicker(bot.pair.symbol);
        const currentPrice = ticker.bid;
        const baseOrderPrice = currentPrice * 0.999;

        logExchangeMessage('ATTEMPT', {
          number: attempt,
          currentPrice,
          desiredPrice: baseOrderPrice
        });

        // Try to place base order
        const baseOrder = await exchange.createOrder(
          bot.pair.symbol,
          'limit',
          'buy',
          baseOrderAmountInBTC,
          baseOrderPrice,
          {
            timeInForce: 'PO',
            postOnly: true
          }
        );
        
        // Log base order placement
        logExchangeMessage('BASE_ORDER_PLACED', {
          orderId: baseOrder.id,
          symbol: baseOrder.symbol,
          type: baseOrder.type,
          side: baseOrder.side,
          amount: baseOrder.amount,
          price: baseOrder.price
        });

        // Create base order record
        const dbBaseOrder = await tx.order.create({
          data: {
            id: `${deal.id}_base`,
            dealId: deal.id,
            type: OrderType.BASE,
            side: OrderSide.BUY,
            status: OrderStatus.PENDING,
            symbol: bot.pair.symbol,
            quantity: baseOrderAmountInBTC,
            price: baseOrderPrice,
            filled: 0,
            remaining: baseOrderAmountInBTC,
            cost: baseOrderAmountInBTC * baseOrderPrice,
            exchangeOrderId: baseOrder.id
          }
        });

        // Check order status with logging
        let orderStatus = await checkOrderStatus(exchange, baseOrder.id, bot.pair.symbol);
        logExchangeMessage('BASE_ORDER_STATUS', {
          orderId: baseOrder.id,
          status: orderStatus
        });
        
        if (orderStatus === 'failed') {
          if (attempt < MAX_RETRIES) {
            attempt++;
            // Wait before retrying (increasing delay with each attempt)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
          throw new Error('Max retries reached - could not place base order');
        }

        // Update deal and order status
        await tx.deal.update({
          where: { id: deal.id },
          data: { 
            status: DealStatus.ACTIVE,
            baseOrderId: dbBaseOrder.id
          }
        });

        // Place safety orders
        const safetyOrders = [];
        for (let i = 0; i < bot.maxSafetyOrders; i++) {
          const deviation = bot.priceDeviation * Math.pow(bot.safetyOrderPriceStep, i);
          const price = baseOrderPrice * (1 - deviation / 100);
          const sizeInUSDT = bot.safetyOrderSize * (i === 0 ? 1 : Math.pow(bot.safetyOrderVolumeStep, i));
          const sizeInBTC = sizeInUSDT / price;

          const safetyOrder = await exchange.createOrder(
            bot.pair.symbol,
            'limit',
            'buy',
            sizeInBTC,
            price,
            {
              timeInForce: 'GTC'
            }
          );
          
          const dbSafetyOrder = await tx.order.create({
            data: {
              id: `${deal.id}_safety_${i}`,
              dealId: deal.id,
              type: OrderType.SAFETY,
              side: OrderSide.BUY,
              status: OrderStatus.PENDING,
              symbol: bot.pair.symbol,
              quantity: sizeInBTC,
              price: price,
              filled: 0,
              remaining: sizeInBTC,
              cost: sizeInBTC * price,
              exchangeOrderId: safetyOrder.id
            }
          });
          safetyOrders.push(dbSafetyOrder);
        }

        // Place take profit order
        const takeProfitPrice = baseOrderPrice * (1 + bot.takeProfit / 100);
        const takeProfitOrder = await exchange.createOrder(
          bot.pair.symbol,
          'limit',
          'sell',
          baseOrderAmountInBTC,
          takeProfitPrice,
          {
            timeInForce: 'GTC'
          }
        );
        
        const dbTakeProfitOrder = await tx.order.create({
          data: {
            id: `${deal.id}_tp`,
            dealId: deal.id,
            type: OrderType.TAKE_PROFIT,
            side: OrderSide.SELL,
            status: OrderStatus.PENDING,
            symbol: bot.pair.symbol,
            quantity: baseOrderAmountInBTC,
            price: takeProfitPrice,
            filled: 0,
            remaining: baseOrderAmountInBTC,
            cost: baseOrderAmountInBTC * takeProfitPrice,
            exchangeOrderId: takeProfitOrder.id
          }
        });

        // Create initial history record
        await tx.dealHistory.create({
          data: {
            dealId: deal.id,
            type: HistoryType.DEAL_CREATED,
            newValue: {
              baseOrder: dbBaseOrder,
              safetyOrders,
              takeProfitOrder: dbTakeProfitOrder
            }
          }
        });

        return {
          success: true,
          attempt,
          deal,
          orders: {
            base: dbBaseOrder,
            safety: safetyOrders,
            takeProfit: dbTakeProfitOrder
          }
        };

      } catch (error) {
        if (attempt < MAX_RETRIES) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      attempt,
      deal: result.deal,
      orders: result.orders
    });

  } catch (error: any) {
    console.error('Failed to execute bot orders:', error);
    return NextResponse.json({
      success: false, 
      error: 'Failed to execute bot orders'
    });
  }
}

// Helper function to check order status
async function checkOrderStatus(exchange: ccxt.Exchange, orderId: string, symbol: string): Promise<'placed' | 'failed'> {
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    const orderCheck = await exchange.fetchOrder(orderId, symbol);
    
    if (orderCheck.status === 'open') {
      return 'placed';
    } else if (orderCheck.status === 'rejected' || orderCheck.status === 'canceled') {
      return 'failed';
    }

    retries++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return 'failed';
}