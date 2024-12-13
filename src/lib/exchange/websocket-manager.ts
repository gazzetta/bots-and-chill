import { BinanceWebSocket } from './websocket';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { ExchangeKey } from '@prisma/client';
import { logMessage, LogType } from '@/lib/logging';
import { EventEmitter } from 'events';

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, BinanceWebSocket> = new Map();
  private botMappings: Map<string, Set<string>> = new Map();
  
  private constructor() {
    // Increase max listeners to prevent warning
    EventEmitter.defaultMaxListeners = 20;
    
    // Cleanup on process exit
    process.on('beforeExit', async () => {
      await this.disconnectAll();
    });
    
    // Cleanup on unhandled errors
    process.on('uncaughtException', async () => {
      await this.disconnectAll();
    });
  }
  
  static getInstance(): WebSocketManager {
    if (!this.instance) {
      this.instance = new WebSocketManager();
    }
    return this.instance;
  }

  async initializeConnections() {
    // First disconnect all existing connections
    await this.disconnectAll();

    const activeExchangeKeys = await prisma.exchangeKey.findMany({
      where: {
        bots: {
          some: {
            status: 'RUNNING'
          }
        }
      }
    });

    for (const key of activeExchangeKeys) {
      await this.addConnection(key);
    }
  }

  async addConnection(exchangeKey: ExchangeKey) {
    const connectionId = `${exchangeKey.exchange}_${exchangeKey.isTestnet}`;
    
    logMessage(LogType.INFO, 'Adding WebSocket connection', {
      connectionId,
      exchange: exchangeKey.exchange,
      isTestnet: exchangeKey.isTestnet
    });

    if (!this.botMappings.has(connectionId)) {
      this.botMappings.set(connectionId, new Set());
    }
    this.botMappings.get(connectionId)?.add(exchangeKey.id);

    if (!this.connections.has(connectionId)) {
      const ws = new BinanceWebSocket(
        await decrypt(exchangeKey.apiKey),
        await decrypt(exchangeKey.apiSecret),
        exchangeKey.isTestnet
      );
      await ws.connect();
      this.connections.set(connectionId, ws);
      logMessage(LogType.INFO, 'New WebSocket connection established', { connectionId });
    } else {
      logMessage(LogType.INFO, 'Using existing WebSocket connection', { connectionId });
    }
  }

  async removeConnection(exchangeKey: ExchangeKey) {
    const connectionId = `${exchangeKey.exchange}_${exchangeKey.isTestnet}`;
    this.botMappings.get(connectionId)?.delete(exchangeKey.id);
    if (this.botMappings.get(connectionId)?.size === 0) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        await connection.disconnect();
        this.connections.delete(connectionId);
        this.botMappings.delete(connectionId);
      }
    }
  }

  async disconnectAll() {
    for (const [connectionId, ws] of this.connections) {
      await ws.disconnect();
      this.connections.delete(connectionId);
      this.botMappings.delete(connectionId);
    }
    logMessage(LogType.INFO, 'All WebSocket connections disconnected');
  }
}

export const wsManager = WebSocketManager.getInstance(); 