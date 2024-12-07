import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const exchanges = await prisma.exchangeKey.findMany({
      where: {
        user: {
          clerkId: userId
        }
      },
      select: {
        id: true,
        exchange: true,
        name: true,
        isTestnet: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: exchanges
    });

  } catch (error) {
    console.error('Failed to fetch exchanges:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch exchanges'
      },
      { status: 500 }
    );
  }
} 