import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import * as ccxt from 'ccxt';

export async function GET() {
  try {
    const session = await auth();
    const clerkId = session?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { clerkId },
      include: {
        apiKeys: {
          where: {
            exchange: 'binance_testnet'
          }
        }
      }
    });

    if (!user.apiKeys.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Binance testnet API keys found' 
      });
    }

    const exchangeKey = user.apiKeys[0];

    // Decrypt the API keys
    const apiKey = decrypt(exchangeKey.apiKey);
    const apiSecret = decrypt(exchangeKey.apiSecret);

    const exchange = new ccxt.binance({
      apiKey: apiKey,
      secret: apiSecret,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true,
        recvWindow: 60000,
      },
      enableRateLimit: true,
    });

    exchange.setSandboxMode(true);
    const balance = await exchange.fetchBalance();

    return NextResponse.json({
      success: true,
      balance
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch balance' 
    });
  }
} 