# XLN State Management Strategy

## Overview

The XLN visualization requires a sophisticated state management approach to handle:
- **10,000+ network nodes** with real-time updates
- **Multiple data sources** (WebSocket, GraphQL, REST)
- **Complex UI state** (selections, filters, viewport)
- **Performance-critical updates** at 60 FPS
- **Time-travel capabilities** for historical analysis

## State Architecture

### Global State Structure

```typescript
interface XLNGlobalState {
  // Network Data State
  network: NetworkState;
  
  // UI State
  ui: UIState;
  
  // Session State
  session: SessionState;
  
  // Performance Metrics
  metrics: MetricsState;
  
  // Historical Data
  timeline: TimelineState;
  
  // Configuration
  config: ConfigState;
}
```

### Detailed State Definitions

```typescript
interface NetworkState {
  // Core graph data
  nodes: {
    byId: Map<string, NetworkNode>;
    allIds: string[];
    spatial: QuadTree<NetworkNode>;
    dirty: Set<string>;
  };
  
  edges: {
    byId: Map<string, NetworkEdge>;
    allIds: string[];
    bySource: Map<string, string[]>;
    byTarget: Map<string, string[]>;
    dirty: Set<string>;
  };
  
  // Layer-specific data
  layers: {
    blockchain: BlockchainLayerState;
    depositary: DepositaryLayerState;
    entity: EntityLayerState;
    channel: ChannelLayerState;
    transaction: TransactionLayerState;
  };
  
  // Network metadata
  metadata: {
    lastUpdate: number;
    totalValue: bigint;
    activeEntities: number;
    consensusHealth: number;
  };
}

interface UIState {
  // Viewport
  viewport: {
    camera: {
      position: Vector3;
      rotation: Euler;
      zoom: number;
    };
    bounds: BoundingBox;
    visibleNodes: Set<string>;
    visibleEdges: Set<string>;
  };
  
  // Selection
  selection: {
    nodes: Set<string>;
    edges: Set<string>;
    mode: 'single' | 'multi' | 'box';
    hoveredNode: string | null;
    hoveredEdge: string | null;
  };
  
  // Panels
  panels: {
    inspector: {
      open: boolean;
      type: 'node' | 'edge' | null;
      id: string | null;
      tab: string;
    };
    metrics: {
      open: boolean;
      timeRange: TimeRange;
      selectedMetrics: string[];
    };
    layers: {
      open: boolean;
      visibility: Record<LayerType, boolean>;
      opacity: Record<LayerType, number>;
    };
  };
  
  // Filters
  filters: {
    active: Filter[];
    saved: SavedFilter[];
    quickFilters: QuickFilter[];
  };
  
  // Search
  search: {
    query: string;
    results: SearchResults | null;
    history: string[];
    loading: boolean;
  };
}

interface SessionState {
  // Connection
  connection: {
    websocket: {
      status: 'connected' | 'connecting' | 'disconnected' | 'error';
      url: string;
      reconnectAttempts: number;
      lastPing: number;
      latency: number;
    };
    graphql: {
      status: 'ready' | 'loading' | 'error';
      endpoint: string;
    };
  };
  
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    performanceMode: 'quality' | 'balanced' | 'performance';
    animations: boolean;
    notifications: boolean;
  };
  
  // Feature flags
  features: {
    experimental3D: boolean;
    advancedFilters: boolean;
    collaborativeMode: boolean;
  };
}

interface MetricsState {
  // Real-time metrics
  realtime: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    memory: {
      used: number;
      limit: number;
    };
  };
  
  // Network metrics
  network: {
    messageRate: number;
    dataRate: number;
    queuedUpdates: number;
    droppedFrames: number;
  };
  
  // Historical metrics
  history: {
    fps: CircularBuffer<number>;
    latency: CircularBuffer<number>;
    memory: CircularBuffer<number>;
  };
}

interface TimelineState {
  // Playback control
  playback: {
    mode: 'live' | 'replay' | 'paused';
    currentTime: number;
    playbackSpeed: number;
    loop: boolean;
  };
  
  // Snapshots
  snapshots: {
    available: SnapshotMetadata[];
    loaded: Map<number, NetworkSnapshot>;
    loading: Set<number>;
  };
  
  // Time range
  range: {
    start: number;
    end: number;
    visibleStart: number;
    visibleEnd: number;
  };
}
```

## State Management Implementation

### Store Architecture

```typescript
// Zustand store with immer for immutability
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Main store
export const useXLNStore = create<XLNGlobalState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        network: createInitialNetworkState(),
        ui: createInitialUIState(),
        session: createInitialSessionState(),
        metrics: createInitialMetricsState(),
        timeline: createInitialTimelineState(),
        config: createInitialConfigState(),
        
        // Actions are defined separately
      }))
    )
  )
);
```

