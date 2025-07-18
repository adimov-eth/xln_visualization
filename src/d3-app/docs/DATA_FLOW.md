# XLN Data Flow Architecture

## Overview

The XLN visualization system manages complex data flows from multiple sources (WebSocket, GraphQL, REST) through efficient processing pipelines to render 10,000+ nodes in real-time. This document details the complete data flow architecture.

## Data Flow Diagram

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   XLN Network       │     │  Historical Data    │     │  Configuration      │
│   (Real-time)       │     │  (TimescaleDB)      │     │  (Config Service)   │
└──────────┬──────────┘     └──────────┬──────────┘     └──────────┬──────────┘
           │                           │                            │
           ▼                           ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Data Ingestion Layer                              │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│  WebSocket Handler  │  GraphQL Resolver   │     REST Controller             │
│  • Delta streams    │  • Complex queries  │     • Bulk operations           │
│  • Event streams    │  • Subscriptions     │     • File imports             │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Processing Pipeline                            │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Validation        │   Transformation    │      Enrichment                 │
│   • Schema check    │   • Normalization   │      • Compute derived          │
│   • Bounds check    │   • Type conversion │      • Add metadata             │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            State Management                                  │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Primary Store     │   Derived State     │      Cache Layer                │
│   • Network state   │   • Filtered data   │      • Query results            │
│   • UI state        │   • Computed props  │      • Render cache             │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Rendering Pipeline                                │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Spatial Index     │   LOD Calculator    │      Render Queue               │
│   • QuadTree        │   • Distance-based  │      • Priority ordering        │
│   • Frustum cull    │   • Size-based      │      • Batch optimization       │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```

## Real-time Data Flow

### WebSocket Data Pipeline

```typescript
interface WebSocketPipeline {
  // 1. Connection Management
  connection: {
    url: string;
    protocols: string[];
    reconnectStrategy: ExponentialBackoff;
    heartbeat: { interval: 30000; timeout: 5000 };
  };
  
  // 2. Message Processing
  processing: {
    deserializer: MessageDeserializer;
    validator: MessageValidator;
    router: MessageRouter;
    batcher: MessageBatcher;
  };
  
  // 3. State Updates
  stateUpdater: {
    deltaApplier: DeltaApplier;
    conflictResolver: ConflictResolver;
    broadcaster: UpdateBroadcaster;
  };
}
```

### Message Flow Implementation

```typescript
class WebSocketDataFlow {
  private messageQueue: PriorityQueue<NetworkMessage>;
  private batchProcessor: BatchProcessor;
  private stateManager: StateManager;
  
  constructor() {
    this.initializeWebSocket();
    this.startProcessingLoop();
  }
  
  private initializeWebSocket() {
    this.ws = new WebSocket(WS_URL, ['xln-protocol-v1']);
    
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    // Implement reconnection
    this.ws.onclose = () => {
      this.reconnectWithBackoff();
    };
  }
  
  private handleMessage(data: string | ArrayBuffer) {
    // 1. Deserialize
    const message = this.deserializeMessage(data);
    
    // 2. Validate
    if (!this.validateMessage(message)) {
      console.error('Invalid message:', message);
      return;
    }
    
    // 3. Prioritize
    const priority = this.calculatePriority(message);
    this.messageQueue.enqueue(message, priority);
  }
  
  private async startProcessingLoop() {
    // Process messages in batches per frame
    const processFrame = () => {
      const startTime = performance.now();
      const messages: NetworkMessage[] = [];
      
      // Collect messages for this frame
      while (
        !this.messageQueue.isEmpty() && 
        performance.now() - startTime < FRAME_BUDGET
      ) {
        messages.push(this.messageQueue.dequeue()!);
      }
      
      if (messages.length > 0) {
        this.batchProcessor.process(messages);
      }
      
      requestAnimationFrame(processFrame);
    };
    
    requestAnimationFrame(processFrame);
  }
}
```

### Delta Compression Protocol

```typescript
interface DeltaProtocol {
  version: number;
  compression: 'gzip' | 'brotli' | 'none';
  format: 'binary' | 'json';
}

class DeltaProcessor {
  private baseState: NetworkState;
  private deltaBuffer: DeltaBuffer;
  
