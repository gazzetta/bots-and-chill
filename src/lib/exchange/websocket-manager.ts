import { BinanceWebSocket } from './websocket';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ExchangeKey } from '@prisma/client';

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, BinanceWebSocket> = new Map();
  
  private constructor() {}
  
  static getInstance(): WebSocketManager {
    if (!this.instance) {
      this.instance = new WebSocketManager();
    }
    return this.instance;
  }

  // Group bots by exchange key to minimize connections
  async initializeConnections() {
    // Get all active bots
    const activeExchangeKeys = await prisma.exchangeKey.findMany({
      where: {
        bots: {
          some: {
            status: 'RUNNING'
          }
        }
      },
      include: {
        bots: true
      }
    });



    // Create one connection per exchange key
    for (const key of activeExchangeKeys) {
      const connectionId = `${key.exchange}_${key.id}`;
      
      if (!this.connections.has(connectionId)) {
        const ws = new BinanceWebSocket(
          decrypt(key.apiKey),
          decrypt(key.apiSecret),
          key.isTestnet
        );
        
        await ws.connect();
        this.connections.set(connectionId, ws);
      }
    }
  }

  // Add new connection when bot starts
  async addConnection(exchangeKey: ExchangeKey) {
    const connectionId = `${exchangeKey.exchange}_${exchangeKey.id}`;
    
    if (!this.connections.has(connectionId)) {
      const ws = new BinanceWebSocket(
        decrypt(exchangeKey.apiKey),
        decrypt(exchangeKey.apiSecret),
        exchangeKey.isTestnet
      );
      
      await ws.connect();
      this.connections.set(connectionId, ws);
    }
  }

  // Remove connection when last bot stops
  async removeConnection(exchangeKey: ExchangeKey) {
    const connectionId = `${exchangeKey.exchange}_${exchangeKey.id}`;
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      await connection.disconnect();
      this.connections.delete(connectionId);
    }
  }

  async disconnectAll() {
    for (const [connectionId, ws] of this.connections) {
      await ws.disconnect();
      this.connections.delete(connectionId);
    }
  }
}

export const wsManager = WebSocketManager.getInstance(); 