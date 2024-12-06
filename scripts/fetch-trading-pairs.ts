const { PrismaClient } = require('@prisma/client');
const ccxt = require('ccxt');

const DEV_MODE = false; // Set this to true to clear the table before importing

const prisma = new PrismaClient();

interface TradingPairData {
  exchange: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  minQuantity: number;
  maxQuantity: number;
  stepSize: number;
  minNotional: number;
  isSpot: boolean;
  isActive: boolean;
}

interface CCXTMarket {
  symbol: string;
  base: string;
  quote: string;
  limits?: {
    amount?: {
      min?: number;
      max?: number;
    };
    cost?: {
      min?: number;
    };
  };
  precision?: {
    amount?: number;
  };
}

function isCCXTMarket(market: unknown): market is CCXTMarket {
  if (!market || typeof market !== 'object') return false;
  const m = market as Record<string, unknown>;
  return (
    typeof m.symbol === 'string' &&
    typeof m.base === 'string' &&
    typeof m.quote === 'string'
  );
}

async function fetchTradingPairs() {
  try {
    console.log('Fetching Binance testnet trading pairs...');
    
    if (DEV_MODE) {
      console.log('DEV MODE: Clearing existing data...');
      // First delete bots that reference trading pairs
      await prisma.bot.deleteMany();
      // Then delete trading pairs
      await prisma.tradingPair.deleteMany();
    }

    const exchange = new ccxt.binance({
      options: {
        defaultType: 'spot',
      }
    });

    exchange.setSandboxMode(true);
    
    // Load markets
    const markets = await exchange.loadMarkets();
    
    // Debug: Log raw market data
    console.log('\nRaw market data example:');
    const sampleMarket = Object.values(markets)[0];
    console.log(JSON.stringify(sampleMarket, null, 2));
    
    // Debug: Log markets object structure
    console.log('\nMarkets object type:', typeof markets);
    console.log('Markets keys:', Object.keys(markets).slice(0, 5), '...');
    console.log('Total markets:', Object.keys(markets).length);

    // Filter and transform the markets data
    const pairs: TradingPairData[] = Object.entries(markets)
      .filter(([, market]) => isCCXTMarket(market))
      .map(([, market]) => {
        // Since we've validated the market in the filter
        const validMarket = market as CCXTMarket;
        
        // Check if this is a futures pair (contains a colon)
        // Check if this is a futures pair (contains a colon)
        const isMarginPair = validMarket.symbol.includes(':');
        
        // Debug log to check futures pair detection
        if (isMarginPair) {
          console.log(`Found margin pair: ${validMarket.symbol}`);
        }
        
        return {
          exchange: 'binance_testnet',
          symbol: validMarket.symbol,
          baseAsset: validMarket.base,
          quoteAsset: validMarket.quote,
          minQuantity: Number(validMarket.limits?.amount?.min ?? 0),
          maxQuantity: Number(validMarket.limits?.amount?.max ?? 0),
          stepSize: Number(validMarket.precision?.amount ?? 0),
          minNotional: Number(validMarket.limits?.cost?.min ?? 0),
          isSpot: true, 
          isActive: !isMarginPair // Set futures pairs to inactive
        };
      });

    // Debug: Log processed pairs
    console.log('\nProcessed pairs example:');
    if (pairs.length > 0) {
      console.log(JSON.stringify(pairs[0], null, 2));
    }
    console.log(`Found ${pairs.length} trading pairs`);
    console.log(`Active pairs: ${pairs.filter(p => p.isActive).length}`);
    console.log(`Inactive (margin) pairs: ${pairs.filter(p => !p.isActive).length}`);

    // Upsert pairs to database
    let updated = 0;
    for (const pair of pairs) {
      try {
        await prisma.tradingPair.upsert({
          where: {
            exchange_symbol_isSpot: {
              exchange: pair.exchange,
              symbol: pair.symbol,
              isSpot: true,
            },
          },
          update: {
            minQuantity: pair.minQuantity,
            maxQuantity: pair.maxQuantity,
            stepSize: pair.stepSize,
            minNotional: pair.minNotional,
            isActive: pair.isActive,
            baseAsset: pair.baseAsset,
            quoteAsset: pair.quoteAsset,
            updatedAt: new Date(),
          },
          create: pair,
        });
        updated++;
        
        // Debug: Log each successful upsert
        if (updated === 1 || updated % 50 === 0) {
          console.log(`Processed ${updated} pairs...`);
        }
      } catch (err) {
        console.error(`Failed to upsert pair ${pair.symbol}:`, err);
      }
    }

    console.log(`\nSuccessfully updated ${updated} trading pairs`);
  } catch (error) {
    console.error('\nError fetching trading pairs:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  fetchTradingPairs();
}

module.exports = { fetchTradingPairs }; 