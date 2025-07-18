import React, { useRef, useEffect, useMemo, useState, useCallback, memo } from 'react';
import * as d3 from 'd3';
import { NetworkState, ViewState, NetworkNode, Channel, NodeType, ConsensusEvent, EntityNode } from '../types/network.types';
import { getNodeColor, getNodeSize, getChannelColor } from '../utils/visualization';
import { ConsensusAnimation } from './ConsensusAnimation';
import { ConsensusService } from '../services/consensus.service';
import './NetworkTopology.css';

interface NetworkTopologyProps {
  networkState: NetworkState;
  viewState: ViewState;
  onNodeSelect: (nodeId: string | undefined) => void;
  onChannelSelect?: (channelId: string | undefined) => void;
  onViewStateChange: (viewState: ViewState) => void;
  consensusService: ConsensusService;
  showConsensusAnimations?: boolean;
}

// Memoized component to prevent unnecessary re-renders
export const NetworkTopology: React.FC<NetworkTopologyProps> = memo(({
  networkState,
  viewState,
  onNodeSelect,
  onChannelSelect,
  onViewStateChange,
  consensusService,
  showConsensusAnimations = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, Channel> | null>(null);
  const [currentConsensusEvent, setCurrentConsensusEvent] = useState<ConsensusEvent | null>(null);
  const [currentEntityNode, setCurrentEntityNode] = useState<EntityNode | null>(null);
  
  // Filter nodes and channels based on view state
  const filteredData = useMemo(() => {
    const visibleNodes = networkState.nodes.filter(node => 
      viewState.visibleLayers.has(node.layer)
    );
    
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleChannels = networkState.channels.filter(channel =>
      visibleNodeIds.has(channel.source) && visibleNodeIds.has(channel.target)
    );
    
    return { nodes: visibleNodes, channels: visibleChannels };
  }, [networkState, viewState.visibleLayers]);

  // Subscribe to consensus events
  useEffect(() => {
    if (!consensusService || !showConsensusAnimations) return;

    const unsubscribe = consensusService.onConsensusEvent((event: ConsensusEvent) => {
      const entityNode = consensusService.getEntityNode(event.entityId);
      if (entityNode && viewState.visibleLayers.has(entityNode.layer)) {
        setCurrentConsensusEvent(event);
        setCurrentEntityNode(entityNode);
      }
    });

    return unsubscribe;
  }, [consensusService, viewState.visibleLayers, showConsensusAnimations]);

  // Memoized zoom handler to prevent recreation
  const handleZoom = useCallback((event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
    const g = svgGroupRef.current;
    if (g) {
      g.attr('transform', event.transform.toString());
      onViewStateChange({
        ...viewState,
        zoom: event.transform.k,
        center: { x: event.transform.x, y: event.transform.y }
      });
    }
  }, [onViewStateChange, viewState]);

  // Memoized drag functions to prevent recreation
  const dragstarted = useCallback((event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
    const simulation = simulationRef.current;
    if (!simulation) return;
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }, []);

  const dragged = useCallback((event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
    d.fx = event.x;
    d.fy = event.y;
  }, []);

  const dragended = useCallback((event: d3.D3DragEvent<SVGGElement, NetworkNode, NetworkNode>, d: NetworkNode) => {
    const simulation = simulationRef.current;
    if (!simulation) return;
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }, []);

  // D3 Force Simulation with performance optimizations
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Only clear and recreate if data structure has changed significantly
    const shouldRecreate = !simulationRef.current || 
                          filteredData.nodes.length !== simulationRef.current.nodes().length ||
                          filteredData.channels.length !== (simulationRef.current.force('link') as d3.ForceLink<NetworkNode, Channel>)?.links()?.length;

    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    let g: d3.Selection<SVGGElement, unknown, null, undefined>;

    if (shouldRecreate) {
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      // Create SVG groups
      svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

      // Add zoom behavior
      g = svg.append('g');
      svgGroupRef.current = g; // Store reference for consensus animations
      
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on('zoom', handleZoom);

      svg.call(zoom);

      // Set initial zoom from viewState
      if (viewState.zoom !== 1 || viewState.center.x !== 0 || viewState.center.y !== 0) {
        svg.call(
          zoom.transform,
          d3.zoomIdentity
            .translate(viewState.center.x, viewState.center.y)
            .scale(viewState.zoom)
        );
      }

      // Create force simulation
      const simulation = d3.forceSimulation<NetworkNode>(filteredData.nodes)
        .force('link', d3.forceLink<NetworkNode, Channel>(filteredData.channels)
          .id(d => d.id)
          .distance(d => {
            // Vary distance based on channel capacity
            const capacity = Number(d.capacity) / 1e18; // Convert from Wei
            return Math.max(80, 200 - capacity * 0.1);
          })
          .strength(0.5)
        )
        .force('charge', d3.forceManyBody()
          .strength(d => {
            // Stronger repulsion for larger nodes
            switch ((d as NetworkNode).type) {
              case NodeType.JURISDICTION: return -1000;
              case NodeType.DEPOSITARY: return -800;
              case NodeType.ENTITY: return -600;
              default: return -400;
            }
          })
        )
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide<NetworkNode>()
          .radius(d => getNodeSize(d) + 10)
        );

      simulationRef.current = simulation;
    } else {
      // Update existing simulation with new data
      const simulation = simulationRef.current;
      g = svgGroupRef.current!;
      svg = d3.select(svgRef.current);
      
      if (simulation && g) {
        // Update simulation data
        simulation.nodes(filteredData.nodes);
        const linkForce = simulation.force('link') as d3.ForceLink<NetworkNode, Channel>;
        if (linkForce) {
          linkForce.links(filteredData.channels);
        }
        
        // Restart simulation with lower alpha for smoother updates
        simulation.alpha(0.1).restart();
      }
    }

    const simulation = simulationRef.current;
    
    if (!simulation || !g) return;

    // Create channel elements
    const link = g.selectAll('.channel')
      .data(filteredData.channels, (d: any) => d.id);

    // Remove old channels
    link.exit().remove();

    // Create new channels
    const linkEnter = link.enter()
      .append('line')
      .attr('class', 'channel')
      .attr('stroke', d => getChannelColor(d))
      .attr('stroke-width', d => {
        // Width based on available liquidity
        const available = Number(d.available) / Number(d.capacity);
        return Math.max(1, available * 6);
      })
      .attr('stroke-opacity', d => d.isActive ? 0.8 : 0.3)
      .attr('data-channel-id', d => d.id)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        if (onChannelSelect) {
          onChannelSelect(d.id);
        }
      });

    // Update all channels
    const linkUpdate = linkEnter.merge(link as unknown as d3.Selection<SVGLineElement, Channel, SVGGElement, unknown>);

    // Add channel labels (capacity)
    const linkLabel = g.selectAll('.channel-label')
      .data(filteredData.channels, (d: any) => d.id);

    linkLabel.exit().remove();

    const linkLabelEnter = linkLabel.enter()
      .append('text')
      .attr('class', 'channel-label')
      .attr('font-size', '10px')
      .attr('fill', 'rgba(255, 255, 255, 0.6)')
      .attr('text-anchor', 'middle')
      .text(d => {
        const capacity = Number(d.capacity) / 1e18;
        return capacity > 0 ? `${capacity.toFixed(0)}` : '';
      })
      .style('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        if (onChannelSelect) {
          onChannelSelect(d.id);
        }
      });

    const linkLabelUpdate = linkLabelEnter.merge(linkLabel as unknown as d3.Selection<SVGTextElement, Channel, SVGGElement, unknown>);

    // Create node groups
    const node = g.selectAll('.node')
      .data(filteredData.nodes, (d: any) => d.id);

    // Remove old nodes
    node.exit().remove();

    // Create new nodes
    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-node-id', d => d.id)
      .call(d3.drag<SVGGElement, NetworkNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add node circles
    nodeEnter.append('circle')
      .attr('r', d => getNodeSize(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => viewState.selectedNode === d.id ? '#fff' : 'none')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeSelect(d.id);
      });

    // Add node icons
    nodeEnter.append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', d => getNodeSize(d) * 0.8)
      .attr('fill', '#fff')
      .text(d => {
        switch (d.type) {
          case NodeType.JURISDICTION: return '⚖️';
          case NodeType.DEPOSITARY: return '🏦';
          case NodeType.ENTITY: return '🔷';
          case NodeType.ACCOUNT: return '👤';
          default: return '';
        }
      });

    // Add node labels
    nodeEnter.append('text')
      .attr('class', 'node-label')
      .attr('x', 0)
      .attr('y', d => getNodeSize(d) + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#fff')
      .text(d => d.name);

    // Update all nodes
    const nodeUpdate = nodeEnter.merge(node as unknown as d3.Selection<SVGGElement, NetworkNode, SVGGElement, unknown>);

    // Update node selection state
    nodeUpdate.select('circle')
      .attr('stroke', d => viewState.selectedNode === d.id ? '#fff' : 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkUpdate
        .attr('x1', d => {
          const source = filteredData.nodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = filteredData.nodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = filteredData.nodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = filteredData.nodes.find(n => n.id === d.target);
          return target?.y || 0;
        });

      linkLabelUpdate
        .attr('x', d => {
          const source = filteredData.nodes.find(n => n.id === d.source);
          const target = filteredData.nodes.find(n => n.id === d.target);
          return ((source?.x || 0) + (target?.x || 0)) / 2;
        })
        .attr('y', d => {
          const source = filteredData.nodes.find(n => n.id === d.source);
          const target = filteredData.nodes.find(n => n.id === d.target);
          return ((source?.y || 0) + (target?.y || 0)) / 2;
        });

      nodeUpdate.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click outside to deselect
    svg.on('click', () => {
      onNodeSelect(undefined);
    });

    // Handle window resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
      if (simulation) {
        simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (simulation) {
        simulation.stop();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [filteredData, viewState.visibleLayers, viewState.selectedNode, handleZoom, dragstarted, dragged, dragended, onNodeSelect, onChannelSelect]);

  return (
    <div ref={containerRef} className="network-topology">
      <svg ref={svgRef} className="network-svg" />
      <ConsensusAnimation
        consensusEvent={currentConsensusEvent}
        entityNode={currentEntityNode}
        svgGroup={svgGroupRef.current}
      />
      {viewState.selectedNode && (
        <div className="selection-info">
          Selected: {viewState.selectedNode}
        </div>
      )}
    </div>
  );
});