import { PrismaClient } from '@prisma/client';
import { OrderType, OrderStatus } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

const prisma = new PrismaClient();

async function handleTradeUpdate(trade: any) {
  // ... other code ...

  // Check if this is a take profit fill
  if (order.type === OrderType.TAKE_PROFIT && order.status === OrderStatus.FILLED) {
    // Get the bot and check status before creating new deal
    const bot = await prisma.bot.findUnique({
      where: { id: deal.botId }
    });

    // Only create new deal if bot is active
    if (bot?.status === 'active') {
      // Create new deal logic here
    }
  }
} 