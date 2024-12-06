import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.pair) {
      return NextResponse.json({ success: false, error: 'Trading pair is required' }, { status: 400 });
    }

    if (!data.exchangeKey) {
      return NextResponse.json({ success: false, error: 'Exchange key is required' }, { status: 400 });
    }

    // Create bot in database
    const bot = await prisma.bot.create({
      data: {
        userId,
        name: data.name,
        pairId: data.pair.id,
        exchangeKeyId: data.exchangeKey.id,
        baseOrderSize: data.baseOrderSize,
        maxSafetyOrders: data.maxSafetyOrders,
        priceDeviation: data.priceDeviation,
        safetyOrderSize: data.safetyOrderSize,
        safetyOrderPriceStep: data.safetyOrderPriceStep,
        safetyOrderVolumeStep: data.safetyOrderVolumeStep,
        takeProfit: data.takeProfit,
        mode: data.mode,
        status: 'stopped',
      },
      include: {
        pair: true,
        exchangeKey: true,
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error('Failed to create bot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bot' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bots = await prisma.bot.findMany({
      where: {
        userId,
      },
      include: {
        pair: true,
        exchangeKey: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, bots });
  } catch (error) {
    console.error('Failed to fetch bots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bots' },
      { status: 500 }
    );
  }
} 