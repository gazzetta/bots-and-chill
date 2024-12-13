import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const botId = id;
    if (!botId) {
      return NextResponse.json({ success: false, error: 'Bot ID is required' }, { status: 400 });
    }

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      include: {
        pair: true,
        exchangeKey: true,
      },
    });

    if (!bot) {
      return NextResponse.json({ success: false, error: 'Bot not found' }, { status: 404 });
    }

    console.log('Found bot:', bot);

    return NextResponse.json({
      success: true,
      bot: bot
    });

  } catch (error) {
    console.error('Failed to fetch bot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot details' },
      { status: 500 }
    );
  }
} 