  applyDelta(delta: CompressedDelta): NetworkState {
    // 1. Decompress if needed
    const decompressed = this.decompress(delta);
    
    // 2. Apply changes
    const updates = this.parseDelta(decompressed);
    
    // 3. Update state efficiently
    return this.mergeUpdates(this.baseState, updates);
  }
  
  private decompress(delta: CompressedDelta): Delta {
    switch (delta.compression) {
      case 'gzip':
        return pako.ungzip(delta.data);
      case 'brotli':
        return brotli.decompress(delta.data);
      default:
        return delta.data;
    }
  }
  
  private parseDelta(delta: Delta): StateUpdates {
    return {
      added: delta.added.map(this.parseNode),
      modified: delta.modified.map(this.parseNodeUpdate),
      removed: delta.removed,
      timestamp: delta.timestamp
    };
  }
}
```

## GraphQL Data Flow

### Query Optimization

```typescript
class GraphQLDataFlow {
  private client: ApolloClient<any>;
  private queryCache: QueryCache;
  private subscriptionManager: SubscriptionManager;
  
  // Efficient batch query
  async fetchNetworkSlice(viewport: Viewport): Promise<NetworkSlice> {
    const query = gql`
      query NetworkSlice($bounds: BoundsInput!, $limit: Int!) {
        networkSlice(bounds: $bounds, limit: $limit) {
          nodes {
            id
            position { x y z }
            type
            metadata
            ... on Entity {
              consensusHealth
              channelCount
            }
          }
          edges {
            id
            source
            target
            capacity
            utilization
          }
          metadata {
            totalNodes
            totalEdges
            timestamp
          }
        }
      }
    `;
    
    // Check cache first
    const cached = this.queryCache.get(viewport);
    if (cached && cached.age < CACHE_TTL) {
      return cached.data;
    }
    
    // Execute query with automatic batching
    const result = await this.client.query({
      query,
      variables: {
        bounds: this.viewportToBounds(viewport),
        limit: MAX_VIEWPORT_NODES
      }
    });
    
    // Cache result
    this.queryCache.set(viewport, result.data.networkSlice);
    
    return result.data.networkSlice;
  }
  
  // Subscription for real-time updates
  subscribeToUpdates(viewport: Viewport): Observable<NetworkUpdate> {
    const subscription = gql`
      subscription NetworkUpdates($bounds: BoundsInput!) {
        networkUpdates(bounds: $bounds) {
          type
          payload {
            ... on NodeUpdate {
              id
              position { x y z }
              metadata
            }
            ... on EdgeUpdate {
              id
              capacity
              utilization
            }
          }
          timestamp
        }
      }
    `;
    
    return this.client.subscribe({
      query: subscription,
      variables: {
        bounds: this.viewportToBounds(viewport)
      }
    }).pipe(
      // Transform and batch updates
      bufferTime(16), // Batch per frame
      filter(updates => updates.length > 0),
      map(updates => this.mergeUpdates(updates))
    );
  }
}
```

### Data Fetching Strategies

```typescript
class DataFetchingStrategy {
  // Progressive loading based on viewport
  async loadProgressive(viewport: Viewport): Promise<void> {
    // 1. Load visible nodes first
    const visible = await this.loadVisibleNodes(viewport);
    this.updateState(visible);
    
    // 2. Load one level beyond viewport
    const extended = await this.loadExtendedNodes(viewport, 1.5);
    this.updateState(extended);
    
    // 3. Background load remaining data
    this.loadRemainingInBackground(viewport);
  }
  
  // Predictive fetching based on camera movement
  predictiveFetch(camera: Camera, velocity: Vector3): void {
    const predictedPosition = camera.position.clone()
      .add(velocity.multiplyScalar(PREDICTION_TIME));
    
    const predictedViewport = this.calculateViewport(
      predictedPosition,
      camera
    );
    
    // Prefetch data for predicted viewport
    this.prefetchQueue.add(predictedViewport);
  }
  
  // Smart caching with eviction
  private cacheManager = new CacheManager({
    maxSize: 100 * 1024 * 1024, // 100MB
    evictionPolicy: 'lru',
    ttl: 5 * 60 * 1000 // 5 minutes
  });
}
```

## State Synchronization

### Multi-Source Synchronization

```typescript
class StateSynchronizer {
  private sources: Map<string, DataSource> = new Map();
  private mergeStrategy: MergeStrategy;
  private conflictResolver: ConflictResolver;
  