### Slice Pattern for Modularity

```typescript
// Network slice
export const createNetworkSlice = (set: SetState, get: GetState) => ({
  // Batch node updates for performance
  updateNodes: (updates: NodeUpdate[]) => {
    set((state) => {
      const { nodes } = state.network;
      
      // Batch updates in a single transaction
      updates.forEach((update) => {
        const existing = nodes.byId.get(update.id);
        if (existing) {
          // Merge update with existing
          nodes.byId.set(update.id, {
            ...existing,
            ...update,
            lastUpdate: Date.now()
          });
          nodes.dirty.add(update.id);
        }
      });
      
      // Update spatial index in Web Worker
      requestIdleCallback(() => {
        updateSpatialIndex(nodes);
      });
    });
  },
  
  // Efficient edge updates
  updateEdges: (updates: EdgeUpdate[]) => {
    set((state) => {
      const { edges } = state.network;
      
      updates.forEach((update) => {
        edges.byId.set(update.id, update);
        edges.dirty.add(update.id);
        
        // Update indices
        if (!edges.bySource.has(update.source)) {
          edges.bySource.set(update.source, []);
        }
        edges.bySource.get(update.source)!.push(update.id);
      });
    });
  },
  
  // Clear dirty flags after render
  clearDirtyFlags: () => {
    set((state) => {
      state.network.nodes.dirty.clear();
      state.network.edges.dirty.clear();
    });
  }
});

// UI slice
export const createUISlice = (set: SetState, get: GetState) => ({
  // Viewport updates with debouncing
  updateViewport: debounce((viewport: ViewportUpdate) => {
    set((state) => {
      Object.assign(state.ui.viewport, viewport);
      
      // Trigger visibility recalculation
      requestAnimationFrame(() => {
        const visibleNodes = calculateVisibleNodes(
          state.network.nodes.spatial,
          viewport.bounds
        );
        state.ui.viewport.visibleNodes = visibleNodes;
      });
    });
  }, 16), // 60 FPS
  
  // Selection management
  selectNodes: (nodeIds: string[], mode: SelectionMode = 'single') => {
    set((state) => {
      if (mode === 'single') {
        state.ui.selection.nodes.clear();
      }
      nodeIds.forEach(id => state.ui.selection.nodes.add(id));
      state.ui.selection.mode = mode;
    });
  },
  
  // Filter application
  applyFilter: (filter: Filter) => {
    set((state) => {
      state.ui.filters.active.push(filter);
      
      // Trigger filter processing in Web Worker
      processFiltersAsync(
        state.network.nodes.byId,
        state.ui.filters.active
      ).then(results => {
        get().setFilteredNodes(results);
      });
    });
  }
});
```

### Performance Optimizations

#### 1. Selective Subscriptions

```typescript
// Subscribe only to specific state changes
const visibleNodes = useXLNStore(
  (state) => state.ui.viewport.visibleNodes,
  shallow // Shallow comparison for Set
);

// Multiple selections with optimization
const { nodes, edges } = useXLNStore(
  (state) => ({
    nodes: state.network.nodes.byId,
    edges: state.network.edges.byId
  }),
  shallow
);
```

#### 2. Memoized Selectors

```typescript
// Complex derived state with memoization
const selectedNodeDetails = useXLNStore(
  createSelector(
    [(state) => state.ui.selection.nodes, (state) => state.network.nodes.byId],
    (selectedIds, nodesById) => {
      return Array.from(selectedIds)
        .map(id => nodesById.get(id))
        .filter(Boolean);
    }
  )
);

// Computed metrics
const networkStats = useXLNStore(
  createSelector(
    [(state) => state.network],
    (network) => ({
      totalNodes: network.nodes.allIds.length,
      totalEdges: network.edges.allIds.length,
      activeNodes: network.nodes.byId.values()
        .filter(n => n.status === 'active').length
    })
  )
);
```

#### 3. Transient Updates

```typescript
// Updates that don't trigger re-renders
const useTransientUpdates = () => {
  const storeRef = useRef(useXLNStore);
  
  const updateMousePosition = useCallback((x: number, y: number) => {
    // Direct state mutation for performance
    storeRef.current.setState((state) => {
      state.ui.mouse = { x, y };
    }, false); // Don't notify subscribers
  }, []);
  
  return { updateMousePosition };
};
```

### State Persistence

