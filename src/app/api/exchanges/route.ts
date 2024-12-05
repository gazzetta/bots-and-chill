import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    const clerkId = session?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { clerkId },
      include: {
        apiKeys: true,
      },
    });

    return NextResponse.json({
      success: true,
      exchanges: user.apiKeys,
    });

  } catch (error) {
    console.error('Error fetching exchanges:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exchanges' },
      { status: 500 }
    );
  }
} 