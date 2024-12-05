import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.pair) {
      return NextResponse.json({ success: false, error: 'Trading pair is required' }, { status: 400 });
    }

    // Create bot in database
    const bot = await db.bot.create({
      data: {
        userId: user.id,
        pairId: data.pair.id,
        baseOrderSize: data.baseOrderSize,
        maxSafetyOrders: data.maxSafetyOrders,
        priceDeviation: data.priceDeviation,
        safetyOrderSize: data.safetyOrderSize,
        safetyOrderPriceStep: data.safetyOrderPriceStep,
        safetyOrderVolumeStep: data.safetyOrderVolumeStep,
        takeProfit: data.takeProfit,
        mode: data.mode,
        status: 'stopped', // Initial status
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