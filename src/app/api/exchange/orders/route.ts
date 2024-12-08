import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import ccxt from 'ccxt';
import { decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
  console.log('\n=== FETCHING EXCHANGE ORDERS ===');
  try {
    console.log('1. Checking auth...');
    const { userId } = await auth();
    if (!userId) {
      console.log('No userId found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Auth OK, userId:', userId);

    console.log('2. Getting exchange key...');
    const exchangeKey = await prisma.exchangeKey.findFirst({
      where: { 
        user: {
          clerkId: userId
        },
        exchange: 'binance_testnet',
        isTestnet: true
      },
      include: {
        user: true
      }
    });

    if (!exchangeKey) {
      console.log('No testnet exchange key found');
      return NextResponse.json({ success: false, error: 'No testnet exchange keys found' });
    }
    console.log('Found testnet exchange key:', exchangeKey.id);

    console.log('3. Initializing exchange...');
    const exchange = new ccxt.binance({
      apiKey: decrypt(exchangeKey.apiKey),
      secret: decrypt(exchangeKey.apiSecret),
      enableRateLimit: true,
    });

    exchange.setSandboxMode(true);
    console.log('Exchange initialized');

    const symbol = 'BTC/USDT';
    console.log('\n4. Fetching all possible order/trade info for', symbol);

    const results: Record<string, any> = {};
    
    console.log('\n4.1 Trying fetchOpenOrders...');
    try {
      results.openOrders = await exchange.fetchOpenOrders(symbol);
      console.log('Open orders:', JSON.stringify(results.openOrders, null, 2));
    } catch (error) {
      const e = error as Error;
      console.log('Error fetching open orders:', e.message);
    }

    console.log('\n4.2 Trying fetchClosedOrders...');
    try {
      results.closedOrders = await exchange.fetchClosedOrders(symbol);
      console.log('Closed orders:', JSON.stringify(results.closedOrders, null, 2));
    } catch (error) {
      const e = error as Error;
      console.log('Error fetching closed orders:', e.message);
    }

    console.log('\n4.3 Trying fetchOrders...');
    try {
      results.allOrders = await exchange.fetchOrders(symbol);
      console.log('All orders:', JSON.stringify(results.allOrders, null, 2));
    } catch (error) {
      const e = error as Error;
      console.log('Error fetching all orders:', e.message);
    }

    console.log('\n4.4 Trying fetchMyTrades...');
    try {
      results.myTrades = await exchange.fetchMyTrades(symbol);
      console.log('My trades:', JSON.stringify(results.myTrades, null, 2));
    } catch (error) {
      const e = error as Error;
      console.log('Error fetching trades:', e.message);
    }

    // Check our database for order IDs
    console.log('\n5. Checking database for saved orders...');
    const savedOrders = await prisma.deal.findMany({
      where: {
        bot: {
          userId: {
            equals: exchangeKey.userId
          },
          status: 'active'
        }
      },
      include: {
        orders: {
          select: {
            exchangeOrderId: true,
            type: true,
            side: true,
            status: true,
            createdAt: true
          }
        }
      }
    });
    
    interface DealOrder {
      exchangeOrderId: string;
      type: string;
      side: string;
      status: string;
      createdAt: Date;
    }

    interface DealWithOrders {
      orders: DealOrder[];
    }

    const flattenedOrders = savedOrders.flatMap((deal: DealWithOrders) => deal.orders);
    console.log('Saved orders in DB:', flattenedOrders);

    if (flattenedOrders.length > 0) {
      console.log('\n6. Fetching specific orders...');
      for (const order of flattenedOrders) {
        try {
          const orderDetails = await exchange.fetchOrder(order.exchangeOrderId);
          console.log(`Order ${order.exchangeOrderId} details:`, JSON.stringify(orderDetails, null, 2));
          results.specificOrders = results.specificOrders || {};
          results.specificOrders[order.exchangeOrderId] = orderDetails;
        } catch (error) {
          const e = error as Error;
          console.log(`Error fetching order ${order.exchangeOrderId}:`, e.message);
        }
      }
    }

    console.log('\n7. Returning results...');
    return NextResponse.json({
      success: true,
      data: {
        openOrders: results.openOrders || [],
        closedOrders: results.closedOrders || [],
        allOrders: results.allOrders || [],
        trades: results.myTrades || [],
        rawResponse: {
          openOrders: results.openOrders,
          closedOrders: results.closedOrders,
          allOrders: results.allOrders,
          myTrades: results.myTrades
        }
      }
    });

  } catch (error) {
    // Fix error handling
    let errorMessage = 'Failed to fetch orders';
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    }

    console.error('\nFailed to fetch orders:', errorMessage);
    if (errorDetails) {
      console.error('Stack trace:', errorDetails);
    }

    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    });
  }
} 