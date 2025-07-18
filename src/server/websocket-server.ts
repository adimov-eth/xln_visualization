import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { 
  NetworkState, 
  NetworkUpdate, 
  NetworkDelta, 
  CrossChainSwap
} from '../d3-app/types/network.types';
import { DataGenerator } from './data-generator';
import { serializeNetworkState } from './utils';

export class WebSocketServer {
  private io: SocketIOServer;
  private httpServer: ReturnType<typeof createServer>;
  private dataGenerator: DataGenerator;
  private networkState: NetworkState;
  private updateInterval: NodeJS.Timeout | null = null;
  private consensusInterval: NodeJS.Timeout | null = null;
  private swapInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 4001) {
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: ["http://localhost:4000", "http://localhost:3000", "http://localhost:8080"],
        methods: ["GET", "POST"]
      }
    });

    this.dataGenerator = new DataGenerator();
    this.networkState = this.dataGenerator.generateInitialState();

    this.setupSocketHandlers();
    this.httpServer.listen(port, () => {
      console.log(`WebSocket server listening on port ${port}`);
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Send initial state
      const initialUpdate: NetworkUpdate = {
        type: 'state',
        data: this.networkState,
        timestamp: Date.now()
      };
      socket.emit('network:update', serializeNetworkState(initialUpdate));

      // Handle client requests
      socket.on('request:state', () => {
        socket.emit('network:update', serializeNetworkState({
          type: 'state',
          data: this.networkState,
          timestamp: Date.now()
        }));
      });

      socket.on('request:metrics', () => {
        socket.emit('network:metrics', serializeNetworkState(this.networkState.metrics));
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Start update intervals
    this.startDataStreaming();
  }

  private startDataStreaming(): void {
    // Network updates every 2 seconds
    this.updateInterval = setInterval(() => {
      const delta = this.dataGenerator.generateNetworkDelta(this.networkState);
      
      if (this.hasChanges(delta)) {
        // Apply delta to current state
        this.applyDelta(delta);

        const update: NetworkUpdate = {
          type: 'delta',
          data: delta,
          timestamp: Date.now()
        };

        this.io.emit('network:update', serializeNetworkState(update));
        
        // Also emit updated metrics
        this.io.emit('network:metrics', serializeNetworkState(this.networkState.metrics));
      }
    }, 2000);

    // Consensus events every 5 seconds
    this.consensusInterval = setInterval(() => {
      const event = this.dataGenerator.generateConsensusEvent(this.networkState);
      if (event) {
        this.io.emit('consensus:event', serializeNetworkState(event));
      }
    }, 5000);

    // Cross-chain swaps every 8 seconds
    this.swapInterval = setInterval(() => {
      const swap = this.dataGenerator.generateCrossChainSwap(this.networkState);
      if (swap) {
        this.io.emit('swap:event', serializeNetworkState(swap));
        
        // Update swap status over time
        this.simulateSwapProgress(swap);
      }
    }, 8000);
  }

  private hasChanges(delta: NetworkDelta): boolean {
    return !!(
      delta.addedNodes?.length ||
      delta.updatedNodes?.length ||
      delta.removedNodes?.length ||
      delta.addedChannels?.length ||
      delta.updatedChannels?.length ||
      delta.removedChannels?.length
    );
  }

  private applyDelta(delta: NetworkDelta): void {
    // Apply node changes
    if (delta.removedNodes) {
      this.networkState.nodes = this.networkState.nodes.filter(
        node => !delta.removedNodes!.includes(node.id)
      );
    }

    if (delta.addedNodes) {
      this.networkState.nodes.push(...delta.addedNodes);
    }

    if (delta.updatedNodes) {
      delta.updatedNodes.forEach(update => {
        const node = this.networkState.nodes.find(n => n.id === update.id);
        if (node) {
          Object.assign(node, update);
        }
      });
    }

    // Apply channel changes
    if (delta.removedChannels) {
      this.networkState.channels = this.networkState.channels.filter(
        channel => !delta.removedChannels!.includes(channel.id)
      );
    }

    if (delta.addedChannels) {
      this.networkState.channels.push(...delta.addedChannels);
    }

    if (delta.updatedChannels) {
      delta.updatedChannels.forEach(update => {
        const channel = this.networkState.channels.find(c => c.id === update.id);
        if (channel) {
          Object.assign(channel, update);
        }
      });
    }

    // Update metrics
    this.networkState.metrics = this.dataGenerator.calculateMetrics(this.networkState);
    this.networkState.timestamp = Date.now();
    this.networkState.version++;
  }

  private simulateSwapProgress(swap: CrossChainSwap): void {
    const stages: CrossChainSwap['status'][] = ['pending', 'locked', 'revealed', 'completed'];
    let currentStage = 0;

    const progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage >= stages.length) {
        clearInterval(progressInterval);
        return;
      }

      const updatedSwap: CrossChainSwap = {
        ...swap,
        status: stages[currentStage],
        timestamp: Date.now()
      };

      this.io.emit('swap:update', serializeNetworkState(updatedSwap));
    }, 3000);
  }

  public stop(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.consensusInterval) clearInterval(this.consensusInterval);
    if (this.swapInterval) clearInterval(this.swapInterval);
    
    this.io.close();
    this.httpServer.close();
  }
}

// Export for use in main server
export default WebSocketServer;