'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

export async function addExchangeKey(formData: {
  exchange: string;
  apiKey: string;
  apiSecret: string;
}) {
  try {
    const session = await auth();
    const clerkId = session?.userId;
    
    if (!clerkId) {
      throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { clerkId }
    });

    // Encrypt the API keys
    const encryptedApiKey = encrypt(formData.apiKey);
    const encryptedApiSecret = encrypt(formData.apiSecret);

    await prisma.exchangeKey.upsert({
      where: {
        userId_exchange_isTestnet: {
          userId: user.id,
          exchange: formData.exchange,
          isTestnet: formData.exchange.includes('testnet')
        }
      },
      update: {
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
      },
      create: {
        userId: user.id,
        exchange: formData.exchange,
        name: formData.exchange.includes('testnet') ? 'Binance Spot Testnet' : 'Binance Spot',
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isTestnet: formData.exchange.includes('testnet'),
      },
    });

    revalidatePath('/dashboard/exchanges');
    return { success: true };
  } catch (error) {
    console.error('Error saving exchange keys:', error);
    return { 
      success: false, 
      error: 'Failed to save API keys. Please try again.' 
    };
  }
} 