  // Register data sources
  registerSource(id: string, source: DataSource) {
    this.sources.set(id, source);
    
    // Subscribe to updates
    source.updates$.subscribe(update => {
      this.handleUpdate(id, update);
    });
  }
  
  private handleUpdate(sourceId: string, update: StateUpdate) {
    // 1. Check for conflicts
    const conflicts = this.detectConflicts(update);
    
    if (conflicts.length > 0) {
      // 2. Resolve conflicts
      const resolved = this.conflictResolver.resolve(
        conflicts,
        this.mergeStrategy
      );
      update = resolved;
    }
    
    // 3. Apply update
    this.applyUpdate(update);
    
    // 4. Broadcast to other sources
    this.broadcastUpdate(sourceId, update);
  }
  
  private detectConflicts(update: StateUpdate): Conflict[] {
    const conflicts: Conflict[] = [];
    
    // Check each modified entity
    for (const entity of update.entities) {
      const existing = this.getEntity(entity.id);
      if (existing && existing.version > entity.version) {
        conflicts.push({
          type: 'version',
          entityId: entity.id,
          existing,
          incoming: entity
        });
      }
    }
    
    return conflicts;
  }
}
```

### Optimistic Updates

```typescript
class OptimisticUpdateManager {
  private pendingUpdates: Map<string, OptimisticUpdate> = new Map();
  private rollbackStack: RollbackEntry[] = [];
  
  applyOptimistic(update: StateUpdate): string {
    const updateId = generateId();
    
    // 1. Store original state for rollback
    const original = this.captureState(update.affects);
    this.rollbackStack.push({ updateId, original });
    
    // 2. Apply update immediately
    this.stateManager.apply(update);
    
    // 3. Track pending confirmation
    this.pendingUpdates.set(updateId, {
      update,
      timestamp: Date.now(),
      retries: 0
    });
    
    // 4. Send to server
    this.sendToServer(updateId, update);
    
    return updateId;
  }
  
  confirmUpdate(updateId: string, serverState: any) {
    const pending = this.pendingUpdates.get(updateId);
    if (!pending) return;
    
    // Remove from pending
    this.pendingUpdates.delete(updateId);
    
    // Reconcile with server state
    this.reconcileState(serverState);
  }
  
  rollbackUpdate(updateId: string) {
    const rollback = this.rollbackStack.find(r => r.updateId === updateId);
    if (!rollback) return;
    
    // Restore original state
    this.stateManager.restore(rollback.original);
    
    // Remove from tracking
    this.pendingUpdates.delete(updateId);
    this.rollbackStack = this.rollbackStack.filter(
      r => r.updateId !== updateId
    );
  }
}
```

## Performance Optimization

### Data Streaming Pipeline

```typescript
class StreamingPipeline {
  private pipeline: Transform[];
  
  constructor() {
    this.pipeline = [
      new DecompressionTransform(),
      new ValidationTransform(),
      new DeduplicationTransform(),
      new BatchingTransform({ size: 100, timeout: 16 }),
      new EnrichmentTransform(),
      new IndexingTransform()
    ];
  }
  
  async process(stream: ReadableStream): Promise<void> {
    let current = stream;
    
    // Chain transforms
    for (const transform of this.pipeline) {
      current = current.pipeThrough(transform);
    }
    
    // Final consumer
    const reader = current.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Update state with processed batch
      this.stateManager.batchUpdate(value);
    }
  }
}

class BatchingTransform extends TransformStream {
  constructor(options: { size: number; timeout: number }) {
    const batch: any[] = [];
    let timer: number;
    
    super({
      transform(chunk, controller) {
        batch.push(chunk);
        
        // Clear existing timer
        clearTimeout(timer);
        
        // Flush if batch is full
        if (batch.length >= options.size) {
          controller.enqueue([...batch]);
          batch.length = 0;
        } else {
          // Set timeout for partial batch
          timer = setTimeout(() => {
            if (batch.length > 0) {
              controller.enqueue([...batch]);
              batch.length = 0;
            }
          }, options.timeout);
        }
      },
      
      flush(controller) {
        // Flush remaining items
        if (batch.length > 0) {
          controller.enqueue([...batch]);
        }
      }
    });
  }
}
```

### Memory-Efficient Updates

```typescript
class MemoryEfficientUpdater {
  private nodePool: ObjectPool<NetworkNode>;
  private edgePool: ObjectPool<NetworkEdge>;
  private dirtyTracker: DirtyTracker;
  
