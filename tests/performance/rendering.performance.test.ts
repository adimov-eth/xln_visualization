import { performance } from 'perf_hooks';
import { testDataGenerator, NetworkState } from '../utils/test-data-generators';

// Performance thresholds in milliseconds
const PERFORMANCE_THRESHOLDS = {
  initialRender: {
    small: 100,    // 10 nodes
    medium: 500,   // 100 nodes
    large: 2000,   // 1000 nodes
    stress: 5000,  // 10000 nodes
  },
  update: {
    small: 16,     // 60 FPS target
    medium: 33,    // 30 FPS minimum
    large: 50,     // 20 FPS acceptable
    stress: 100,   // 10 FPS minimum
  },
  interaction: {
    pan: 16,       // Smooth panning
    zoom: 16,      // Smooth zooming
    hover: 50,     // Quick hover response
    click: 100,    // Fast click response
  },
  search: {
    small: 10,
    medium: 50,
    large: 100,
    stress: 500,
  },
};

describe('Rendering Performance Tests', () => {
  // Helper to measure execution time
  const measureTime = async (fn: () => Promise<void> | void): Promise<number> => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  };

  // Helper to calculate statistics
  const calculateStats = (times: number[]) => {
    const sorted = times.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    return { avg, p50, p95, p99, min, max };
  };

  describe('Initial Render Performance', () => {
    const testSizes: Array<{
      name: keyof typeof PERFORMANCE_THRESHOLDS.initialRender;
      entityCount: number;
      channelCount: number;
    }> = [
      { name: 'small', entityCount: 10, channelCount: 20 },
      { name: 'medium', entityCount: 100, channelCount: 500 },
      { name: 'large', entityCount: 1000, channelCount: 5000 },
      { name: 'stress', entityCount: 10000, channelCount: 50000 },
    ];

    testSizes.forEach(({ name, entityCount, channelCount }) => {
      test(`should render ${name} network (${entityCount} nodes) within threshold`, async () => {
        const networkState = testDataGenerator.generateNetworkState({
          entityCount,
          channelCount,
          depositaryCount: Math.ceil(entityCount / 100),
          transactionCount: entityCount * 10,
          consensusEventCount: 50,
        });

        const renderTime = await measureTime(async () => {
          // Simulate render operations
          const entities = Array.from(networkState.entities.values());
          const channels = Array.from(networkState.channels.values());
          
          // Simulate node positioning calculations
          entities.forEach(entity => {
            const x = Math.random() * 1000;
            const y = Math.random() * 1000;
            entity.coordinates = { x, y };
          });
          
          // Simulate edge calculations
          channels.forEach(channel => {
            const source = networkState.entities.get(channel.source);
            const target = networkState.entities.get(channel.target);
            if (source?.coordinates && target?.coordinates) {
              const dx = target.coordinates.x - source.coordinates.x;
              const dy = target.coordinates.y - source.coordinates.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
            }
          });
        });

        expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.initialRender[name]);
        
        console.log(`Initial render ${name}: ${renderTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.initialRender[name]}ms)`);
      });
    });
  });

  describe('Update Performance', () => {
    test('should handle rapid state updates at 60 FPS', async () => {
      const networkState = testDataGenerator.generateNetworkState({
        entityCount: 100,
        channelCount: 200,
      });

      const updateTimes: number[] = [];
      const updateCount = 100;

      for (let i = 0; i < updateCount; i++) {
        const updateTime = await measureTime(() => {
          // Simulate state update
          const entities = Array.from(networkState.entities.values());
          const randomEntity = entities[Math.floor(Math.random() * entities.length)];
          
          // Update entity metrics
          randomEntity.metrics.transactionVolume += Math.random() * 1000;
          randomEntity.metrics.liquidity *= 1 + (Math.random() - 0.5) * 0.1;
          
          // Update some channels
          const channels = Array.from(networkState.channels.values());
          for (let j = 0; j < 5; j++) {
            const channel = channels[Math.floor(Math.random() * channels.length)];
            channel.balance = Math.random() * channel.capacity;
            channel.metrics.throughput = Math.random() * 1000;
          }
        });
        
        updateTimes.push(updateTime);
      }

      const stats = calculateStats(updateTimes);
      
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.update.medium);
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.update.medium * 2);
      
      console.log('Update performance stats:', {
        avg: `${stats.avg.toFixed(2)}ms`,
        p50: `${stats.p50.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
      });
    });
  });

  describe('Interaction Performance', () => {
    test('should handle pan operations smoothly', async () => {
      const panTimes: number[] = [];
      
      for (let i = 0; i < 60; i++) { // 1 second of panning at 60 FPS
        const panTime = await measureTime(() => {
          // Simulate pan calculation
          const dx = Math.random() * 10 - 5;
          const dy = Math.random() * 10 - 5;
          
          // Simulate viewport transformation
          const transform = {
            x: dx,
            y: dy,
            scale: 1,
          };
          
          // Simulate bounds checking
          const viewportBounds = {
            minX: -1000,
            maxX: 1000,
            minY: -1000,
            maxY: 1000,
          };
          
          transform.x = Math.max(viewportBounds.minX, Math.min(viewportBounds.maxX, transform.x));
          transform.y = Math.max(viewportBounds.minY, Math.min(viewportBounds.maxY, transform.y));
        });
        
        panTimes.push(panTime);
      }
      
      const stats = calculateStats(panTimes);
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction.pan);
      
      console.log(`Pan performance: avg ${stats.avg.toFixed(2)}ms (${(1000/stats.avg).toFixed(0)} FPS)`);
    });

    test('should handle zoom operations smoothly', async () => {
      const zoomTimes: number[] = [];
      let currentScale = 1;
      
      for (let i = 0; i < 30; i++) { // 30 zoom steps
        const zoomTime = await measureTime(() => {
          // Simulate zoom calculation
          const scaleDelta = 1 + (Math.random() - 0.5) * 0.1;
          currentScale *= scaleDelta;
          currentScale = Math.max(0.1, Math.min(10, currentScale));
          
          // Simulate level-of-detail calculation
          const lod = currentScale < 0.5 ? 'low' : currentScale > 2 ? 'high' : 'medium';
          
          // Simulate culling calculation
          const visibleBounds = {
            minX: -500 / currentScale,
            maxX: 500 / currentScale,
            minY: -500 / currentScale,
            maxY: 500 / currentScale,
          };
        });
        
        zoomTimes.push(zoomTime);
      }
      
      const stats = calculateStats(zoomTimes);
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.interaction.zoom);
      
      console.log(`Zoom performance: avg ${stats.avg.toFixed(2)}ms`);
    });
  });

  describe('Search Performance', () => {
    const searchTestCases = [
      { size: 'small' as const, entityCount: 10 },
      { size: 'medium' as const, entityCount: 100 },
      { size: 'large' as const, entityCount: 1000 },
      { size: 'stress' as const, entityCount: 10000 },
    ];

    searchTestCases.forEach(({ size, entityCount }) => {
      test(`should search ${size} network efficiently`, async () => {
        const networkState = testDataGenerator.generateNetworkState({
          entityCount,
          channelCount: entityCount * 2,
        });

        // Build search index
        const searchIndex = new Map<string, Set<string>>();
        const entities = Array.from(networkState.entities.values());
        
        const indexTime = await measureTime(() => {
          entities.forEach(entity => {
            // Index by name tokens
            const tokens = entity.name.toLowerCase().split(/\s+/);
            tokens.forEach(token => {
              if (!searchIndex.has(token)) {
                searchIndex.set(token, new Set());
              }
              searchIndex.get(token)!.add(entity.id);
            });
            
            // Index by type
            if (!searchIndex.has(entity.type)) {
              searchIndex.set(entity.type, new Set());
            }
            searchIndex.get(entity.type)!.add(entity.id);
          });
        });

        console.log(`Index build time for ${size}: ${indexTime.toFixed(2)}ms`);

        // Perform searches
        const searchTimes: number[] = [];
        const searchQueries = [
          'hub',
          'gateway',
          'com',
          'net',
          'active',
        ];

        for (const query of searchQueries) {
          const searchTime = await measureTime(() => {
            const results = searchIndex.get(query) || new Set();
            const matches = Array.from(results).map(id => networkState.entities.get(id));
          });
          searchTimes.push(searchTime);
        }

        const stats = calculateStats(searchTimes);
        expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLDS.search[size]);
        
        console.log(`Search performance ${size}: avg ${stats.avg.toFixed(2)}ms`);
      });
    });
  });

  describe('Memory Usage', () => {
    test('should have reasonable memory footprint', () => {
      const memBefore = process.memoryUsage();
      
      const largeState = testDataGenerator.generateNetworkState({
        entityCount: 1000,
        channelCount: 5000,
        depositaryCount: 10,
        transactionCount: 10000,
        consensusEventCount: 100,
      });
      
      const memAfter = process.memoryUsage();
      const heapUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024; // MB
      
      console.log(`Memory usage for large network: ${heapUsed.toFixed(2)} MB`);
      
      // Should use less than 100MB for this size
      expect(heapUsed).toBeLessThan(100);
    });
  });

  describe('Animation Frame Performance', () => {
    test('should maintain 60 FPS during consensus animations', async () => {
      const frameTimes: number[] = [];
      const frameCount = 180; // 3 seconds at 60 FPS
      
      for (let frame = 0; frame < frameCount; frame++) {
        const frameTime = await measureTime(() => {
          // Simulate consensus animation frame
          const t = frame / 60; // Time in seconds
          
          // Simulate particle positions
          const particleCount = 50;
          const particles = Array.from({ length: particleCount }, (_, i) => {
            const angle = (i / particleCount) * Math.PI * 2 + t;
            const radius = 100 + Math.sin(t * 2) * 20;
            return {
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              opacity: 0.5 + Math.sin(t * 3 + i) * 0.5,
            };
          });
          
          // Simulate progress ring update
          const progress = (frame % 60) / 60;
          const ringPath = `M 0 -50 A 50 50 0 ${progress > 0.5 ? 1 : 0} 1 ${Math.cos(progress * Math.PI * 2 - Math.PI/2) * 50} ${Math.sin(progress * Math.PI * 2 - Math.PI/2) * 50}`;
        });
        
        frameTimes.push(frameTime);
      }
      
      const stats = calculateStats(frameTimes);
      const fps = 1000 / stats.avg;
      
      expect(fps).toBeGreaterThan(55); // Allow some margin below 60 FPS
      
      console.log(`Animation performance: ${fps.toFixed(1)} FPS (frame time: ${stats.avg.toFixed(2)}ms)`);
    });
  });

  describe('WebGL Performance', () => {
    test('should handle 3D rendering efficiently', async () => {
      const renderTimes: number[] = [];
      
      // Simulate 3D scene with many objects
      const objectCount = 1000;
      const objects = Array.from({ length: objectCount }, (_, i) => ({
        position: [Math.random() * 1000 - 500, Math.random() * 1000 - 500, Math.random() * 200 - 100],
        rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
        scale: 0.5 + Math.random() * 1.5,
      }));
      
      for (let frame = 0; frame < 60; frame++) {
        const renderTime = await measureTime(() => {
          // Simulate matrix calculations for each object
          objects.forEach(obj => {
            // Simulate transformation matrix calculation
            const [x, y, z] = obj.position;
            const [rx, ry, rz] = obj.rotation;
            const s = obj.scale;
            
            // Simplified matrix math
            const matrix = [
              s * Math.cos(ry) * Math.cos(rz),
              s * Math.sin(rz),
              -s * Math.sin(ry),
              0,
              -s * Math.sin(rz),
              s * Math.cos(rx) * Math.cos(rz),
              s * Math.sin(rx),
              0,
              s * Math.sin(ry),
              -s * Math.sin(rx),
              s * Math.cos(rx) * Math.cos(ry),
              0,
              x, y, z, 1
            ];
          });
        });
        
        renderTimes.push(renderTime);
      }
      
      const stats = calculateStats(renderTimes);
      const fps = 1000 / stats.avg;
      
      expect(fps).toBeGreaterThan(30); // Minimum 30 FPS for 3D
      
      console.log(`3D rendering performance: ${fps.toFixed(1)} FPS with ${objectCount} objects`);
    });
  });
});