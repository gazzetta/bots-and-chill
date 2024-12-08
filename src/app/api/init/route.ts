import { wsManager } from '@/lib/exchange/websocket-manager';

export async function GET() {
  try {
    await wsManager.initializeConnections();
    return new Response('WebSocket connections initialized', { status: 200 });
  } catch (error) {
    console.error('Failed to initialize WebSocket connections:', error);
    return new Response('Failed to initialize WebSocket connections', { status: 500 });
  }
} 