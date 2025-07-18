import { io, Socket } from 'socket.io-client';
import { 
  NetworkUpdate, 
  NetworkDelta, 
  NetworkState, 
  NetworkMetrics,
  ConsensusEvent,
  CrossChainSwap 
} from '../types/network.types';

// Simple EventEmitter implementation for browser
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }

  off(event: string, callback: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
}

export class WebSocketService extends EventEmitter {
  private socket: Socket | null = null;
  private isIntentionallyClosed = false;
  private mockInterval: number | null = null;

  constructor() {
    super();
  }

  async connect(url: string = 'http://localhost:4001'): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    this.isIntentionallyClosed = false;
    
    try {
      this.socket = io(url, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      this.setupEventHandlers();
    } catch (error) {
      console.error('Socket.IO connection error:', error);
      // Fall back to mock mode
      this.startMockMode();
    }
  }

  send(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket is not connected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket.IO connected successfully');
      this.emit('connect');
      
      // Request initial state
      this.send('request:state');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      // Fall back to mock mode after connection errors
      setTimeout(() => {
        if (!this.socket?.connected) {
          console.log('Falling back to mock mode due to connection failure');
          this.startMockMode();
        }
      }, 2000);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      this.emit('disconnect', reason);
    });

    this.socket.on('network:update', (update: NetworkUpdate) => {
      this.handleNetworkUpdate(update);
    });

    this.socket.on('network:metrics', (metrics: NetworkMetrics) => {
      this.emit('metrics', metrics);
    });

    this.socket.on('consensus:event', (event: ConsensusEvent) => {
      this.emit('consensus', event);
    });

    this.socket.on('swap:event', (swap: CrossChainSwap) => {
      this.emit('swap', swap);
    });

    this.socket.on('swap:update', (swap: CrossChainSwap) => {
      this.emit('swapUpdate', swap);
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket.IO error:', error);
      this.emit('error', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket.IO disconnected:', reason);
      this.emit('disconnect');
      
      if (!this.isIntentionallyClosed && reason === 'io server disconnect') {
        // Fall back to mock mode if server disconnected us
        this.startMockMode();
      }
    });
  }

  private handleNetworkUpdate(update: NetworkUpdate): void {
    switch (update.type) {
      case 'state':
        this.emit('state', update.data as NetworkState);
        break;
      
      case 'delta':
        this.emit('delta', update.data as NetworkDelta);
        break;
      
      case 'metrics':
        this.emit('metrics', update.data as NetworkMetrics);
        break;
      
      default:
        console.warn('Unknown update type:', update);
    }
  }

  private startMockMode(): void {
    console.log('Starting mock WebSocket mode');
    this.emit('connect');
    
    // Simulate random updates
    this.mockInterval = window.setInterval(() => {
      const random = Math.random();
      
      if (random < 0.3) {
        // Emit metric updates
        this.emit('metrics', {
          totalTvl: BigInt(Math.floor(Math.random() * 100000000)) * BigInt(1e18),
          totalEntities: Math.floor(Math.random() * 100) + 50,
          totalChannels: Math.floor(Math.random() * 500) + 200,
          totalAccounts: Math.floor(Math.random() * 1000) + 500,
          activeChannels: Math.floor(Math.random() * 400) + 150,
          transactionVolume24h: BigInt(Math.floor(Math.random() * 50000000)) * BigInt(1e18),
          averageTps: Math.floor(Math.random() * 1000) + 100,
          networkHealth: 85 + Math.random() * 15
        });
      } else if (random < 0.5) {
        // Emit delta updates
        const delta: NetworkDelta = {
          updatedNodes: [{
            id: `ent-${Math.floor(Math.random() * 30).toString().padStart(3, '0')}`,
            transactionRate: Math.floor(Math.random() * 1000)
          }]
        };
        this.emit('delta', delta);
      } else if (random < 0.6) {
        // Emit consensus events
        this.emit('consensus', {
          id: `consensus-${Date.now()}`,
          entityId: `ent-${Math.floor(Math.random() * 30).toString().padStart(3, '0')}`,
          type: Math.random() > 0.5 ? 'proposer_based' : 'gossip_based',
          round: Math.floor(Math.random() * 1000),
          validators: [],
          timestamp: Date.now(),
          duration: Math.random() * 2000 + 500,
          success: Math.random() > 0.1
        });
      }
    }, 2000);
  }

  isConnected(): boolean {
    return this.socket?.connected || this.mockInterval !== null;
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
}