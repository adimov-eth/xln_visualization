import WS from 'jest-websocket-mock';
import { Server } from 'mock-socket';
import { NetworkState, ConsensusEvent, Transaction } from '../utils/test-data-generators';

export interface WebSocketMessage {
  type: 'delta' | 'snapshot' | 'consensus' | 'transaction' | 'alert' | 'metrics';
  timestamp: string;
  data: any;
}

export class MockWebSocketServer {
  private server: WS;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected: boolean = false;

  constructor(url: string = 'ws://localhost:8080') {
    this.server = new WS(url);
  }

  async waitForConnection(): Promise<void> {
    await this.server.connected;
    this.isConnected = true;
  }

  async close(): Promise<void> {
    this.server.close();
    this.isConnected = false;
  }

  // Send network state delta update
  async sendDelta(delta: Partial<NetworkState>): Promise<void> {
    const message: WebSocketMessage = {
      type: 'delta',
      timestamp: new Date().toISOString(),
      data: delta,
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Send full network snapshot
  async sendSnapshot(state: NetworkState): Promise<void> {
    const message: WebSocketMessage = {
      type: 'snapshot',
      timestamp: new Date().toISOString(),
      data: {
        version: state.version,
        entities: Array.from(state.entities.entries()),
        channels: Array.from(state.channels.entries()),
        depositaries: Array.from(state.depositaries.entries()),
        transactions: state.transactions,
        consensusEvents: state.consensusEvents,
        metrics: state.metrics,
      },
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Send consensus event
  async sendConsensusEvent(event: ConsensusEvent): Promise<void> {
    const message: WebSocketMessage = {
      type: 'consensus',
      timestamp: new Date().toISOString(),
      data: event,
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Send transaction update
  async sendTransaction(transaction: Transaction): Promise<void> {
    const message: WebSocketMessage = {
      type: 'transaction',
      timestamp: new Date().toISOString(),
      data: transaction,
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Send alert
  async sendAlert(alert: {
    level: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    entityId?: string;
    channelId?: string;
  }): Promise<void> {
    const message: WebSocketMessage = {
      type: 'alert',
      timestamp: new Date().toISOString(),
      data: alert,
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Send metrics update
  async sendMetrics(metrics: Partial<NetworkState['metrics']>): Promise<void> {
    const message: WebSocketMessage = {
      type: 'metrics',
      timestamp: new Date().toISOString(),
      data: metrics,
    };
    this.server.send(JSON.stringify(message));
    this.messageQueue.push(message);
  }

  // Simulate network issues
  async simulateDisconnect(): Promise<void> {
    this.server.error();
  }

  async simulateReconnect(): Promise<void> {
    await this.waitForConnection();
  }

  // Test helpers
  getMessageHistory(): WebSocketMessage[] {
    return [...this.messageQueue];
  }

  clearMessageHistory(): void {
    this.messageQueue = [];
  }

  async expectMessage(type: WebSocketMessage['type']): Promise<WebSocketMessage | undefined> {
    return this.messageQueue.find(msg => msg.type === type);
  }

  // Simulate real-time updates
  async simulateRealTimeUpdates(
    state: NetworkState,
    options: {
      updateInterval?: number;
      updateCount?: number;
      includeConsensus?: boolean;
      includeTransactions?: boolean;
      includeAlerts?: boolean;
    } = {}
  ): Promise<void> {
    const {
      updateInterval = 1000,
      updateCount = 10,
      includeConsensus = true,
      includeTransactions = true,
      includeAlerts = true,
    } = options;

    for (let i = 0; i < updateCount; i++) {
      // Send various types of updates
      if (includeTransactions && state.transactions.length > 0) {
        const transaction = state.transactions[Math.floor(Math.random() * state.transactions.length)];
        await this.sendTransaction({
          ...transaction,
          status: 'confirmed',
          timestamp: new Date(),
        });
      }

      if (includeConsensus && state.consensusEvents.length > 0) {
        const event = state.consensusEvents[Math.floor(Math.random() * state.consensusEvents.length)];
        await this.sendConsensusEvent({
          ...event,
          round: event.round + i,
          timestamp: new Date(),
        });
      }

      if (includeAlerts && Math.random() > 0.7) {
        const entities = Array.from(state.entities.values());
        const entity = entities[Math.floor(Math.random() * entities.length)];
        await this.sendAlert({
          level: 'warning',
          title: 'Channel Capacity Warning',
          message: `Channel approaching capacity limit for entity ${entity.name}`,
          entityId: entity.id,
        });
      }

      // Send metrics update
      await this.sendMetrics({
        dailyVolume: state.metrics.dailyVolume * (1 + (Math.random() - 0.5) * 0.1),
        networkFees: state.metrics.networkFees * (1 + (Math.random() - 0.5) * 0.05),
      });

      // Wait before next update
      await new Promise(resolve => setTimeout(resolve, updateInterval));
    }
  }
}

// Socket.IO Mock for alternative WebSocket implementation
export class MockSocketIOServer {
  private server: Server;
  private sockets: any[] = [];

  constructor(url: string = 'http://localhost:3000') {
    this.server = new Server(url);
    
    this.server.on('connection', socket => {
      this.sockets.push(socket);
      
      socket.on('subscribe', (channels: string[]) => {
        channels.forEach(channel => socket.join(channel));
      });
      
      socket.on('unsubscribe', (channels: string[]) => {
        channels.forEach(channel => socket.leave(channel));
      });
    });
  }

  emit(event: string, data: any): void {
    this.server.emit(event, data);
  }

  emitTo(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, data);
  }

  disconnect(): void {
    this.sockets.forEach(socket => socket.disconnect());
    this.server.stop();
  }
}

// WebSocket Test Client
export class MockWebSocketClient {
  private ws: WebSocket | null = null;
  private messages: WebSocketMessage[] = [];
  private handlers: Map<string, Function[]> = new Map();

  async connect(url: string = 'ws://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.messages.push(message);
        
        const handlers = this.handlers.get(message.type) || [];
        handlers.forEach(handler => handler(message));
      };
    });
  }

  on(type: WebSocketMessage['type'], handler: (message: WebSocketMessage) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getMessages(): WebSocketMessage[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }
}

// Export test utilities
export function createMockWebSocketServer(url?: string): MockWebSocketServer {
  return new MockWebSocketServer(url);
}

export function createMockSocketIOServer(url?: string): MockSocketIOServer {
  return new MockSocketIOServer(url);
}

export function createMockWebSocketClient(): MockWebSocketClient {
  return new MockWebSocketClient();
}