'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

interface ExchangeKeyInput {
  exchange: string;
  apiKey: string;
  apiSecret: string;
}

export async function addExchangeKey(input: ExchangeKeyInput) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized'
      };
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Encrypt sensitive data
    const encryptedApiKey = encrypt(input.apiKey);
    const encryptedApiSecret = encrypt(input.apiSecret);

    // Create exchange key
    const exchangeKey = await prisma.exchangeKey.create({
      data: {
        userId: user.id,
        exchange: input.exchange,
        name: input.exchange === 'binance_testnet' ? 'Binance Testnet' : 'Binance',
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isTestnet: input.exchange === 'binance_testnet'
      }
    });

    // Always return an object
    return {
      success: true,
      data: {
        id: exchangeKey.id,
        exchange: exchangeKey.exchange,
        name: exchangeKey.name,
        isTestnet: exchangeKey.isTestnet
      }
    };

  } catch (error) {
    console.error('Failed to add exchange key:', error);
    
    // Always return an object, even in error case
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add exchange key'
    };
  }
} 