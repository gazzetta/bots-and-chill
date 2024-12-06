import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const exchange = searchParams.get('exchange');

  if (!query || !exchange) {
    return NextResponse.json(
      { success: false, error: 'Query and exchange parameters are required' },
      { status: 400 }
    );
  }

  try {
    // Clean and prepare search terms
    const searchTerm = query.toUpperCase();
    const [baseSearch, quoteSearch] = searchTerm.split('/');

    const pairs = await prisma.tradingPair.findMany({
      where: {
        AND: [
          { exchange: exchange },
          { isActive: true },
          {
            OR: [
              // Match full symbol
              { symbol: { contains: searchTerm } },
              // Match base asset
              { baseAsset: { contains: baseSearch } },
              // If there's a slash, also try to match quote asset
              ...(searchTerm.includes('/') 
                ? [{ 
                    AND: [
                      { baseAsset: { contains: baseSearch } },
                      { quoteAsset: { contains: quoteSearch || '' } }
                    ]
                  }]
                : []
              ),
              // If no slash, try matching quote asset independently
              ...(searchTerm.includes('/') ? [] : [
                { quoteAsset: { contains: searchTerm } }
              ])
            ],
          },
        ],
      },
      orderBy: [
        { baseAsset: 'asc' },
        { quoteAsset: 'asc' },
      ],
      take: 100, // Show more results
    });

    return NextResponse.json({ success: true, pairs });
  } catch (error) {
    console.error('Error searching pairs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to search trading pairs' 
    });
  }
} 