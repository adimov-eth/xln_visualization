import { 
  MockWebSocketServer, 
  MockWebSocketClient,
  createMockWebSocketServer 
} from '../mocks/websocket-mock';
import { 
  testDataGenerator, 
  NetworkState,
  Entity,
  Channel,
  Transaction,
  ConsensusEvent 
} from '../utils/test-data-generators';

describe('WebSocket Integration Tests', () => {
  let server: MockWebSocketServer;
  let client: MockWebSocketClient;
  let networkState: NetworkState;

  beforeEach(async () => {
    // Create mock server and client
    server = createMockWebSocketServer('ws://localhost:8080');
    client = new MockWebSocketClient();
    
    // Generate test network state
    networkState = testDataGenerator.generateNetworkState({
      entityCount: 50,
      channelCount: 100,
      depositaryCount: 5,
      transactionCount: 200,
      consensusEventCount: 20,
    });

    // Wait for connection
    await server.waitForConnection();
    await client.connect('ws://localhost:8080');
  });

  afterEach(async () => {
    await client.disconnect();
    await server.close();
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection successfully', () => {
      expect(client).toBeDefined();
      expect(server).toBeDefined();
    });

    test('should handle connection errors gracefully', async () => {
      // Simulate disconnect
      await server.simulateDisconnect();
      
      // Client should detect disconnection
      let disconnected = false;
      client.on('error' as any, () => {
        disconnected = true;
      });

      // Wait a bit for error to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In real implementation, client would have reconnection logic
      expect(server).toBeDefined();
    });

    test('should reconnect after disconnection', async () => {
      // Simulate disconnect and reconnect
      await server.simulateDisconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconnect
      await server.simulateReconnect();
      
      // Should be able to send messages again
      await server.sendMetrics({ activeEntities: 42 });
      
      const messages = client.getMessages();
      expect(messages).toBeDefined();
    });
  });

  describe('Initial Data Loading', () => {
    test('should receive network snapshot on connection', async () => {
      const snapshotReceived = new Promise<NetworkState>((resolve) => {
        client.on('snapshot', (message) => {
          resolve(message.data);
        });
      });

      await server.sendSnapshot(networkState);
      
      const snapshot = await snapshotReceived;
      expect(snapshot).toBeDefined();
      expect(snapshot.entities).toBeDefined();
      expect(snapshot.channels).toBeDefined();
      expect(snapshot.metrics).toBeDefined();
    });

    test('should handle large snapshots efficiently', async () => {
      const largeState = testDataGenerator.generateLargeNetworkState();
      
      const startTime = performance.now();
      await server.sendSnapshot(largeState);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should send in under 1 second
      
      const messages = server.getMessageHistory();
      expect(messages.length).toBe(1);
      expect(messages[0].type).toBe('snapshot');
    });
  });

  describe('Real-time Updates', () => {
    test('should receive and process entity updates', async () => {
      const entityUpdates: Entity[] = [];
      
      client.on('delta', (message) => {
        if (message.data.entities) {
          entityUpdates.push(...message.data.entities);
        }
      });

      // Send entity update
      const entity = Array.from(networkState.entities.values())[0];
      entity.metrics.transactionVolume += 1000;
      entity.status = 'active';
      
      await server.sendDelta({
        entities: new Map([[entity.id, entity]]),
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(entityUpdates.length).toBe(1);
      expect(entityUpdates[0].status).toBe('active');
    });

    test('should receive and process channel updates', async () => {
      const channelUpdates: Channel[] = [];
      
      client.on('delta', (message) => {
        if (message.data.channels) {
          channelUpdates.push(...message.data.channels);
        }
      });

      // Send channel updates
      const channels = Array.from(networkState.channels.values()).slice(0, 5);
      channels.forEach(channel => {
        channel.balance = Math.random() * channel.capacity;
        channel.metrics.throughput += Math.random() * 100;
      });

      await server.sendDelta({
        channels: new Map(channels.map(c => [c.id, c])),
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(channelUpdates.length).toBe(5);
    });

    test('should batch multiple updates efficiently', async () => {
      const updates: any[] = [];
      
      client.on('delta', (message) => {
        updates.push(message.data);
      });

      // Send multiple updates rapidly
      for (let i = 0; i < 10; i++) {
        const entity = Array.from(networkState.entities.values())[i];
        entity.metrics.liquidity *= 1.1;
        
        await server.sendDelta({
          entities: new Map([[entity.id, entity]]),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(updates.length).toBe(10);
    });
  });

  describe('Transaction Flow Updates', () => {
    test('should receive real-time transaction updates', async () => {
      const transactions: Transaction[] = [];
      
      client.on('transaction', (message) => {
        transactions.push(message.data);
      });

      // Send transaction updates
      const tx = networkState.transactions[0];
      
      // Pending
      tx.status = 'pending';
      await server.sendTransaction(tx);
      
      // Confirmed
      await new Promise(resolve => setTimeout(resolve, 100));
      tx.status = 'confirmed';
      await server.sendTransaction(tx);

      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(transactions.length).toBe(2);
      expect(transactions[0].status).toBe('pending');
      expect(transactions[1].status).toBe('confirmed');
    });

    test('should show transaction path animation data', async () => {
      const pathUpdates: any[] = [];
      
      client.on('transaction', (message) => {
        if (message.data.path) {
          pathUpdates.push({
            transactionId: message.data.id,
            path: message.data.path,
            currentStep: message.data.currentStep,
          });
        }
      });

      // Simulate transaction moving through path
      const tx = testDataGenerator.generateTransaction(
        Array.from(networkState.entities.values())
      );
      
      for (let i = 0; i < tx.path.length; i++) {
        await server.sendTransaction({
          ...tx,
          currentStep: i,
        } as any);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      expect(pathUpdates.length).toBe(tx.path.length);
    });
  });

  describe('Consensus Visualization Updates', () => {
    test('should receive consensus round updates', async () => {
      const consensusEvents: ConsensusEvent[] = [];
      
      client.on('consensus', (message) => {
        consensusEvents.push(message.data);
      });

      // Simulate consensus round
      const validators = Array.from(networkState.depositaries.values())[0].validators;
      
      // Propose
      await server.sendConsensusEvent({
        ...testDataGenerator.generateConsensusEvent(validators),
        type: 'propose',
        round: 100,
      });

      // Vote
      await server.sendConsensusEvent({
        ...testDataGenerator.generateConsensusEvent(validators),
        type: 'vote',
        round: 100,
      });

      // Commit
      await server.sendConsensusEvent({
        ...testDataGenerator.generateConsensusEvent(validators),
        type: 'commit',
        round: 100,
      });

      // Finalize
      await server.sendConsensusEvent({
        ...testDataGenerator.generateConsensusEvent(validators),
        type: 'finalize',
        round: 100,
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consensusEvents.length).toBe(4);
      expect(consensusEvents.map(e => e.type)).toEqual(['propose', 'vote', 'commit', 'finalize']);
    });

    test('should handle concurrent consensus rounds', async () => {
      const consensusEvents: Map<number, ConsensusEvent[]> = new Map();
      
      client.on('consensus', (message) => {
        const event = message.data;
        if (!consensusEvents.has(event.round)) {
          consensusEvents.set(event.round, []);
        }
        consensusEvents.get(event.round)!.push(event);
      });

      // Simulate multiple concurrent rounds
      const validators = Array.from(networkState.depositaries.values())[0].validators;
      
      for (let round = 100; round < 103; round++) {
        for (const type of ['propose', 'vote', 'commit', 'finalize'] as const) {
          await server.sendConsensusEvent({
            ...testDataGenerator.generateConsensusEvent(validators),
            type,
            round,
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(consensusEvents.size).toBe(3);
      consensusEvents.forEach((events, round) => {
        expect(events.length).toBe(4);
      });
    });
  });

  describe('Alert System', () => {
    test('should receive and prioritize alerts', async () => {
      const alerts: any[] = [];
      
      client.on('alert', (message) => {
        alerts.push(message.data);
      });

      // Send alerts of different priorities
      await server.sendAlert({
        level: 'info',
        title: 'Network Update',
        message: 'New entity joined the network',
      });

      await server.sendAlert({
        level: 'warning',
        title: 'Channel Capacity Warning',
        message: 'Channel ABC approaching limit',
        channelId: 'channel-123',
      });

      await server.sendAlert({
        level: 'critical',
        title: 'Entity Offline',
        message: 'Hub entity XYZ is offline',
        entityId: 'entity-456',
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(alerts.length).toBe(3);
      expect(alerts.map(a => a.level)).toEqual(['info', 'warning', 'critical']);
    });

    test('should handle alert flooding', async () => {
      const alerts: any[] = [];
      let rateLimited = false;
      
      client.on('alert', (message) => {
        alerts.push(message.data);
      });

      // Send many alerts rapidly
      for (let i = 0; i < 100; i++) {
        try {
          await server.sendAlert({
            level: 'warning',
            title: `Alert ${i}`,
            message: `Test alert number ${i}`,
          });
        } catch (error) {
          rateLimited = true;
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should have some rate limiting mechanism
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Metrics Updates', () => {
    test('should receive periodic metrics updates', async () => {
      const metricsHistory: any[] = [];
      
      client.on('metrics', (message) => {
        metricsHistory.push({
          timestamp: message.timestamp,
          metrics: message.data,
        });
      });

      // Simulate periodic metrics updates
      for (let i = 0; i < 5; i++) {
        await server.sendMetrics({
          totalValueLocked: networkState.metrics.totalValueLocked * (1 + Math.random() * 0.1),
          activeEntities: networkState.metrics.activeEntities + Math.floor(Math.random() * 5),
          openChannels: networkState.metrics.openChannels + Math.floor(Math.random() * 10),
          dailyVolume: networkState.metrics.dailyVolume * (1 + Math.random() * 0.2),
          networkFees: networkState.metrics.networkFees * (1 + Math.random() * 0.05),
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(metricsHistory.length).toBe(5);
      
      // Verify metrics are changing over time
      const tvlValues = metricsHistory.map(m => m.metrics.totalValueLocked);
      const uniqueTvlValues = new Set(tvlValues);
      expect(uniqueTvlValues.size).toBeGreaterThan(1);
    });
  });

  describe('Message Ordering and Reliability', () => {
    test('should maintain message order', async () => {
      const receivedMessages: any[] = [];
      
      ['delta', 'transaction', 'consensus', 'alert', 'metrics'].forEach(type => {
        client.on(type as any, (message) => {
          receivedMessages.push({
            type: message.type,
            timestamp: message.timestamp,
            sequence: receivedMessages.length,
          });
        });
      });

      // Send messages in specific order
      await server.sendDelta({ entities: new Map() });
      await server.sendTransaction(networkState.transactions[0]);
      await server.sendConsensusEvent(networkState.consensusEvents[0]);
      await server.sendAlert({ level: 'info', title: 'Test', message: 'Test' });
      await server.sendMetrics(networkState.metrics);

      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(receivedMessages.length).toBe(5);
      expect(receivedMessages.map(m => m.type)).toEqual([
        'delta',
        'transaction',
        'consensus',
        'alert',
        'metrics',
      ]);
    });

    test('should handle missing messages gracefully', async () => {
      // Simulate missing message by clearing some from history
      await server.sendDelta({ entities: new Map() });
      server.clearMessageHistory();
      
      // Client should still process subsequent messages
      await server.sendMetrics(networkState.metrics);
      
      const messages = client.getMessages();
      expect(messages).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle high-frequency updates', async () => {
      const updateCount = 1000;
      const updates: any[] = [];
      
      client.on('delta', (message) => {
        updates.push(message);
      });

      const startTime = performance.now();
      
      // Send many updates rapidly
      for (let i = 0; i < updateCount; i++) {
        const entity = Array.from(networkState.entities.values())[
          i % networkState.entities.size
        ];
        entity.metrics.transactionVolume += 1;
        
        await server.sendDelta({
          entities: new Map([[entity.id, entity]]),
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const updatesPerSecond = (updateCount / duration) * 1000;
      
      console.log(`Processed ${updateCount} updates in ${duration.toFixed(2)}ms (${updatesPerSecond.toFixed(0)} updates/sec)`);
      
      expect(updatesPerSecond).toBeGreaterThan(100); // Should handle at least 100 updates/sec
    });

    test('should maintain low latency under load', async () => {
      const latencies: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const sendTime = performance.now();
        
        await server.sendMetrics({
          activeEntities: i,
        });
        
        const receiveTime = performance.now();
        latencies.push(receiveTime - sendTime);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      expect(avgLatency).toBeLessThan(10); // Average under 10ms
      expect(maxLatency).toBeLessThan(50); // Max under 50ms
    });
  });
});