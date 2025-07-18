/**
 * XLN Network Type Definitions
 * Based on the whitepaper's hierarchical layer design
 */

// Base types
export type NodeId = string;
export type ChannelId = string;
export type JurisdictionId = string;
export type DepositaryId = string;
export type EntityId = string;
export type Hash = string;
export type Address = string;
export type Timestamp = number;

// Network layers
export enum NetworkLayer {
  JURISDICTION = 'jurisdiction',
  DEPOSITARY = 'depositary',
  ENTITY = 'entity',
  CHANNEL = 'channel',
  TRANSACTION = 'transaction'
}

// Node types in the visualization
export enum NodeType {
  JURISDICTION = 'jurisdiction',
  DEPOSITARY = 'depositary',
  ENTITY = 'entity',
  ACCOUNT = 'account'
}

// Consensus types
export enum ConsensusType {
  PROPOSER_BASED = 'proposer_based',
  GOSSIP_BASED = 'gossip_based'
}

// Base node interface
export interface BaseNode {
  id: NodeId;
  type: NodeType;
  name: string;
  layer: NetworkLayer;
  position?: { x: number; y: number };
  x?: number; // D3 position x
  y?: number; // D3 position y
  fx?: number | null; // Fixed x position for D3
  fy?: number | null; // Fixed y position for D3
  vx?: number; // Velocity x for D3
  vy?: number; // Velocity y for D3
}

// Jurisdiction node
export interface JurisdictionNode extends BaseNode {
  type: NodeType.JURISDICTION;
  framework: string;
  disputeResolutionRules: string[];
  depositaries: DepositaryId[];
}

// Depositary node (on-chain contract)
export interface DepositaryNode extends BaseNode {
  type: NodeType.DEPOSITARY;
  chainId: string;
  contractAddress: Address;
  reserves: bigint;
  entities: EntityId[];
  lastRootHash: Hash;
  lastRootHeight: number;
}

// Entity node (sovereign state machine)
export interface EntityNode extends BaseNode {
  type: NodeType.ENTITY;
  depositaryId: DepositaryId;
  consensusType: ConsensusType;
  validators: Address[];
  channels: ChannelId[];
  tvl: bigint;
  channelCount: number;
  transactionRate: number; // TPS
  health: EntityHealth;
}

// Account node
export interface AccountNode extends BaseNode {
  type: NodeType.ACCOUNT;
  entityId: EntityId;
  address: Address;
  balance: bigint;
  creditLimit: bigint;
  channels: ChannelId[];
}

// Channel (edge in the graph)
export interface Channel {
  id: ChannelId;
  source: NodeId;
  target: NodeId;
  capacity: bigint;
  available: bigint;
  creditLine: bigint;
  isActive: boolean;
  lastUpdate: Timestamp;
}

// Entity health metrics
export interface EntityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  latency: number;
  errorRate: number;
  consensusParticipation: number;
}

// Network state
export interface NetworkState {
  nodes: NetworkNode[];
  channels: Channel[];
  metrics: NetworkMetrics;
  timestamp: Timestamp;
  version: number;
}

// Union type for all node types
export type NetworkNode = JurisdictionNode | DepositaryNode | EntityNode | AccountNode;

// Network-wide metrics
export interface NetworkMetrics {
  totalTvl: bigint;
  totalEntities: number;
  totalChannels: number;
  totalAccounts: number;
  activeChannels: number;
  transactionVolume24h: bigint;
  averageTps: number;
  networkHealth: number; // 0-100
}

// WebSocket message types
export interface NetworkUpdate {
  type: 'state' | 'delta' | 'metrics';
  data: NetworkState | NetworkDelta | NetworkMetrics;
  timestamp: Timestamp;
}

// Delta update for efficient streaming
export interface NetworkDelta {
  addedNodes?: NetworkNode[];
  updatedNodes?: Partial<NetworkNode>[];
  removedNodes?: NodeId[];
  addedChannels?: Channel[];
  updatedChannels?: Partial<Channel>[];
  removedChannels?: ChannelId[];
}

// Consensus event for animation
export interface ConsensusEvent {
  id: string;
  entityId: EntityId;
  type: ConsensusType;
  round: number;
  proposer?: Address;
  validators: Address[];
  timestamp: Timestamp;
  duration: number;
  success: boolean;
}

// Cross-chain swap event
export interface CrossChainSwap {
  id: string;
  sourceChain: string;
  targetChain: string;
  sourceEntity: EntityId;
  targetEntity: EntityId;
  amount: bigint;
  hashLock: Hash;
  status: 'pending' | 'locked' | 'revealed' | 'completed' | 'failed';
  timestamp: Timestamp;
}

// Filter options for the UI
export interface NetworkFilter {
  layers?: NetworkLayer[];
  nodeTypes?: NodeType[];
  entityIds?: EntityId[];
  depositaryIds?: DepositaryId[];
  minTvl?: bigint;
  maxTvl?: bigint;
  healthStatus?: EntityHealth['status'][];
  searchQuery?: string;
}

// View state for the visualization
export interface ViewState {
  selectedNode?: NodeId;
  highlightedNodes: Set<NodeId>;
  highlightedChannels: Set<ChannelId>;
  visibleLayers: Set<NetworkLayer>;
  zoom: number;
  center: { x: number; y: number };
  filter: NetworkFilter;
}