import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const clerkId = session?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' });
    }

    const searchQuery = request.nextUrl.searchParams.get('q');
    
    if (!searchQuery || searchQuery.length < 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'Search query must be at least 3 characters' 
      });
    }

    const pairs = await prisma.tradingPair.findMany({
      where: {
        AND: [
          { exchange: 'binance_testnet' },
          { isActive: true },
          {
            OR: [
              { symbol: { contains: searchQuery.toUpperCase() } },
              { baseAsset: { contains: searchQuery.toUpperCase() } },
              { quoteAsset: { contains: searchQuery.toUpperCase() } },
            ]
          }
        ]
      },
      orderBy: { symbol: 'asc' },
    });

    return NextResponse.json({
      success: true,
      pairs
    });

  } catch (error) {
    console.error('Error searching pairs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to search trading pairs' 
    });
  }
} 