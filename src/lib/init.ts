import { wsManager } from './exchange/websocket-manager';
import { logMessage, LogType } from './logging';

export async function initializeServices() {
  try {
    // Close any existing connections first
    await wsManager.disconnectAll();
    
    // Initialize new connections for all running bots
    await wsManager.initializeConnections();
    
    logMessage(LogType.INFO, 'WebSocket connections initialized successfully');
  } catch (error) {
    logMessage(LogType.ERROR, 'Failed to initialize WebSocket connections', { error });
  }
} 