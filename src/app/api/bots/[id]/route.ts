import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  
  console.log('Routing via sec/app/api/bots/[id]/route.ts');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Bot ID is required' },
      { status: 400 }
    );
  }

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
      return NextResponse.json(
        { success: false, error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Verify the bot belongs to the user
    if (bot.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        pair: {
          symbol: bot.pair.symbol,
        },
        exchangeKey: {
          name: bot.exchangeKey.name,
        },
        baseOrderSize: bot.baseOrderSize,
        maxSafetyOrders: bot.maxSafetyOrders,
        priceDeviation: bot.priceDeviation,
        safetyOrderSize: bot.safetyOrderSize,
        safetyOrderPriceStep: bot.safetyOrderPriceStep,
        safetyOrderVolumeStep: bot.safetyOrderVolumeStep,
        takeProfit: bot.takeProfit,
        mode: bot.mode,
      }
    });

  } catch (error) {
    console.error('Failed to fetch bot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot details' },
      { status: 500 }
    );
  }
} 