  updateNetwork(delta: NetworkDelta) {
    // 1. Reuse objects from pool
    const updatedNodes = delta.nodes.map(nodeData => {
      const node = this.nodePool.get();
      Object.assign(node, nodeData);
      return node;
    });
    
    // 2. Track only changed properties
    updatedNodes.forEach(node => {
      const changes = this.dirtyTracker.track(node);
      if (changes.length > 0) {
        this.scheduleUpdate(node.id, changes);
      }
    });
    
    // 3. Return unused objects to pool
    this.cleanupUnusedObjects();
  }
  
  private scheduleUpdate(nodeId: string, changes: string[]) {
    // Batch updates by property type
    changes.forEach(prop => {
      this.updateQueue.add({
        type: 'node',
        id: nodeId,
        property: prop,
        value: this.getNodeProperty(nodeId, prop)
      });
    });
  }
}
```

## Error Handling and Recovery

### Resilient Data Flow

```typescript
class ResilientDataFlow {
  private errorRecovery: ErrorRecoveryStrategy;
  private fallbackSources: DataSource[];
  
  async fetchWithFallback(query: Query): Promise<Result> {
    try {
      // Try primary source
      return await this.primarySource.fetch(query);
    } catch (error) {
      console.error('Primary source failed:', error);
      
      // Try fallback sources
      for (const source of this.fallbackSources) {
        try {
          const result = await source.fetch(query);
          
          // Validate fallback data
          if (this.validateFallbackData(result)) {
            return result;
          }
        } catch (fallbackError) {
          console.error(`Fallback ${source.id} failed:`, fallbackError);
        }
      }
      
      // All sources failed - use cached or default
      return this.getCachedOrDefault(query);
    }
  }
  
  private validateFallbackData(data: any): boolean {
    // Check data freshness
    if (data.timestamp < Date.now() - MAX_STALE_AGE) {
      return false;
    }
    
    // Validate structure
    return this.schemaValidator.validate(data);
  }
}
```

### Circuit Breaker Pattern

```typescript
class DataSourceCircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= FAILURE_THRESHOLD) {
      this.state = 'open';
      console.error('Circuit breaker opened due to failures');
      
      // Schedule reset attempt
      setTimeout(() => {
        this.state = 'half-open';
      }, RESET_TIMEOUT);
    }
  }
}
```

## Data Flow Monitoring

### Metrics Collection

```typescript
class DataFlowMetrics {
  private metrics: {
    throughput: MovingAverage;
    latency: Histogram;
    errors: Counter;
    backpressure: Gauge;
  };
  
  recordMessage(message: NetworkMessage) {
    const now = Date.now();
    
    // Throughput
    this.metrics.throughput.add(1);
    
    // Latency
    const latency = now - message.timestamp;
    this.metrics.latency.record(latency);
    
    // Backpressure
    const queueDepth = this.messageQueue.size();
    this.metrics.backpressure.set(queueDepth);
    
    // Alert on anomalies
    if (latency > LATENCY_THRESHOLD) {
      this.alertManager.trigger('high-latency', { latency, message });
    }
  }
  
  getSnapshot(): MetricsSnapshot {
    return {
      throughput: this.metrics.throughput.getRate(),
      latency: {
        p50: this.metrics.latency.percentile(0.5),
        p90: this.metrics.latency.percentile(0.9),
        p99: this.metrics.latency.percentile(0.99)
      },
      errors: this.metrics.errors.value(),
      backpressure: this.metrics.backpressure.value()
    };
  }
}
```

## Best Practices

1. **Stream Processing**: Process data as streams rather than loading entire datasets
2. **Backpressure Handling**: Implement flow control to prevent overwhelming consumers
3. **Caching Strategy**: Cache at multiple levels (query, computation, render)
4. **Error Boundaries**: Isolate failures to prevent cascade effects
5. **Monitoring**: Track data flow metrics to identify bottlenecks
6. **Graceful Degradation**: Provide fallback visualizations with partial data

This architecture ensures efficient, reliable data flow from sources to visualization while maintaining performance targets.