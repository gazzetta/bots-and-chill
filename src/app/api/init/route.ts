import { wsManager } from '@/lib/exchange/websocket-manager';

export async function GET() {
  await wsManager.initializeConnections();
  return new Response('WebSocket connections initialized');
} 