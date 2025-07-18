# XLN Component Architecture & Patterns

## Component Hierarchy

```
App
├── Providers (Context & State)
│   ├── StoreProvider (Zustand)
│   ├── ThemeProvider
│   ├── WebSocketProvider
│   └── GraphQLProvider
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── NetworkStatus
│   │   ├── SearchBar
│   │   └── UserMenu
│   ├── Sidebar
│   │   ├── LayerPanel
│   │   ├── FilterPanel
│   │   ├── MetricsPanel
│   │   └── SettingsPanel
│   ├── MainCanvas
│   │   ├── NetworkVisualization
│   │   ├── OverlayControls
│   │   └── ContextMenus
│   └── StatusBar
│       ├── PerformanceMonitor
│       ├── ConnectionStatus
│       └── NotificationArea
└── Modals
    ├── SearchModal
    ├── ExportModal
    ├── SettingsModal
    └── HelpModal
```

## Core Component Patterns

### 1. Performance-Optimized Component Pattern

```typescript
// Base pattern for all performance-critical components
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useXLNStore } from '@/store';

interface PerformantComponentProps {
  nodeId: string;
  className?: string;
}

export const PerformantComponent = memo<PerformantComponentProps>(({
  nodeId,
  className
}) => {
  // 1. Selective state subscription
  const node = useXLNStore(
    state => state.network.nodes.byId.get(nodeId),
    shallow
  );
  
  // 2. Stable references
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 3. Memoized computations
  const displayData = useMemo(() => {
    if (!node) return null;
    return {
      label: node.label || node.id,
      status: node.status,
      metrics: calculateNodeMetrics(node)
    };
  }, [node]);
  
  // 4. Stable callbacks
  const handleClick = useCallback(() => {
    useXLNStore.getState().selectNode(nodeId);
  }, [nodeId]);
  
  // 5. Early return for null state
  if (!displayData) return null;
  
  // 6. Minimal re-renders
  return (
    <div 
      ref={containerRef}
      className={className}
      onClick={handleClick}
    >
      {displayData.label}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.nodeId === nextProps.nodeId &&
         prevProps.className === nextProps.className;
});

PerformantComponent.displayName = 'PerformantComponent';
```

### 2. Lazy-Loaded Component Pattern

```typescript
// Pattern for code-splitting heavy components
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy load heavy visualization components
const NetworkVisualization = lazy(() => 
  import('./NetworkVisualization').then(module => ({
    default: module.NetworkVisualization
  }))
);

const MetricsChart = lazy(() => 
  import('./MetricsChart').then(module => ({
    default: module.MetricsChart
  }))
);

export const LazyVisualization = () => {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<LoadingSpinner />}>
        <NetworkVisualization />
      </Suspense>
    </ErrorBoundary>
  );
};

// Preload component when likely to be used
export const preloadVisualization = () => {
  import('./NetworkVisualization');
};
```

### 3. WebGL Integration Pattern

```typescript
// Pattern for integrating WebGL with React
import { useEffect, useRef, useState } from 'react';
import { WebGLRenderer } from '@/rendering/WebGLRenderer';
import { useXLNStore } from '@/store';

interface WebGLComponentProps {
  width: number;
  height: number;
}

export const WebGLComponent: React.FC<WebGLComponentProps> = ({
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const frameRef = useRef<number>();
  
  // Subscribe to render-relevant state
  const renderState = useXLNStore(
    state => ({
      nodes: state.network.nodes,
      edges: state.network.edges,
      viewport: state.ui.viewport
    }),
    shallow
  );
  
  // Initialize WebGL
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new WebGLRenderer(canvasRef.current);
    rendererRef.current = renderer;
    
    // Start render loop
    const animate = () => {
      renderer.render(renderState);
      frameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      renderer.dispose();
    };
  }, []);
  
  // Update renderer on state changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateState(renderState);
    }
  }, [renderState]);
  
  // Handle resize
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.resize(width, height);
    }
  }, [width, height]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  );
};
```

### 4. Virtual Scrolling Pattern

```typescript
// Pattern for rendering large lists efficiently
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemSize: (index: number) => number;
}

export function VirtualList<T>({ 
  items, 
  renderItem,
  getItemSize 
}: VirtualListProps<T>) {
  const Row = memo(({ index, style }: any) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  ));
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          itemCount={items.length}
          itemSize={getItemSize}
          overscanCount={5}
          itemData={items}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}
```

### 5. Search Component Pattern

