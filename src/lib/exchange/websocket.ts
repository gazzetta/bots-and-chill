import WebSocket from 'ws';
import { prisma } from '@/lib/prisma';
import { logMessage, LogType } from '@/lib/logging';
import axios from 'axios';
import { OrderType, OrderStatus, DealStatus, OrderMethod } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { calculateTakeProfitPrice } from '@/lib/exchange/orders';
import * as ccxt from 'ccxt';
import { getExchange } from '.';
import fs from 'fs/promises';
import path from 'path';
import { placeBaseOrder } from '@/lib/orders/placeBaseOrder';


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


// WebSocket Logging Configuration
const WS_LOGGING_ENABLED = true; // Set to true/false to toggle logging

// Logging function that respects the toggle
const wsLog = (type: 'INFO' | 'ERROR' | 'DEBUG', message: string, data?: any) => {
  if (!WS_LOGGING_ENABLED) return;
  
  console.log(JSON.stringify({
    type,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, -5)
  }));
};



export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private listenKey: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private apiKey: string;
  private apiSecret: string;
  private isTestnet: boolean;

  constructor(
    apiKey: string, 
    apiSecret: string, 
    isTestnet = true
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
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
      wsLog('INFO', 'Attempting WebSocket connection', {
        testnet: this.isTestnet,
        url: this.wsUrl
      });

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
      wsLog('INFO', 'Obtained listen key', { 
        listenKey: this.listenKey 
      });

      // 2. Connect to WebSocket stream
      this.ws = new WebSocket(`${this.wsUrl}/ws/${this.listenKey}`);

      this.setupWebSocket();
      this.setupPing();
    } catch (error) {
      wsLog('ERROR', 'Failed to connect WebSocket', { error });
      throw error;
    }
  }

  private setupWebSocket() {
    if (!this.ws) return;

    this.ws.on('open', () => {
      wsLog('INFO', 'WebSocket connection opened');
    });

    this.ws.on('message', async (data: string) => {
      wsLog('INFO', 'Raw WebSocket message received', {
        data: JSON.parse(data)
      });

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
            wsLog('INFO', 'Unhandled WebSocket event', { event });
        }
      } catch (error) {
        wsLog('ERROR', 'WebSocket message handling error', { error, data });
      }
    });

    this.ws.on('error', (error) => {
      wsLog('ERROR', 'WebSocket error', { error });
    });

    this.ws.on('close', () => {
      wsLog('INFO', 'WebSocket closed, reconnecting...');
      this.reconnect();
    });
  }

  private async handleOrderUpdate(event: OrderUpdate) {
    // Log ALL incoming WebSocket events first
    wsLog('INFO', 'WebSocket Order Update', {
      executionType: event.x,
      orderStatus: event.X,
      orderType: event.o,
      symbol: event.s,
      side: event.S,
      quantity: event.q,
      price: event.p,
      lastPrice: event.L,
      orderId: event.i,
      clientOrderId: event.c,
      transactionTime: new Date(event.T).toISOString()
    });

    try {
      // Only process TRADE execution types (actual fills)
      if (event.x !== 'TRADE') {
        wsLog('INFO', `Skipping non-TRADE execution type: ${event.x}`);
        return;
      }

      // Skip processing (but we already logged) market orders
      if (event.o === 'MARKET') {
        wsLog('INFO', `Market order received (not processing): ${event.i}`);
        return;
      }

      const order = await prisma.$queryRaw`
        SELECT * FROM "Order" 
        WHERE "exchangeOrderId" = ${event.i.toString()}
        AND REGEXP_REPLACE("symbol", '[^A-Z0-9]', '') = ${event.s}
        LIMIT 1
      `;

      // Debug logging
      wsLog('INFO', 'Looking for order', {
        exchangeOrderId: event.i.toString(),
        binanceSymbol: event.s,
        searchPattern: event.s,  // Raw binance symbol
        dbSymbol: order?.symbol,
        normalizedDbSymbol: order?.symbol?.replace(/[^A-Z0-9]/g, ''),  // Show how DB symbol is normalized
        found: !!order
      });

      // Skip if order not found (might be a new order being created via CCXT)
      if (!order) {
        wsLog('INFO', `Order not found in DB: ${event.i}`);
        return;
      }

      const newStatus = this.mapOrderStatus(event.X);
      const filled = parseFloat(event.z);
      const price = parseFloat(event.L) || parseFloat(event.p);
      const remaining = parseFloat(event.q) - filled;

      // Log detailed order update
      wsLog('INFO', 'Processing order update', {
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
      wsLog('ERROR', 'Failed to handle order update', {
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
    wsLog('INFO', 'Base order filled', {
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
    wsLog('INFO', 'Safety order filled', {
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

    // Update deal with new average price
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

    // Cancel current TP and create new one at new price
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
      // Cancel old TP
      await this.exchange.cancelOrder(currentTP.exchangeOrderId, order.deal.bot.pair.symbol);
      
      // Calculate new TP price based on new average
      const newTPPrice = calculateTakeProfitPrice(averagePrice, order.deal.bot.takeProfit);
      
      // Place new TP order
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
          exchangeOrderId: newTPOrder.id,
          method: OrderMethod.LIMIT
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

    // If bot is still running, start a new deal
    if (order.deal.bot.status === 'RUNNING') {
      const { deal: newDeal } = await placeBaseOrder({
        bot: order.deal.bot,
        exchange: this.exchange,
        tx
      });
    }
  }

  private async handleAccountUpdate(event: AccountPosition) {
    wsLog('INFO', 'Account update received', {
      updateTime: new Date(event.E).toISOString()
    });
    // We don't need to store balances as CCXT is used for new deals
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
      wsLog('ERROR', 'Failed to reconnect WebSocket', { error });
    }
  }

  private setupPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

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
        wsLog('INFO', 'WebSocket ping successful');
      } catch (error) {
        wsLog('ERROR', 'WebSocket ping failed', { error });
      }
    }, 30000); // Every 30 seconds
  }
}