import { testDataGenerator, NetworkState, Entity, Channel } from '../../utils/test-data-generators';

describe('NetworkState Model', () => {
  let networkState: NetworkState;

  beforeEach(() => {
    networkState = testDataGenerator.generateNetworkState({
      entityCount: 10,
      channelCount: 15,
      depositaryCount: 3,
      transactionCount: 20,
      consensusEventCount: 5,
    });
  });

  describe('Data Structure Validation', () => {
    test('should have valid version string', () => {
      expect(networkState.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have valid timestamp', () => {
      expect(networkState.timestamp).toBeInstanceOf(Date);
      expect(networkState.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should contain all required collections', () => {
      expect(networkState.entities).toBeInstanceOf(Map);
      expect(networkState.channels).toBeInstanceOf(Map);
      expect(networkState.depositaries).toBeInstanceOf(Map);
      expect(networkState.transactions).toBeInstanceOf(Array);
      expect(networkState.consensusEvents).toBeInstanceOf(Array);
    });

    test('should have valid metrics', () => {
      const { metrics } = networkState;
      expect(metrics.totalValueLocked).toBeGreaterThanOrEqual(0);
      expect(metrics.activeEntities).toBeGreaterThanOrEqual(0);
      expect(metrics.openChannels).toBeGreaterThanOrEqual(0);
      expect(metrics.dailyVolume).toBeGreaterThanOrEqual(0);
      expect(metrics.networkFees).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Entity Validation', () => {
    test('all entities should have unique IDs', () => {
      const ids = Array.from(networkState.entities.keys());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('entities should have valid types', () => {
      const validTypes = ['hub', 'leaf', 'gateway'];
      networkState.entities.forEach(entity => {
        expect(validTypes).toContain(entity.type);
      });
    });

    test('entities should have valid status', () => {
      const validStatuses = ['active', 'inactive', 'suspended'];
      networkState.entities.forEach(entity => {
        expect(validStatuses).toContain(entity.status);
      });
    });

    test('entity metrics should be within valid ranges', () => {
      networkState.entities.forEach(entity => {
        expect(entity.metrics.uptime).toBeGreaterThanOrEqual(0);
        expect(entity.metrics.uptime).toBeLessThanOrEqual(1);
        expect(entity.metrics.transactionVolume).toBeGreaterThanOrEqual(0);
        expect(entity.metrics.channelCount).toBeGreaterThanOrEqual(0);
        expect(entity.metrics.liquidity).toBeGreaterThanOrEqual(0);
      });
    });

    test('entity coordinates should be valid if present', () => {
      networkState.entities.forEach(entity => {
        if (entity.coordinates) {
          expect(typeof entity.coordinates.x).toBe('number');
          expect(typeof entity.coordinates.y).toBe('number');
          expect(isFinite(entity.coordinates.x)).toBe(true);
          expect(isFinite(entity.coordinates.y)).toBe(true);
        }
      });
    });
  });

  describe('Channel Validation', () => {
    test('all channels should have unique IDs', () => {
      const ids = Array.from(networkState.channels.keys());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('channels should reference existing entities', () => {
      const entityIds = new Set(networkState.entities.keys());
      networkState.channels.forEach(channel => {
        expect(entityIds.has(channel.source)).toBe(true);
        expect(entityIds.has(channel.target)).toBe(true);
      });
    });

    test('channels should not be self-referential', () => {
      networkState.channels.forEach(channel => {
        expect(channel.source).not.toBe(channel.target);
      });
    });

    test('channel balance should not exceed capacity', () => {
      networkState.channels.forEach(channel => {
        expect(channel.balance).toBeGreaterThanOrEqual(0);
        expect(channel.balance).toBeLessThanOrEqual(channel.capacity);
      });
    });

    test('channel states should be valid', () => {
      const validStates = ['open', 'closing', 'closed', 'disputed'];
      networkState.channels.forEach(channel => {
        expect(validStates).toContain(channel.state);
      });
    });

    test('channel metrics should be within valid ranges', () => {
      networkState.channels.forEach(channel => {
        expect(channel.metrics.throughput).toBeGreaterThanOrEqual(0);
        expect(channel.metrics.successRate).toBeGreaterThanOrEqual(0);
        expect(channel.metrics.successRate).toBeLessThanOrEqual(1);
        expect(channel.metrics.avgLatency).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Transaction Validation', () => {
    test('transactions should have valid status', () => {
      const validStatuses = ['pending', 'confirmed', 'failed', 'expired'];
      networkState.transactions.forEach(transaction => {
        expect(validStatuses).toContain(transaction.status);
      });
    });

    test('transaction paths should include source and destination', () => {
      networkState.transactions.forEach(transaction => {
        expect(transaction.path.length).toBeGreaterThanOrEqual(2);
        expect(transaction.path[0]).toBe(transaction.from);
        expect(transaction.path[transaction.path.length - 1]).toBe(transaction.to);
      });
    });

    test('transaction amounts and fees should be positive', () => {
      networkState.transactions.forEach(transaction => {
        expect(transaction.amount).toBeGreaterThan(0);
        expect(transaction.fee).toBeGreaterThan(0);
      });
    });

    test('transaction timestamps should be valid', () => {
      networkState.transactions.forEach(transaction => {
        expect(transaction.timestamp).toBeInstanceOf(Date);
        expect(transaction.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });

  describe('Depositary Validation', () => {
    test('depositaries should have unique IDs', () => {
      const ids = Array.from(networkState.depositaries.keys());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('depositaries should have valid chains', () => {
      const validChains = ['ethereum', 'bitcoin', 'solana', 'polygon'];
      networkState.depositaries.forEach(depositary => {
        expect(validChains).toContain(depositary.chain);
      });
    });

    test('collateralization ratio should be above minimum', () => {
      const MIN_COLLATERALIZATION = 1.0;
      networkState.depositaries.forEach(depositary => {
        expect(depositary.collateralizationRatio).toBeGreaterThanOrEqual(MIN_COLLATERALIZATION);
      });
    });

    test('validators array should not be empty', () => {
      networkState.depositaries.forEach(depositary => {
        expect(depositary.validators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Consensus Event Validation', () => {
    test('consensus events should have valid types', () => {
      const validTypes = ['propose', 'vote', 'commit', 'finalize'];
      networkState.consensusEvents.forEach(event => {
        expect(validTypes).toContain(event.type);
      });
    });

    test('consensus events should have matching validators and signatures', () => {
      networkState.consensusEvents.forEach(event => {
        expect(event.signatures.length).toBe(event.validators.length);
      });
    });

    test('consensus events should have positive round numbers', () => {
      networkState.consensusEvents.forEach(event => {
        expect(event.round).toBeGreaterThan(0);
      });
    });
  });

  describe('Network Metrics Calculation', () => {
    test('active entities count should match actual active entities', () => {
      const actualActive = Array.from(networkState.entities.values())
        .filter(e => e.status === 'active').length;
      expect(networkState.metrics.activeEntities).toBe(actualActive);
    });

    test('open channels count should match actual open channels', () => {
      const actualOpen = Array.from(networkState.channels.values())
        .filter(c => c.state === 'open').length;
      expect(networkState.metrics.openChannels).toBe(actualOpen);
    });

    test('total value locked should equal sum of depositary reserves', () => {
      const actualTVL = Array.from(networkState.depositaries.values())
        .reduce((sum, d) => sum + d.reserves, 0);
      expect(networkState.metrics.totalValueLocked).toBeCloseTo(actualTVL, 2);
    });
  });

  describe('Data Consistency', () => {
    test('should handle empty network state', () => {
      const emptyState = testDataGenerator.generateNetworkState({
        entityCount: 0,
        channelCount: 0,
        depositaryCount: 0,
        transactionCount: 0,
        consensusEventCount: 0,
      });

      expect(emptyState.entities.size).toBe(0);
      expect(emptyState.channels.size).toBe(0);
      expect(emptyState.depositaries.size).toBe(0);
      expect(emptyState.transactions.length).toBe(0);
      expect(emptyState.consensusEvents.length).toBe(0);
    });

    test('should maintain referential integrity when entities are removed', () => {
      // Remove an entity
      const entityToRemove = Array.from(networkState.entities.keys())[0];
      networkState.entities.delete(entityToRemove);

      // Check that channels don't reference removed entity
      networkState.channels.forEach(channel => {
        expect(channel.source).not.toBe(entityToRemove);
        expect(channel.target).not.toBe(entityToRemove);
      });
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle large network state efficiently', () => {
      const startTime = performance.now();
      const largeState = testDataGenerator.generateNetworkState({
        entityCount: 1000,
        channelCount: 5000,
        depositaryCount: 10,
        transactionCount: 10000,
        consensusEventCount: 100,
      });
      const endTime = performance.now();

      expect(largeState.entities.size).toBe(1000);
      expect(largeState.channels.size).toBe(5000);
      expect(endTime - startTime).toBeLessThan(1000); // Should generate in under 1 second
    });

    test('should efficiently lookup entities by ID', () => {
      const entityIds = Array.from(networkState.entities.keys());
      const startTime = performance.now();
      
      // Perform 1000 lookups
      for (let i = 0; i < 1000; i++) {
        const randomId = entityIds[Math.floor(Math.random() * entityIds.length)];
        const entity = networkState.entities.get(randomId);
        expect(entity).toBeDefined();
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });
});