```typescript
// Advanced search with debouncing and fuzzy matching
import { useState, useCallback, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearch } from '@/hooks/useSearch';

export const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  
  const { results, loading, error } = useSearch(debouncedQuery);
  
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);
  
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    // Apply fuzzy matching
    return results
      .map(result => ({
        ...result,
        score: calculateFuzzyScore(query, result)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Limit results
  }, [results, query]);
  
  return (
    <div className="search-component">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search nodes, edges, or entities..."
        className="search-input"
      />
      
      {loading && <LoadingIndicator />}
      {error && <ErrorMessage error={error} />}
      
      {filteredResults.length > 0 && (
        <SearchResults 
          results={filteredResults}
          highlightQuery={query}
        />
      )}
    </div>
  );
};
```

## Specialized Components

### Network Visualization Component

```typescript
// Main visualization component with all optimizations
import { useRef, useEffect, useState } from 'react';
import { NetworkRenderer } from '@/rendering/NetworkRenderer';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useViewportControls } from '@/hooks/useViewportControls';

export const NetworkVisualization = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<NetworkRenderer | null>(null);
  
  const { nodes, edges, layers } = useNetworkState();
  const { viewport, controls } = useViewportControls();
  
  // Initialize renderer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const renderer = new NetworkRenderer({
      container: containerRef.current,
      maxNodes: 20000,
      enableWebGL: true,
      enableWorkers: true
    });
    
    rendererRef.current = renderer;
    
    // Setup event handlers
    renderer.on('nodeClick', handleNodeClick);
    renderer.on('edgeClick', handleEdgeClick);
    renderer.on('viewportChange', handleViewportChange);
    
    return () => {
      renderer.dispose();
    };
  }, []);
  
  // Update data
  useEffect(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.updateData({
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values())
    });
  }, [nodes, edges]);
  
  // Update layers
  useEffect(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.updateLayers(layers);
  }, [layers]);
  
  return (
    <div 
      ref={containerRef}
      className="network-visualization"
      style={{ width: '100%', height: '100%' }}
    >
      <ViewportControls {...controls} />
      <LayerToggle layers={layers} />
      <MiniMap viewport={viewport} />
    </div>
  );
};
```

### Layer Panel Component

```typescript
// Layer management with visibility and filters
import { memo } from 'react';
import { useXLNStore } from '@/store';
import { LayerType } from '@/types';

export const LayerPanel = memo(() => {
  const { layers, toggleLayer, setLayerOpacity } = useXLNStore(
    state => ({
      layers: state.ui.panels.layers,
      toggleLayer: state.toggleLayer,
      setLayerOpacity: state.setLayerOpacity
    }),
    shallow
  );
  
  return (
    <div className="layer-panel">
      <h3>Layers</h3>
      
      {Object.entries(layers.visibility).map(([type, visible]) => (
        <LayerControl
          key={type}
          type={type as LayerType}
          visible={visible}
          opacity={layers.opacity[type]}
          onToggle={() => toggleLayer(type as LayerType)}
          onOpacityChange={(opacity) => 
            setLayerOpacity(type as LayerType, opacity)
          }
        />
      ))}
      
      <LayerFilters />
      <LayerStats />
    </div>
  );
});

const LayerControl = memo<{
  type: LayerType;
  visible: boolean;
  opacity: number;
  onToggle: () => void;
  onOpacityChange: (opacity: number) => void;
}>(({ type, visible, opacity, onToggle, onOpacityChange }) => {
  const stats = useLayerStats(type);
  
  return (
    <div className="layer-control">
      <div className="layer-header">
        <input
          type="checkbox"
          checked={visible}
          onChange={onToggle}
        />
        <LayerIcon type={type} />
        <span>{type}</span>
        <span className="layer-count">{stats.count}</span>
      </div>
      
      {visible && (
        <div className="layer-options">
          <input
            type="range"
            min={0}
            max={100}
            value={opacity * 100}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          />
          <LayerQuickFilters type={type} />
        </div>
      )}
    </div>
  );
});
```

### Metrics Dashboard Component

```typescript
// Real-time metrics with charts
import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useMetrics } from '@/hooks/useMetrics';

export const MetricsDashboard = () => {
  const { realtime, history, network } = useMetrics();
  
  const fpsChartData = useMemo(() => ({
    labels: history.fps.timestamps,
    datasets: [{
      label: 'FPS',
      data: history.fps.values,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  }), [history.fps]);
  
  return (
    <div className="metrics-dashboard">
      <div className="metrics-grid">
        <MetricCard
          title="FPS"
          value={realtime.fps}
          target={60}
          format="number"
        />
        
        <MetricCard
          title="Nodes"
          value={network.nodeCount}
          format="number"
        />
        
        <MetricCard
          title="Edges"
          value={network.edgeCount}
          format="number"
        />
        
        <MetricCard
          title="Memory"
          value={realtime.memory.used}
          max={realtime.memory.limit}
          format="bytes"
        />
      </div>
      
      <div className="metrics-charts">
        <Line data={fpsChartData} options={chartOptions} />
        <NetworkHealthChart data={network.health} />
      </div>
    </div>
  );
};
```