```typescript
// Persist configuration and preferences
const persistConfig = {
  name: 'xln-storage',
  version: 1,
  
  partialize: (state: XLNGlobalState) => ({
    // Only persist specific slices
    session: {
      preferences: state.session.preferences,
      features: state.session.features
    },
    ui: {
      panels: state.ui.panels,
      filters: {
        saved: state.ui.filters.saved
      }
    },
    config: state.config
  }),
  
  storage: createJSONStorage(() => localStorage),
  
  migrate: (persistedState: any, version: number) => {
    // Handle version migrations
    if (version === 0) {
      // Migration logic
    }
    return persistedState;
  }
};

export const useXLNStore = create<XLNGlobalState>()(
  persist(
    devtools(
      subscribeWithSelector(
        immer((set, get) => ({
          // State definition
        }))
      )
    ),
    persistConfig
  )
);
```

### WebSocket Integration

```typescript
class WebSocketStateManager {
  private store: StoreApi<XLNGlobalState>;
  private socket: WebSocket;
  private messageBuffer: NetworkUpdate[] = [];
  private flushTimer: number;
  
  constructor(store: StoreApi<XLNGlobalState>) {
    this.store = store;
    this.initializeWebSocket();
  }
  
  private initializeWebSocket() {
    this.socket = new WebSocket(WS_URL);
    
    this.socket.onmessage = (event) => {
      const update = JSON.parse(event.data) as NetworkUpdate;
      this.bufferUpdate(update);
    };
    
    this.socket.onopen = () => {
      this.store.setState((state) => {
        state.session.connection.websocket.status = 'connected';
      });
    };
  }
  
  private bufferUpdate(update: NetworkUpdate) {
    this.messageBuffer.push(update);
    
    // Batch updates per frame
    if (!this.flushTimer) {
      this.flushTimer = requestAnimationFrame(() => {
        this.flushUpdates();
      });
    }
  }
  
  private flushUpdates() {
    if (this.messageBuffer.length === 0) return;
    
    // Process updates in batch
    const updates = this.messageBuffer.splice(0);
    const nodeUpdates = updates.filter(u => u.type === 'node');
    const edgeUpdates = updates.filter(u => u.type === 'edge');
    
    this.store.setState((state) => {
      // Apply node updates
      if (nodeUpdates.length > 0) {
        this.applyNodeUpdates(state, nodeUpdates);
      }
      
      // Apply edge updates
      if (edgeUpdates.length > 0) {
        this.applyEdgeUpdates(state, edgeUpdates);
      }
      
      // Update metadata
      state.network.metadata.lastUpdate = Date.now();
    });
    
    this.flushTimer = null;
  }
}
```

### React Query Integration

```typescript
// Server state management with React Query
const useNetworkSnapshot = (timestamp: number) => {
  return useQuery({
    queryKey: ['snapshot', timestamp],
    queryFn: () => fetchNetworkSnapshot(timestamp),
    staleTime: Infinity, // Snapshots don't change
    cacheTime: 1000 * 60 * 60, // 1 hour
    onSuccess: (snapshot) => {
      // Update timeline state
      useXLNStore.setState((state) => {
        state.timeline.snapshots.loaded.set(timestamp, snapshot);
      });
    }
  });
};

// Mutations with optimistic updates
const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEntity,
    onMutate: async (newEntity) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['entity', newEntity.id]);
      
      // Optimistic update
      useXLNStore.setState((state) => {
        const node = state.network.nodes.byId.get(newEntity.id);
        if (node) {
          Object.assign(node, newEntity);
          state.network.nodes.dirty.add(newEntity.id);
        }
      });
      
      return { previousEntity: node };
    },
    onError: (err, newEntity, context) => {
      // Rollback on error
      if (context?.previousEntity) {
        useXLNStore.setState((state) => {
          state.network.nodes.byId.set(
            newEntity.id,
            context.previousEntity
          );
        });
      }
    }
  });
};
```

### Performance Monitoring

```typescript
// Monitor state update performance
const createPerformanceMiddleware = (config: PerformanceConfig) => {
  return (f: StateCreator<XLNGlobalState>) => (set, get, api) => {
    const performanceSet: typeof set = (partial, replace) => {
      const start = performance.now();
      
      // Wrap the update
      set((state) => {
        const nextState = typeof partial === 'function' 
          ? partial(state) 
          : partial;
        
        // Measure update time
        const updateTime = performance.now() - start;
        
        // Log slow updates
        if (updateTime > config.slowUpdateThreshold) {
          console.warn(`Slow state update: ${updateTime}ms`, {
            partial,
            stateSize: JSON.stringify(state).length
          });
        }
        
        // Update metrics
        if (nextState.metrics) {
          nextState.metrics.realtime.frameTime = updateTime;
        }
        
        return nextState;
      }, replace);
    };
    
    return f(performanceSet, get, api);
  };
};
```

