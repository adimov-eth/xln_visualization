import { NetworkNode, Channel, NodeType, EntityNode } from '../types/network.types';

// Safe BigInt conversion utilities
function safeBigIntToNumber(value: bigint | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null) return defaultValue;
  try {
    return Number(value);
  } catch {
    return defaultValue;
  }
}

function safeToEther(value: bigint | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null) return defaultValue;
  try {
    return Number(value / BigInt(1e18));
  } catch {
    return defaultValue;
  }
}

// Color palette for different node types
const NODE_COLORS = {
  [NodeType.JURISDICTION]: '#8b5cf6', // Purple
  [NodeType.DEPOSITARY]: '#3b82f6',   // Blue
  [NodeType.ENTITY]: '#10b981',       // Green
  [NodeType.ACCOUNT]: '#64748b'       // Gray
};

// Get node color based on type and health
export function getNodeColor(node: NetworkNode): string {
  if (node.type === NodeType.ENTITY) {
    const entity = node as EntityNode;
    switch (entity.health.status) {
      case 'unhealthy':
        return '#ef4444'; // Red
      case 'degraded':
        return '#f59e0b'; // Yellow
      default:
        return NODE_COLORS[node.type];
    }
  }
  return NODE_COLORS[node.type] || '#64748b';
}

// Get node size based on type and metrics
export function getNodeSize(node: NetworkNode): number {
  switch (node.type) {
    case NodeType.JURISDICTION:
      return 40;
    case NodeType.DEPOSITARY:
      return 30;
    case NodeType.ENTITY:
      // Size based on TVL
      const entity = node as EntityNode;
      const tvl = safeToEther(entity.tvl, 0);
      const baseSize = 20;
      const scaleFactor = Math.log10(tvl + 1) * 2;
      return Math.min(baseSize + scaleFactor, 35);
    case NodeType.ACCOUNT:
      return 15;
    default:
      return 20;
  }
}

// Get channel color based on utilization and status
export function getChannelColor(channel: Channel): string {
  if (!channel.isActive) {
    return '#475569'; // Inactive gray
  }
  
  const available = safeBigIntToNumber(channel.available, 0);
  const capacity = safeBigIntToNumber(channel.capacity, 1);
  const utilization = available / capacity;
  
  if (utilization < 0.2) {
    return '#ef4444'; // Red - low liquidity
  } else if (utilization < 0.5) {
    return '#f59e0b'; // Yellow - medium liquidity
  } else {
    return '#22c55e'; // Green - good liquidity
  }
}

// Get channel width based on capacity
export function getChannelWidth(channel: Channel): number {
  const capacity = safeToEther(channel.capacity, 0);
  const baseWidth = 1;
  const scaleFactor = Math.log10(capacity + 1) * 0.5;
  return Math.min(baseWidth + scaleFactor, 6);
}

// Format large numbers for display
export function formatNumber(value: number | bigint): string {
  const num = typeof value === 'bigint' ? safeToEther(value, 0) : value;
  
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  } else {
    return num.toFixed(0);
  }
}

// Get node tooltip content
export function getNodeTooltip(node: NetworkNode): string {
  const lines = [
    `Type: ${node.type}`,
    `Name: ${node.name}`,
    `ID: ${node.id}`
  ];
  
  if (node.type === NodeType.ENTITY) {
    const entity = node as EntityNode;
    lines.push(
      `TVL: ${formatNumber(entity.tvl)}`,
      `Channels: ${entity.channelCount}`,
      `TPS: ${entity.transactionRate}`,
      `Health: ${entity.health.status}`
    );
  }
  
  return lines.join('\n');
}

// Get channel tooltip content
export function getChannelTooltip(channel: Channel): string {
  const available = safeBigIntToNumber(channel.available, 0);
  const capacity = safeBigIntToNumber(channel.capacity, 1);
  const utilization = (available / capacity * 100).toFixed(1);
  
  return [
    `Channel: ${channel.id}`,
    `Capacity: ${formatNumber(channel.capacity)}`,
    `Available: ${formatNumber(channel.available)} (${utilization}%)`,
    `Status: ${channel.isActive ? 'Active' : 'Inactive'}`
  ].join('\n');
}

// Calculate optimal force simulation parameters based on network size
export function getSimulationParams(nodeCount: number) {
  return {
    chargeStrength: Math.max(-1000, -50 * Math.sqrt(nodeCount)),
    linkDistance: Math.min(200, 50 + nodeCount / 10),
    centerStrength: nodeCount > 100 ? 0.05 : 0.1,
    alphaDecay: nodeCount > 500 ? 0.02 : 0.01,
    velocityDecay: 0.4
  };
}

// Check if node should be rendered based on viewport and zoom
export function shouldRenderNode(
  node: NetworkNode,
  viewport: { x: number; y: number; width: number; height: number }
): boolean {
  if (!node.position) return false;
  
  // Add buffer to viewport
  const buffer = 100;
  const { x, y } = node.position;
  
  return (
    x >= viewport.x - buffer &&
    x <= viewport.x + viewport.width + buffer &&
    y >= viewport.y - buffer &&
    y <= viewport.y + viewport.height + buffer
  );
}

// Get level of detail based on zoom level
export function getLevelOfDetail(zoom: number): 'full' | 'medium' | 'low' {
  if (zoom >= 2) return 'full';
  if (zoom >= 0.5) return 'medium';
  return 'low';
}