### Time Machine Component

```typescript
// Historical playback controls
import { useState, useCallback } from 'react';
import { useTimeline } from '@/hooks/useTimeline';
import { Slider } from '@/components/ui/Slider';

export const TimeMachine = () => {
  const {
    currentTime,
    range,
    snapshots,
    mode,
    setTime,
    play,
    pause,
    setSpeed
  } = useTimeline();
  
  const [isLoading, setIsLoading] = useState(false);
  
  const handleTimeChange = useCallback(async (time: number) => {
    setIsLoading(true);
    await setTime(time);
    setIsLoading(false);
  }, [setTime]);
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="time-machine">
      <div className="time-controls">
        <button onClick={mode === 'live' ? pause : play}>
          {mode === 'live' ? <PauseIcon /> : <PlayIcon />}
        </button>
        
        <Slider
          min={range.start}
          max={range.end}
          value={currentTime}
          onChange={handleTimeChange}
          disabled={mode === 'live' || isLoading}
          marks={snapshots.map(s => s.timestamp)}
        />
        
        <span className="time-display">
          {formatTime(currentTime)}
        </span>
      </div>
      
      <PlaybackSpeed 
        speed={speed}
        onChange={setSpeed}
        disabled={mode === 'live'}
      />
      
      <SnapshotList
        snapshots={snapshots}
        currentTime={currentTime}
        onSelect={handleTimeChange}
      />
    </div>
  );
};
```

## Hook Patterns

### useNetworkState Hook

```typescript
// Central hook for network state management
export const useNetworkState = () => {
  const nodes = useXLNStore(state => state.network.nodes.byId);
  const edges = useXLNStore(state => state.network.edges.byId);
  const layers = useXLNStore(state => state.network.layers);
  const viewport = useXLNStore(state => state.ui.viewport);
  
  // Compute visible elements
  const visibleNodes = useMemo(() => {
    const visible = new Map<string, NetworkNode>();
    const bounds = viewport.bounds;
    
    nodes.forEach((node, id) => {
      if (isInBounds(node.position, bounds) && 
          isLayerVisible(node.layer, layers)) {
        visible.set(id, node);
      }
    });
    
    return visible;
  }, [nodes, viewport.bounds, layers]);
  
  const visibleEdges = useMemo(() => {
    const visible = new Map<string, NetworkEdge>();
    
    edges.forEach((edge, id) => {
      if (visibleNodes.has(edge.source) && 
          visibleNodes.has(edge.target)) {
        visible.set(id, edge);
      }
    });
    
    return visible;
  }, [edges, visibleNodes]);
  
  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    layers,
    stats: {
      totalNodes: nodes.size,
      totalEdges: edges.size,
      visibleNodes: visibleNodes.size,
      visibleEdges: visibleEdges.size
    }
  };
};
```

### useWebSocket Hook

```typescript
// WebSocket connection management
export const useWebSocket = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setStatus('connected');
      clearTimeout(reconnectTimeoutRef.current);
    };
    
    ws.onclose = () => {
      setStatus('disconnected');
      // Exponential backoff reconnection
      const timeout = Math.min(
        1000 * Math.pow(2, reconnectAttempts),
        30000
      );
      reconnectTimeoutRef.current = setTimeout(connect, timeout);
    };
    
    ws.onmessage = (event) => {
      const message = parseMessage(event.data);
      handleMessage(message);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
    };
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
  
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  return { status, send };
};
```

## Testing Patterns

### Component Testing

```typescript
// Example test for performance-critical component
import { render, fireEvent } from '@testing-library/react';
import { PerformantComponent } from './PerformantComponent';
import { useXLNStore } from '@/store';

jest.mock('@/store');

describe('PerformantComponent', () => {
  beforeEach(() => {
    useXLNStore.mockReturnValue({
      network: {
        nodes: {
          byId: new Map([
            ['node1', { id: 'node1', label: 'Test Node' }]
          ])
        }
      },
      selectNode: jest.fn()
    });
  });
  
  it('renders without re-rendering on unrelated state changes', () => {
    const { rerender } = render(
      <PerformantComponent nodeId="node1" />
    );
    
    const renderCount = jest.fn();
    
    // Track renders
    jest.spyOn(React, 'createElement').mockImplementation(
      (type, props, ...children) => {
        if (type === PerformantComponent) {
          renderCount();
        }
        return React.createElement(type, props, ...children);
      }
    );
    
    // Trigger unrelated state change
    useXLNStore.setState({ ui: { theme: 'dark' } });
    rerender(<PerformantComponent nodeId="node1" />);
    
    expect(renderCount).toHaveBeenCalledTimes(1);
  });
});
```

This component architecture provides a solid foundation for building a high-performance, maintainable visualization system.