### Time Travel Implementation

```typescript
class TimeTravelController {
  private snapshots: NetworkSnapshot[] = [];
  private currentIndex: number = -1;
  
  captureSnapshot() {
    const state = useXLNStore.getState();
    const snapshot = this.serializeState(state.network);
    
    // Remove future snapshots if we've traveled back
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }
    
    this.snapshots.push(snapshot);
    this.currentIndex++;
    
    // Limit snapshot history
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
      this.currentIndex--;
    }
  }
  
  travelTo(index: number) {
    if (index < 0 || index >= this.snapshots.length) return;
    
    const snapshot = this.snapshots[index];
    this.currentIndex = index;
    
    useXLNStore.setState((state) => {
      state.network = this.deserializeState(snapshot);
      state.timeline.playback.mode = 'replay';
      state.timeline.playback.currentTime = snapshot.timestamp;
    });
  }
  
  private serializeState(network: NetworkState): NetworkSnapshot {
    // Efficient serialization
    return {
      timestamp: Date.now(),
      nodes: Array.from(network.nodes.byId.entries()),
      edges: Array.from(network.edges.byId.entries()),
      metadata: { ...network.metadata }
    };
  }
}
```

## Best Practices

### 1. State Normalization

```typescript
// Normalize relational data
interface NormalizedState {
  entities: {
    nodes: Record<string, Node>;
    edges: Record<string, Edge>;
    channels: Record<string, Channel>;
  };
  relationships: {
    nodeToEdges: Record<string, string[]>;
    channelToNodes: Record<string, [string, string]>;
  };
}
```

### 2. Computed State

```typescript
// Derive state instead of storing
const useComputedState = () => {
  const nodes = useXLNStore(state => state.network.nodes.byId);
  const filters = useXLNStore(state => state.ui.filters.active);
  
  // Compute filtered nodes
  const filteredNodes = useMemo(() => {
    return applyFilters(Array.from(nodes.values()), filters);
  }, [nodes, filters]);
  
  return filteredNodes;
};
```

### 3. Action Composition

```typescript
// Compose complex actions from simple ones
const useComposedActions = () => {
  const { updateNodes, updateEdges } = useXLNStore();
  
  const importNetwork = useCallback(async (file: File) => {
    const data = await parseNetworkFile(file);
    
    // Batch all updates
    batch(() => {
      updateNodes(data.nodes);
      updateEdges(data.edges);
      // Additional updates...
    });
  }, [updateNodes, updateEdges]);
  
  return { importNetwork };
};
```

### 4. Middleware Pipeline

```typescript
// Compose multiple middleware
const store = create<XLNGlobalState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer(
          createPerformanceMiddleware({
            slowUpdateThreshold: 16
          })(
            createValidationMiddleware()(
              createLoggingMiddleware()(
                stateCreator
              )
            )
          )
        )
      )
    )
  )
);
```

## Testing State Management

```typescript
// Test utilities
const createMockStore = (initialState?: Partial<XLNGlobalState>) => {
  return create<XLNGlobalState>()((set, get) => ({
    ...createInitialState(),
    ...initialState,
    // Mock actions
  }));
};

// Example test
describe('Network State', () => {
  it('should handle batch node updates efficiently', () => {
    const store = createMockStore();
    const updates = generateNodeUpdates(1000);
    
    const start = performance.now();
    store.getState().updateNodes(updates);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(16); // Single frame
    expect(store.getState().network.nodes.dirty.size).toBe(1000);
  });
});
```

## Performance Guidelines

1. **Batch Updates**: Always batch related state changes
2. **Use Transient Updates**: For high-frequency updates that don't need renders
3. **Selective Subscriptions**: Subscribe only to needed state slices
4. **Memoize Selectors**: Cache expensive computations
5. **Normalize Data**: Avoid deeply nested structures
6. **Use Web Workers**: Offload heavy computations
7. **Implement Virtualization**: For large lists/grids
8. **Monitor Performance**: Track update times and optimize hotspots

## Migration Strategy

For migrating from Redux or other state management:

```typescript
// Gradual migration approach
const useLegacyBridge = () => {
  const reduxState = useSelector(state => state);
  const zustandState = useXLNStore();
  
  // Sync critical state
  useEffect(() => {
    zustandState.syncFromRedux(reduxState);
  }, [reduxState]);
  
  // Provide unified interface
  return {
    ...reduxState,
    ...zustandState
  };
};
```

This state management architecture provides the foundation for building a performant, scalable visualization system while maintaining developer ergonomics and extensibility.