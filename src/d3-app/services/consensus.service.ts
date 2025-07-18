import { ConsensusEvent, EntityNode, NetworkNode } from '../types/network.types';
import { WebSocketService } from './websocket.service';

interface ConsensusEventHandler {
  (event: ConsensusEvent): void;
}

export class ConsensusService {
  private wsService: WebSocketService;
  private eventHandlers: Set<ConsensusEventHandler> = new Set();
  private entityNodesMap: Map<string, EntityNode> = new Map();
  private consensusEventQueue: ConsensusEvent[] = [];
  private isProcessing = false;
  private mockInterval: number | null = null;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    // Listen for consensus events from WebSocket
    this.wsService.on('consensus', (event: ConsensusEvent) => {
      this.handleConsensusEvent(event);
    });

    // Update entity nodes when network state changes
    this.wsService.on('state', (state: any) => {
      this.updateEntityNodes(state.nodes || []);
    });

    this.wsService.on('delta', (delta: any) => {
      if (delta.addedNodes) {
        this.updateEntityNodes(delta.addedNodes);
      }
      if (delta.updatedNodes) {
        // Update existing nodes
        delta.updatedNodes.forEach((update: Partial<NetworkNode>) => {
          if (update.id && this.entityNodesMap.has(update.id)) {
            const existing = this.entityNodesMap.get(update.id)!;
            this.entityNodesMap.set(update.id, { ...existing, ...update } as EntityNode);
          }
        });
      }
    });

    // Start mock consensus events if in mock mode
    this.wsService.on('connect', () => {
      if (!this.wsService.isConnected()) {
        this.startMockConsensusEvents();
      }
    });

    this.wsService.on('disconnect', () => {
      this.stopMockConsensusEvents();
    });
  }

  private updateEntityNodes(nodes: NetworkNode[]): void {
    nodes.forEach(node => {
      if (node.type === 'entity') {
        this.entityNodesMap.set(node.id, node as EntityNode);
      }
    });
  }

  private handleConsensusEvent(event: ConsensusEvent): void {
    // Add to queue for sequential processing
    this.consensusEventQueue.push(event);
    this.processEventQueue();
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.consensusEventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.consensusEventQueue.length > 0) {
      const event = this.consensusEventQueue.shift()!;
      
      // Notify all handlers
      this.eventHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in consensus event handler:', error);
        }
      });

      // Wait a bit between events for visual clarity
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
  }

  onConsensusEvent(handler: ConsensusEventHandler): () => void {
    this.eventHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  getEntityNode(entityId: string): EntityNode | undefined {
    return this.entityNodesMap.get(entityId);
  }

  // Mock consensus events for demo
  private startMockConsensusEvents(): void {
    if (this.mockInterval) return;

    const consensusTypes = ['proposer_based', 'gossip_based'] as const;
    const entityIds = Array.from({ length: 30 }, (_, i) => 
      `ent-${i.toString().padStart(3, '0')}`
    );

    this.mockInterval = window.setInterval(() => {
      const entityId = entityIds[Math.floor(Math.random() * entityIds.length)];
      const entity = this.entityNodesMap.get(entityId);
      
      if (!entity || Math.random() > 0.3) return; // 30% chance of consensus event

      const validatorCount = 5 + Math.floor(Math.random() * 10);
      const validators = Array.from({ length: validatorCount }, () => 
        `0x${Math.random().toString(16).substring(2, 42)}`
      );

      const consensusType = entity.consensusType || consensusTypes[Math.floor(Math.random() * consensusTypes.length)];
      const event: ConsensusEvent = {
        id: `consensus-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        entityId,
        type: consensusType as any,
        round: Math.floor(Math.random() * 1000) + 1,
        proposer: consensusType === 'proposer_based' ? validators[0] : undefined,
        validators,
        timestamp: Date.now(),
        duration: 1000 + Math.random() * 2000,
        success: Math.random() > 0.1 // 90% success rate
      };

      this.handleConsensusEvent(event);
    }, 3000 + Math.random() * 4000); // Random interval between 3-7 seconds
  }

  private stopMockConsensusEvents(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  // Request consensus history for a specific entity
  requestConsensusHistory(entityId: string, limit: number = 10): void {
    this.wsService.send('requestConsensusHistory', {
      entityId,
      limit
    });
  }

  // Subscribe to real-time consensus events for specific entities
  subscribeToEntity(entityId: string): void {
    this.wsService.send('subscribeConsensus', {
      entityId
    });
  }

  unsubscribeFromEntity(entityId: string): void {
    this.wsService.send('unsubscribeConsensus', {
      entityId
    });
  }

  disconnect(): void {
    this.stopMockConsensusEvents();
    this.eventHandlers.clear();
    this.entityNodesMap.clear();
    this.consensusEventQueue = [];
  }
}