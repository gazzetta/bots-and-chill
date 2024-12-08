export interface Order {
  id: string;
  timestamp: number;  // Unix timestamp in milliseconds
  symbol: string;     // Trading pair (e.g., 'BTC/USDT')
  type: string;       // 'limit' or 'market'
  side: string;       // 'buy' or 'sell'
  price: number;
  amount: number;
  filled: number;     // Amount that was executed
  remaining: number;  // Amount that is still pending
  cost: number;       // Total cost (price * filled)
  status: string;     // 'open', 'closed', 'canceled'
  lastTradeTimestamp?: number;  // When the last fill occurred
}

export interface Trade {
  id: string;
  orderId: string;    // Reference to the original order
  timestamp: number;
  symbol: string;
  type: string;       // The original order type ('limit' or 'market')
  side: string;
  takerOrMaker: string;
  price: number;
  amount: number;
  cost: number;
  fee?: {
    cost: number;
    currency: string;
  };
} 