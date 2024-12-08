import { Order, Trade } from './types';

// Define CCXT types based on their response structure
interface CCXTOrder {
  id: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  filled: number;
  remaining: number;
  status: string;
  timestamp: number;
  cost: number;
  average?: number;
  postOnly?: boolean;
  info: Record<string, any>;
}

interface CCXTTrade {
  id: string;
  order: string;
  symbol: string;
  side: 'buy' | 'sell';
  takerOrMaker: 'taker' | 'maker';
  price: number;
  amount: number;
  cost: number;
  fee?: {
    currency: string;
    cost: number;
  };
  timestamp: number;
  info: Record<string, any>;
}

export function mapCCXTOrder(ccxtOrder: any): Order {
  return {
    id: ccxtOrder.id,
    timestamp: ccxtOrder.timestamp,
    symbol: ccxtOrder.symbol,
    type: ccxtOrder.type || 'unknown',
    side: ccxtOrder.side || 'unknown',
    price: ccxtOrder.price || 0,
    amount: ccxtOrder.amount || 0,
    filled: ccxtOrder.filled || 0,
    remaining: ccxtOrder.remaining || 0,
    cost: ccxtOrder.cost || 0,
    status: ccxtOrder.status || 'unknown',
    lastTradeTimestamp: ccxtOrder.lastTradeTimestamp
  };
}

export function mapCCXTTrade(ccxtTrade: any): Trade {
  return {
    id: ccxtTrade.id,
    orderId: ccxtTrade.order || 'unknown',  // CCXT uses 'order' for orderId
    timestamp: ccxtTrade.timestamp,
    symbol: ccxtTrade.symbol,
    type: ccxtTrade.type || (ccxtTrade.info?.type || 'unknown').toLowerCase(),  // Get from info if not in main object
    side: ccxtTrade.side || 'unknown',
    takerOrMaker: ccxtTrade.takerOrMaker || 'unknown',
    price: ccxtTrade.price || 0,
    amount: ccxtTrade.amount || 0,
    cost: ccxtTrade.cost || 0,
    fee: ccxtTrade.fee ? {
      cost: ccxtTrade.fee.cost || 0,
      currency: ccxtTrade.fee.currency || 'unknown'
    } : undefined
  };
} 