import WebSocket from 'ws';
import { prisma } from '@/lib/prisma';
import { logMessage, LogType } from '@/lib/logging';
import axios from 'axios';
import { OrderType, OrderStatus, DealStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { calculateTakeProfitPrice } from '@/lib/exchange/orders';
import ccxt from 'ccxt';

interface OrderUpdate {
  e: 'executionReport';        // Event type
  s: string;                   // Symbol
  c: string;                   // Client order ID
  S: 'BUY' | 'SELL';          // Side
  o: string;                   // Order type
  f: string;                   // Time in force
  q: string;                   // Original quantity
  p: string;                   // Original price
  P: string;                   // Stop price
  F: string;                   // Iceberg quantity
  g: number;                   // OrderListId
  C: string;                   // Original client order ID
  x: string;                   // Current execution type
  X: string;                   // Current order status
  r: string;                   // Order reject reason
  i: number;                   // Order ID
  l: string;                   // Last executed quantity
  z: string;                   // Cumulative filled quantity
  L: string;                   // Last executed price
  n: string;                   // Commission amount
  N: string | null;            // Commission asset
  T: number;                   // Transaction time
  t: number;                   // Trade ID
  w: boolean;                  // Is working
  m: boolean;                  // Is maker trade
  M: boolean;                  // Ignore
  O: number;                   // Order creation time
  Z: string;                   // Cumulative quote asset transacted quantity
  Y: string;                   // Last quote asset transacted quantity
}

interface AccountPosition {
  e: 'outboundAccountPosition';  // Event type
  E: number;                     // Event time
  u: number;                     // Last update time
  B: Array<{                     // Balances Array
    a: string;                   // Asset
    f: string;                   // Free amount
    l: string;                   // Locked amount
  }>;
}

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private apiKey: string;
  private apiSecret: string;
  private isTestnet: boolean;
  private exchange: ccxt.Exchange;

  constructor(
    apiKey: string, 
    apiSecret: string, 
    exchange: ccxt.Exchange,
    isTestnet = true
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.exchange = exchange;
    this.isTestnet = isTestnet;
  }

  private get baseUrl() {
    return this.isTestnet 
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  private get wsUrl() {
    return this.isTestnet
      ? 'wss://testnet.binance.vision'
      : 'wss://stream.binance.com:9443';
  }

  async connect() {
    try {
      // 1. Get listen key from Binance
      const response = await axios.post(
        `${this.baseUrl}/api/v3/userDataStream`,
        null,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey
          }
        }
      );

      this.listenKey = response.data.listenKey;

      // 2. Connect to WebSocket stream
      this.ws = new WebSocket(`${this.wsUrl}/ws/${this.listenKey}`);

      this.setupWebSocket();
      this.setupPing();

      logMessage(LogType.INFO, 'WebSocket connected', {
        testnet: this.isTestnet
      });
    } catch (error) {
      logMessage(LogType.ERROR, 'Failed to connect WebSocket', { error });
      throw error;
    }
  }

  private setupWebSocket() {
    if (!this.ws) return;

    this.ws.on('message', async (data: string) => {
      try {
        const event = JSON.parse(data);
        
        // Handle different event types
        switch (event.e) {
          case 'executionReport':
            await this.handleOrderUpdate(event);
            break;
          case 'outboundAccountPosition':
            await this.handleAccountUpdate(event);
            break;
          default:
            logMessage(LogType.INFO, 'Unhandled WebSocket event', { event });
        }
      } catch (error) {
        logMessage(LogType.ERROR, 'WebSocket message handling error', { error, data });
      }
    });

    this.ws.on('error', (error) => {
      logMessage(LogType.ERROR, 'WebSocket error', { error });
    });

    this.ws.on('close', () => {
      logMessage(LogType.INFO, 'WebSocket closed, reconnecting...');
      this.reconnect();
    });
  }

  private async handleOrderUpdate(event: OrderUpdate) {
    try {
      // Find order in our database
      const order = await prisma.order.findFirst({
        where: { 
          exchangeOrderId: event.i.toString(),
          symbol: event.s
        },
        include: {
          deal: {
            include: {
              bot: true
            }
          }
        }
      });

      if (!order) {
        logMessage(LogType.INFO, 'Received update for unknown order', {
          exchangeOrderId: event.i,
          symbol: event.s,
          status: event.X
        });
        return;
      }

      const newStatus = this.mapOrderStatus(event.X);
      const filled = parseFloat(event.z);
      const price = parseFloat(event.L) || parseFloat(event.p);
      const remaining = parseFloat(event.q) - filled;

      // Log detailed order update
      logMessage(LogType.ORDER_STATUS, 'Processing order update', {
        orderId: order.id,
        exchangeOrderId: event.i,
        oldStatus: order.status,
        newStatus,
        filled,
        remaining,
        price,
        type: order.type,
        side: event.S,
        executionType: event.x
      });

      // Update order in database
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: newStatus,
            filled,
            remaining,
            lastPrice: price,
            updatedAt: new Date(event.T)
          }
        });

        // If order is filled, update deal and handle next steps
        if (newStatus === 'FILLED') {
          switch (order.type) {
            case 'BASE':
              await this.handleBaseOrderFilled(tx, order, event);
              break;
            case 'SAFETY':
              await this.handleSafetyOrderFilled(tx, order, event);
              break;
            case 'TAKE_PROFIT':
              await this.handleTakeProfitFilled(tx, order, event);
              break;
          }
        }
      });

    } catch (error) {
      logMessage(LogType.ERROR, 'Failed to handle order update', {
        error,
        event
      });
    }
  }

  private mapOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'NEW': return 'PLACED';
      case 'PARTIALLY_FILLED': return 'PARTIALLY_FILLED';
      case 'FILLED': return 'FILLED';
      case 'CANCELED': return 'CANCELLED';
      case 'REJECTED': return 'FAILED';
      case 'EXPIRED': return 'CANCELLED';
      default: return 'PLACED';
    }
  }

  private async handleBaseOrderFilled(
    tx: PrismaClient,
    order: any,
    event: OrderUpdate
  ) {
    logMessage(LogType.INFO, 'Base order filled', {
      dealId: order.deal.id,
      orderId: order.id,
      price: event.L,
      quantity: event.z
    });

    // Update deal with base order details
    await tx.deal.update({
      where: { id: order.deal.id },
      data: {
        status: DealStatus.ACTIVE,
        currentQuantity: parseFloat(event.z),
        averagePrice: parseFloat(event.L),
        totalCost: parseFloat(event.z) * parseFloat(event.L)
      }
    });

    // Log deal history
    await tx.dealHistory.create({
      data: {
        dealId: order.deal.id,
        type: 'BASE_ORDER_FILLED',
        newValue: {
          price: parseFloat(event.L),
          quantity: parseFloat(event.z),
          cost: parseFloat(event.z) * parseFloat(event.L)
        }
      }
    });
  }

  private async handleSafetyOrderFilled(
    tx: PrismaClient,
    order: any,
    event: OrderUpdate
  ) {
    logMessage(LogType.INFO, 'Safety order filled', {
      dealId: order.deal.id,
      orderId: order.id,
      price: event.L,
      quantity: event.z
    });

    // Get all filled orders for this deal
    const filledOrders = await tx.order.findMany({
      where: {
        dealId: order.deal.id,
        status: 'FILLED',
        type: {
          in: [OrderType.BASE, OrderType.SAFETY]
        }
      }
    });

    // Calculate new average price and total quantity
    const totalQuantity = filledOrders.reduce((sum, o) => sum + o.filled, 0) + parseFloat(event.z);
    const totalCost = filledOrders.reduce((sum, o) => sum + (o.filled * o.price), 0) + 
                     (parseFloat(event.z) * parseFloat(event.L));
    const averagePrice = totalCost / totalQuantity;

    // Update deal
    await tx.deal.update({
      where: { id: order.deal.id },
      data: {
        currentQuantity: totalQuantity,
        averagePrice: averagePrice,
        totalCost: totalCost,
        actualSafetyOrders: {
          increment: 1
        }
      }
    });

    // Cancel current TP using CCXT
    const currentTP = await tx.order.findFirst({
      where: {
        dealId: order.deal.id,
        type: OrderType.TAKE_PROFIT,
        status: {
          in: ['PLACED', 'PARTIALLY_FILLED']
        }
      }
    });

    if (currentTP) {
      await this.exchange.cancelOrder(
        currentTP.exchangeOrderId, 
        order.deal.bot.pair.symbol
      );
      
      await tx.order.update({
        where: { id: currentTP.id },
        data: { status: 'CANCELLED' }
      });

      // Place new TP using CCXT
      const newTPPrice = calculateTakeProfitPrice(averagePrice, order.deal.bot.takeProfit);
      const newTPOrder = await this.exchange.createOrder(
        order.deal.bot.pair.symbol,
        'limit',
        'sell',
        totalQuantity,
        newTPPrice,
        { timeInForce: 'GTC' }
      );

      // Save new TP to database
      await tx.order.create({
        data: {
          dealId: order.deal.id,
          type: OrderType.TAKE_PROFIT,
          side: 'SELL',
          status: 'PLACED',
          symbol: order.deal.bot.pair.symbol,
          quantity: totalQuantity,
          price: newTPPrice,
          filled: 0,
          remaining: totalQuantity,
          exchangeOrderId: newTPOrder.id
        }
      });
    }

    // Log deal history
    await tx.dealHistory.create({
      data: {
        dealId: order.deal.id,
        type: 'SAFETY_ORDER_FILLED',
        newValue: {
          price: parseFloat(event.L),
          quantity: parseFloat(event.z),
          newAveragePrice: averagePrice,
          totalQuantity,
          safetyOrderNumber: order.deal.actualSafetyOrders + 1
        }
      }
    });
  }

  private async handleTakeProfitFilled(
    tx: PrismaClient,
    order: any,
    event: OrderUpdate
  ) {
    logMessage(LogType.INFO, 'Take profit order filled', {
      dealId: order.deal.id,
      orderId: order.id,
      price: event.L,
      quantity: event.z
    });

    // Calculate final profit
    const profit = (parseFloat(event.L) * parseFloat(event.z)) - order.deal.totalCost;
    const profitPercent = (profit / order.deal.totalCost) * 100;

    // Close the deal
    await tx.deal.update({
      where: { id: order.deal.id },
      data: {
        status: DealStatus.COMPLETED,
        currentProfit: profit,
        profitPercent: profitPercent,
        completedAt: new Date(event.T)
      }
    });

    // Log deal history
    await tx.dealHistory.create({
      data: {
        dealId: order.deal.id,
        type: 'DEAL_COMPLETED',
        newValue: {
          finalPrice: parseFloat(event.L),
          quantity: parseFloat(event.z),
          profit,
          profitPercent,
          totalCost: order.deal.totalCost,
          safetyOrdersUsed: order.deal.actualSafetyOrders
        }
      }
    });

    // If bot is set to auto-restart, start a new deal
    if (order.deal.bot.autoRestart) {
      try {
        logMessage(LogType.INFO, 'Starting new deal after TP', {
          botId: order.deal.bot.id,
          previousDealId: order.deal.id
        });

        // Create new deal
        const newDeal = await tx.deal.create({
          data: {
            botId: order.deal.bot.id,
            status: DealStatus.PENDING,
            currentQuantity: 0,
            averagePrice: 0,
            totalCost: 0,
            currentProfit: 0,
            actualSafetyOrders: 0
          }
        });

        // Get current market price
        const ticker = await this.exchange.fetchTicker(order.deal.bot.pair.symbol);
        const currentPrice = ticker.bid;
        const baseOrderPrice = currentPrice * 0.999; // 0.1% below market
        const baseOrderAmount = order.deal.bot.baseOrderSize / baseOrderPrice;

        // Place new base order
        const baseOrder = await this.exchange.createOrder(
          order.deal.bot.pair.symbol,
          'limit',
          'buy',
          baseOrderAmount,
          baseOrderPrice,
          { timeInForce: 'GTC' }
        );

        // Save base order to DB
        await tx.order.create({
          data: {
            dealId: newDeal.id,
            type: OrderType.BASE,
            side: 'BUY',
            status: 'PLACED',
            symbol: order.deal.bot.pair.symbol,
            quantity: baseOrderAmount,
            price: baseOrderPrice,
            filled: 0,
            remaining: baseOrderAmount,
            exchangeOrderId: baseOrder.id
          }
        });

        logMessage(LogType.INFO, 'New deal started', {
          newDealId: newDeal.id,
          baseOrderId: baseOrder.id
        });

      } catch (error) {
        logMessage(LogType.ERROR, 'Failed to start new deal after TP', {
          botId: order.deal.bot.id,
          error
        });
      }
    }
  }

  private async handleAccountUpdate(event: AccountPosition) {
    try {
      logMessage(LogType.INFO, 'Account update received', {
        updateTime: new Date(event.u).toISOString()
      });

      // Get all active deals to update their balances
      const activeDeals = await prisma.deal.findMany({
        where: {
          status: {
            in: [DealStatus.ACTIVE, DealStatus.PENDING]
          }
        },
        include: {
          bot: {
            include: {
              pair: true
            }
          }
        }
      });

      // Update balances for each deal's assets
      for (const deal of activeDeals) {
        const baseAsset = deal.bot.pair.baseAsset;  // e.g., 'BTC'
        const quoteAsset = deal.bot.pair.quoteAsset; // e.g., 'USDT'

        const baseBalance = event.B.find(b => b.a === baseAsset);
        const quoteBalance = event.B.find(b => b.a === quoteAsset);

        if (baseBalance || quoteBalance) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: {
              baseAssetFree: baseBalance ? parseFloat(baseBalance.f) : undefined,
              baseAssetLocked: baseBalance ? parseFloat(baseBalance.l) : undefined,
              quoteAssetFree: quoteBalance ? parseFloat(quoteBalance.f) : undefined,
              quoteAssetLocked: quoteBalance ? parseFloat(quoteBalance.l) : undefined,
              lastBalanceUpdate: new Date(event.u)
            }
          });

          // Log significant balance changes
          if (baseBalance) {
            logMessage(LogType.INFO, 'Base asset balance updated', {
              dealId: deal.id,
              asset: baseAsset,
              free: baseBalance.f,
              locked: baseBalance.l
            });
          }

          if (quoteBalance) {
            logMessage(LogType.INFO, 'Quote asset balance updated', {
              dealId: deal.id,
              asset: quoteAsset,
              free: quoteBalance.f,
              locked: quoteBalance.l
            });
          }
        }
      }

      // Check for insufficient balance conditions
      await this.checkInsufficientBalance(event.B);

    } catch (error) {
      logMessage(LogType.ERROR, 'Failed to handle account update', {
        error,
        event
      });
    }
  }

  private async checkInsufficientBalance(balances: AccountPosition['B']) {
    try {
      // Get all pending orders that need funds
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: 'PLACED',
          type: {
            in: [OrderType.BASE, OrderType.SAFETY]
          }
        },
        include: {
          deal: {
            include: {
              bot: {
                include: {
                  pair: true
                }
              }
            }
          }
        }
      });

      for (const order of pendingOrders) {
        const quoteAsset = order.deal.bot.pair.quoteAsset;
        const quoteBalance = balances.find(b => b.a === quoteAsset);
        
        if (quoteBalance) {
          const availableFunds = parseFloat(quoteBalance.f);
          const requiredFunds = order.price * order.quantity;

          if (availableFunds < requiredFunds) {
            logMessage(LogType.ERROR, 'Insufficient funds for order', {
              dealId: order.deal.id,
              orderId: order.id,
              required: requiredFunds,
              available: availableFunds,
              asset: quoteAsset
            });

            // Cancel the order
            await this.exchange.cancelOrder(order.exchangeOrderId, order.symbol);
            
            // Update order status
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                statusReason: 'INSUFFICIENT_FUNDS'
              }
            });
          }
        }
      }
    } catch (error) {
      logMessage(LogType.ERROR, 'Failed to check insufficient balance', {
        error
      });
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async reconnect() {
    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      logMessage(LogType.ERROR, 'Failed to reconnect WebSocket', { error });
    }
  }

  private setupPing() {
    // Keep-alive ping every 30 minutes
    this.pingInterval = setInterval(async () => {
      try {
        await axios.put(
          `${this.baseUrl}/api/v3/userDataStream`,
          null,
          {
            headers: {
              'X-MBX-APIKEY': this.apiKey
            },
            params: {
              listenKey: this.listenKey
            }
          }
        );
      } catch (error) {
        logMessage(LogType.ERROR, 'Failed to ping WebSocket', { error });
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
}