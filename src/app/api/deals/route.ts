import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deals = await prisma.deal.findMany({
      where: {
        bot: {
          userId: userId,
        },
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        bot: {
          include: {
            pair: true,
          }
        },
        orders: {
          where: {
            OR: [
              { type: 'SAFETY' },  // Get all safety orders to count filled ones
              { type: 'TAKE_PROFIT' }
            ]
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    // Transform the data to match our frontend structure
    const transformedDeals = deals.map(deal => ({
      id: deal.id,
      bot: {
        name: deal.bot.name,
        pair: {
          symbol: deal.bot.pair.symbol
        },
        maxSafetyOrders: deal.bot.maxSafetyOrders
      },
      status: deal.status,
      actualSafetyOrders: deal.actualSafetyOrders,
      averagePrice: deal.averagePrice,
      startedAt: deal.startedAt,
      baseOrder: deal.orders.find(o => o.type === 'BASE'),
      nextSafetyOrder: deal.orders.find(o => o.type === 'SAFETY' && o.status === 'PLACED'),
      takeProfit: deal.orders.find(o => o.type === 'TAKE_PROFIT')
    }));

    return NextResponse.json({
      success: true,
      deals: transformedDeals
    });

  } catch (error) {
    console.error('Failed to fetch deals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
} 