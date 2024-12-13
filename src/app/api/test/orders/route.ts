import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getExchange } from '@/lib/exchange/index';
//import { logMessage, LogType } from '@/lib/logging';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();

    // Get Binance testnet keys for the logged-in user
    const exchangeKey = await prisma.exchangeKey.findFirst({
      where: { 
        userId: 'a6601702-4081-4a41-b443-0dd8a5a340d2',
        name: 'Binance Testnet',  // Specifically get Binance
        isTestnet: true     // Make sure we get testnet keys
      }
    });

    if (!exchangeKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Binance testnet keys found. Please add testnet API keys in the Exchanges page.' 
      });
    }

    const exchange = await getExchange(exchangeKey);
    const symbol = 'BTC/USDT';
    const amount = 0.001;  // Small test amount
    let order;

    switch (type) {
      case 'MARKET':
        order = await exchange.createMarketBuyOrder(symbol, amount);
        break;
      case 'LIMIT_PO':
        const poPrice = (await exchange.fetchTicker(symbol)).bid * 0.99; // 1% below market
        order = await exchange.createLimitBuyOrder(symbol, amount, poPrice, { 
          timeInForce: 'PO' 
        });
        break;
      case 'LIMIT_GTC':
        const gtcPrice = (await exchange.fetchTicker(symbol)).bid * 0.99;
        order = await exchange.createLimitBuyOrder(symbol, amount, gtcPrice, { 
          timeInForce: 'GTC' 
        });
        break;
    }

    return NextResponse.json({ 
      success: true, 
      order,
      message: `${type} order placed successfully` 
    });

  } catch (error) {
    console.error('Test order failed:', error);
    return NextResponse.json({ success: false, error: String(error) });
  }
} 