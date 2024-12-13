import * as ccxt from 'ccxt';
import { decrypt } from '@/lib/encryption';
import { ExchangeKey } from '@prisma/client';

export const getExchange = async (exchangeKey: ExchangeKey): Promise<ccxt.Exchange> => {
  const decryptedApiKey = await decrypt(exchangeKey.apiKey);
  const decryptedApiSecret = await decrypt(exchangeKey.apiSecret);

  // Clean exchange name - remove _testnet suffix
  const exchangeName = exchangeKey.exchange.toLowerCase().replace('_testnet', '');
  if (!(exchangeName in ccxt)) {
    throw new Error(`Unsupported exchange: ${exchangeKey.exchange}`);
  }

  // Create exchange instance
  const exchange = new (ccxt as any)[exchangeName]({
    apiKey: decryptedApiKey,
    secret: decryptedApiSecret,
    enableRateLimit: true,
    options: {
      defaultType: 'spot'
    }
  });

  if (exchangeKey.isTestnet) {
    exchange.setSandboxMode(true);
  }
  return exchange;
}; 