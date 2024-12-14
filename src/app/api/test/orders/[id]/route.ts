import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getExchange } from '@/lib/exchange/index';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get exchange key
    const exchangeKey = await prisma.exchangeKey.findFirst({
      where: { 
        userId: 'a6601702-4081-4a41-b443-0dd8a5a340d2',
        name: 'Binance Testnet',
        isTestnet: true
      }
    });

    if (!exchangeKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Binance testnet keys found'
      });
    }
const { id } = await params;
    const exchange = await getExchange(exchangeKey);
    const order = await exchange.fetchOrder(id, 'CRV/USDT');

    return NextResponse.json({ 
      success: true,
      order,
      message: 'Order fetched successfully'
    });

  } catch (error) {
    console.error('Fetch order failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    });
  }
} 