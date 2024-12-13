import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { exchange, pair, botId } = await request.json();

    const runningBot = await prisma.bot.findFirst({
      where: {
        userId,
        exchangeKey: {
          name: exchange
        },
        pair: {
          symbol: pair
        },
        status: 'RUNNING',
        id: {
          not: botId // exclude current bot
        }
      }
    });

    return NextResponse.json({
      success: true,
      hasRunningBot: !!runningBot
    });

  } catch (error) {
    console.error('Failed to check running bots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check running bots' },
      { status: 500 }
    );
  }
} 