import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        bot: {
          include: {
            pair: true,
          }
        },
        orders: {
          orderBy: {
            createdAt: 'asc'
          },
          select: {
            id: true,
            type: true,
            status: true,
            quantity: true,  // This is the amount
            price: true,
            filled: true,
            filledAt: true,
            createdAt: true
          }
        }
      }
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Verify the deal belongs to the user
    if (deal.bot.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Transform orders data
    const baseOrder = deal.orders.find(o => o.type === 'BASE');
    const safetyOrders = deal.orders.filter(o => o.type === 'SAFETY').map(o => ({
      id: o.id,
      amount: o.quantity,
      price: o.price,
      status: o.status,
      filledAt: o.filledAt
    }));
    const takeProfit = deal.orders.find(o => o.type === 'TAKE_PROFIT');

    return NextResponse.json({
      success: true,
      deal: {
        ...deal,
        baseOrder: baseOrder ? {
          amount: baseOrder.quantity,
          price: baseOrder.price,
          filledAt: baseOrder.filledAt
        } : undefined,
        safetyOrders,
        takeProfit: takeProfit ? {
          price: takeProfit.price,
          status: takeProfit.status
        } : undefined,
        currentQuantity: deal.currentQuantity,
        averagePrice: deal.averagePrice,
        totalCost: deal.totalCost,
        currentProfit: deal.currentProfit
      }
    });

  } catch (error) {
    console.error('Failed to fetch deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deal details' },
      { status: 500 }
    );
  }
} 