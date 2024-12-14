import { NextResponse } from 'next/server';
import { getExchange } from '@/lib/exchange';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('=== FETCHING EXCHANGE ORDERS ===');
    
    // 1. Check auth
    console.log('1. Checking auth...');
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }
    console.log(`Auth OK, userId: ${userId}`);

    // 2. Get exchange key
    console.log('2. Getting exchange key...');

    // First get the User.id from clerkId
    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId
      },
      select: {
        id: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Then get the exchange key using the User.id
    const exchangeKey = await prisma.exchangeKey.findFirst({
      where: {
        userId: user.id,
        exchange: 'binance_testnet',
        isTestnet: true
      }
    });

    if (!exchangeKey) {
      throw new Error('No exchange key found');
    }
    console.log(`Found testnet exchange key: ${exchangeKey.id}`);

    // 3. Initialize exchange
    console.log('3. Initializing exchange...');
    const exchange = await getExchange(exchangeKey);
    if (!exchange) {
      throw new Error('Failed to initialize exchange');
    }

    // Acknowledge the warning about fetching without symbol
    exchange.options["warnOnFetchOpenOrdersWithoutSymbol"] = false;

    // Define trading pairs we're interested in
    const symbols = ['BTC/USDT'];
    console.log('Exchange initialized\n');

    console.log('4. Fetching orders for symbols:', symbols);

    // Fetch orders for each symbol and combine results
    const [openOrders, closedOrders, allOrders, trades] = await Promise.all([
      Promise.all(symbols.map(symbol => exchange.fetchOpenOrders(symbol)))
        .then(results => results.flat()),
      Promise.all(symbols.map(symbol => exchange.fetchClosedOrders(symbol)))
        .then(results => results.flat()),
      Promise.all(symbols.map(symbol => exchange.fetchOrders(symbol)))
        .then(results => results.flat()),
      Promise.all(symbols.map(symbol => exchange.fetchMyTrades(symbol)))
        .then(results => results.flat())
    ]);

    console.log('4.1 Trying fetchOpenOrders...');
    console.log(`Open orders found: ${openOrders.length}`);

    console.log('4.2 Trying fetchClosedOrders...');
    console.log(`Closed orders found: ${closedOrders.length}`);

    console.log('4.3 Trying fetchOrders...');
    console.log(`All orders found: ${allOrders.length}`);

    console.log('4.4 Trying fetchMyTrades...');
    console.log(`Trades found: ${trades.length}`);

    // Log the full response before sending
    console.log('5. Full response data:', {
      openOrdersCount: openOrders.length,
      closedOrdersCount: closedOrders.length,
      allOrdersCount: allOrders.length,
      tradesCount: trades.length
    });

    return NextResponse.json({
      success: true,
      data: {
        openOrders,
        closedOrders,
        allOrders,
        trades,
        rawResponse: {
          openOrders,
          closedOrders,
          allOrders,
          trades
        }
      }
    });

  } catch (error) {
    console.error('Failed to fetch orders:', error);
    console.error('Error details:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 