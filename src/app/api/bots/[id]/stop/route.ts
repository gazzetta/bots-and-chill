import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Bot ID is required' }, { status: 400 });
    }

    const bot = await prisma.bot.update({
      where: { id },
      data: { 
        status: 'STOPPED'
      }
    });

    return NextResponse.json({ 
      success: true,
      bot
    });

  } catch (error) {
    console.error('Failed to stop bot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
} 