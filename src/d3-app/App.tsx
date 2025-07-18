import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { NetworkProvider } from './contexts/NetworkContext';
import { NetworkTopology } from './components/NetworkTopology';
import { MetricsPanel } from './components/MetricsPanel';
import { LayerControls } from './components/LayerControls';
import { EntityInspector } from './components/EntityInspector';
import { ChannelInspector } from './components/ChannelInspector';
import { PerformanceDebugger } from './components/PerformanceDebugger';
import { WebSocketService } from './services/websocket.service';
import { ConsensusService } from './services/consensus.service';
import { NetworkState, ViewState, NetworkLayer, NetworkMetrics, NodeType, EntityNode } from './types/network.types';
import { generateMockNetworkState } from './utils/mockData';
import './styles/app.css';

// Memoized components to prevent unnecessary re-renders
const MemoizedNetworkTopology = memo(NetworkTopology);
const MemoizedMetricsPanel = memo(MetricsPanel);
const MemoizedLayerControls = memo(LayerControls);
const MemoizedEntityInspector = memo(EntityInspector);
const MemoizedChannelInspector = memo(ChannelInspector);

export const App: React.FC = () => {
  // Initialize network state with mock data
  const [networkState, setNetworkState] = useState<NetworkState>(() => generateMockNetworkState());
  
  // Initialize view state
  const [viewState, setViewState] = useState<ViewState>({
    selectedNode: undefined,
    highlightedNodes: new Set(),
    highlightedChannels: new Set(),
    visibleLayers: new Set([
      NetworkLayer.ENTITY,
      NetworkLayer.DEPOSITARY,
      NetworkLayer.CHANNEL
    ]),
    zoom: 1,
    center: { x: 0, y: 0 },
    filter: {}
  });

  // Selected channel state
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);

  // WebSocket service instance
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  
  // Consensus service instance
  const [consensusService, setConsensusService] = useState<ConsensusService | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocketService();
    
    // Initialize consensus service with WebSocket
    const cs = new ConsensusService(ws);
    setConsensusService(cs);
    
    // Set up WebSocket handlers with performance optimizations
    ws.on('state', (state: NetworkState) => {
      setNetworkState(prevState => {
        // Only update if state has actually changed
        if (prevState.version >= state.version) {
          return prevState;
        }
        return state;
      });
    });

    ws.on('delta', (delta: any) => {
      // Apply delta updates to network state with batching
      setNetworkState(prev => {
        // Check if delta is meaningful
        if (!delta || (!delta.addedNodes && !delta.updatedNodes && !delta.addedChannels && !delta.updatedChannels)) {
          return prev;
        }
        
        // Use structural sharing to minimize re-renders
        const newState = { ...prev };
        let hasChanges = false;
        
        if (delta.addedNodes?.length) {
          newState.nodes = [...newState.nodes, ...delta.addedNodes];
          hasChanges = true;
        }
        
        if (delta.updatedNodes?.length) {
          // Create a map for efficient lookups
          const updateMap = new Map(delta.updatedNodes.map((u: any) => [u.id, u]));
          newState.nodes = newState.nodes.map(node => {
            const update = updateMap.get(node.id);
            return update ? { ...node, ...update } : node;
          });
          hasChanges = true;
        }
        
        if (delta.addedChannels?.length) {
          newState.channels = [...newState.channels, ...delta.addedChannels];
          hasChanges = true;
        }
        
        if (delta.updatedChannels?.length) {
          const updateMap = new Map(delta.updatedChannels.map((u: any) => [u.id, u]));
          newState.channels = newState.channels.map(channel => {
            const update = updateMap.get(channel.id);
            return update ? { ...channel, ...update } : channel;
          });
          hasChanges = true;
        }
        
        if (hasChanges) {
          newState.timestamp = Date.now();
          newState.version = newState.version + 1;
          return newState;
        }
        
        return prev;
      });
    });

    ws.on('metrics', (metrics: NetworkMetrics) => {
      setNetworkState(prev => {
        // Only update if metrics have actually changed
        if (prev.metrics && JSON.stringify(prev.metrics) === JSON.stringify(metrics)) {
          return prev;
        }
        return {
          ...prev,
          metrics
        };
      });
    });

    // Connect to WebSocket server
    ws.connect('http://localhost:4001').catch(err => {
      console.warn('WebSocket connection failed, using mock data:', err);
    });

    setWsService(ws);

    // Cleanup on unmount
    return () => {
      ws.disconnect();
    };
  }, []);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string | undefined) => {
    setViewState(prev => ({
      ...prev,
      selectedNode: nodeId
    }));
    // Clear channel selection when selecting a node
    setSelectedChannelId(undefined);
  }, []);

  // Handle channel selection
  const handleChannelSelect = useCallback((channelId: string | undefined) => {
    setSelectedChannelId(channelId);
    // Clear node selection when selecting a channel
    setViewState(prev => ({
      ...prev,
      selectedNode: undefined
    }));
  }, []);

  // Handle view state changes
  const handleViewStateChange = useCallback((newViewState: ViewState) => {
    setViewState(newViewState);
  }, []);

  // Handle layer visibility toggle
  const handleLayerToggle = useCallback((layer: NetworkLayer) => {
    setViewState(prev => {
      const newLayers = new Set(prev.visibleLayers);
      if (newLayers.has(layer)) {
        newLayers.delete(layer);
      } else {
        newLayers.add(layer);
      }
      return {
        ...prev,
        visibleLayers: newLayers
      };
    });
  }, []);

  // Get selected node data
  const selectedNode = useMemo(() => {
    if (!viewState.selectedNode) return undefined;
    return networkState.nodes.find(node => node.id === viewState.selectedNode);
  }, [viewState.selectedNode, networkState.nodes]);

  // Get selected channel data
  const selectedChannel = useMemo(() => {
    if (!selectedChannelId) return undefined;
    return networkState.channels.find(channel => channel.id === selectedChannelId);
  }, [selectedChannelId, networkState.channels]);

  // Get channel source and target nodes
  const channelNodes = useMemo(() => {
    if (!selectedChannel) return undefined;
    const source = networkState.nodes.find(node => node.id === selectedChannel.source);
    const target = networkState.nodes.find(node => node.id === selectedChannel.target);
    return source && target ? { source, target } : undefined;
  }, [selectedChannel, networkState.nodes]);

  // Memoized network context value to prevent unnecessary re-renders
  const networkContextValue = useMemo(() => ({
    networkState,
    viewState,
    wsService
  }), [networkState, viewState, wsService]);

  // Memoized connection status to prevent string recreation
  const connectionStatus = useMemo(() => 
    wsService?.isConnected() ? '🟢 Connected' : '🔴 Disconnected'
  , [wsService]);

  // Memoized close handlers to prevent recreation
  const handleNodeClose = useCallback(() => handleNodeSelect(undefined), [handleNodeSelect]);
  const handleChannelClose = useCallback(() => handleChannelSelect(undefined), [handleChannelSelect]);

  return (
    <NetworkProvider value={networkContextValue}>
      <div className="app">
        <header className="app-header">
          <h1>XLN Network Visualization</h1>
          <div className="header-controls">
            <span className="connection-status">
              {connectionStatus}
            </span>
          </div>
        </header>
        
        <main className="app-main">
          <div className="sidebar sidebar-left">
            <MemoizedLayerControls
              visibleLayers={viewState.visibleLayers}
              onLayerToggle={handleLayerToggle}
            />
            <MemoizedMetricsPanel metrics={networkState.metrics} />
          </div>
          
          <div className="visualization-container">
            {consensusService && (
              <MemoizedNetworkTopology
                networkState={networkState}
                viewState={viewState}
                onNodeSelect={handleNodeSelect}
                onChannelSelect={handleChannelSelect}
                onViewStateChange={handleViewStateChange}
                consensusService={consensusService}
              />
            )}
          </div>
          
          {(selectedNode || selectedChannel) && (
            <div className="sidebar sidebar-right">
              {selectedNode && selectedNode.type === NodeType.ENTITY && (
                <MemoizedEntityInspector
                  entity={selectedNode as EntityNode}
                  channels={networkState.channels}
                  allNodes={networkState.nodes}
                  onClose={handleNodeClose}
                />
              )}
              {selectedChannel && channelNodes && (
                <MemoizedChannelInspector
                  channel={selectedChannel}
                  sourceNode={channelNodes.source}
                  targetNode={channelNodes.target}
                  onClose={handleChannelClose}
                />
              )}
              {selectedNode && selectedNode.type !== NodeType.ENTITY && (
                <div className="node-inspector">
                  <h3>Node Details</h3>
                  <p>Type: {selectedNode.type}</p>
                  <p>Name: {selectedNode.name}</p>
                  <p>ID: {selectedNode.id}</p>
                  {/* Add more node details here based on type */}
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Performance Debugger */}
        <PerformanceDebugger 
          networkState={networkState}
          position="bottom-right"
        />
      </div>
    </NetworkProvider>
  );
};