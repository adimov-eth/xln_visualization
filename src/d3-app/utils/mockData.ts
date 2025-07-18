import {
  NetworkState,
  NetworkNode,
  Channel,
  NodeType,
  NetworkLayer,
  ConsensusType,
  EntityHealth,
  JurisdictionNode,
  DepositaryNode,
  EntityNode,
  NetworkMetrics
} from '../types/network.types';

// Helper to generate random IDs
const generateId = (prefix: string, index: number) => `${prefix}-${index.toString().padStart(3, '0')}`;

// Helper to generate random bigint values
const randomBigInt = (min: number, max: number): bigint => {
  return BigInt(Math.floor(Math.random() * (max - min) + min)) * BigInt(1e18); // Convert to Wei
};

// Generate jurisdiction nodes
function generateJurisdictions(count: number): JurisdictionNode[] {
  const jurisdictions: JurisdictionNode[] = [];
  const frameworks = ['US-NY', 'EU-DE', 'APAC-SG', 'UK-LON', 'CH-ZUG'];
  
  for (let i = 0; i < count; i++) {
    jurisdictions.push({
      id: generateId('jur', i),
      type: NodeType.JURISDICTION,
      name: `Jurisdiction ${frameworks[i % frameworks.length]}`,
      layer: NetworkLayer.JURISDICTION,
      framework: frameworks[i % frameworks.length],
      disputeResolutionRules: ['Arbitration', 'Smart Contract', 'Legal Court'],
      depositaries: []
    });
  }
  
  return jurisdictions;
}

// Generate depositary nodes
function generateDepositaries(jurisdictions: JurisdictionNode[], perJurisdiction: number): DepositaryNode[] {
  const depositaries: DepositaryNode[] = [];
  const chains = ['ethereum', 'bitcoin', 'solana', 'polygon', 'arbitrum'];
  let depIndex = 0;
  
  jurisdictions.forEach((jur) => {
    for (let i = 0; i < perJurisdiction; i++) {
      const depId = generateId('dep', depIndex);
      depositaries.push({
        id: depId,
        type: NodeType.DEPOSITARY,
        name: `${chains[depIndex % chains.length].toUpperCase()} Depositary ${depIndex}`,
        layer: NetworkLayer.DEPOSITARY,
        chainId: chains[depIndex % chains.length],
        contractAddress: `0x${depIndex.toString(16).padStart(40, '0')}`,
        reserves: randomBigInt(1000000, 10000000),
        entities: [],
        lastRootHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        lastRootHeight: Math.floor(Math.random() * 1000000)
      });
      
      // Link depositary to jurisdiction
      jur.depositaries.push(depId);
      depIndex++;
    }
  });
  
  return depositaries;
}

// Generate entity nodes
function generateEntities(depositaries: DepositaryNode[], perDepositary: number): EntityNode[] {
  const entities: EntityNode[] = [];
  const entityTypes = ['Exchange', 'Payment Hub', 'Market Maker', 'Liquidity Provider', 'Gateway'];
  let entIndex = 0;
  
  depositaries.forEach((dep) => {
    for (let i = 0; i < perDepositary; i++) {
      const entId = generateId('ent', entIndex);
      const health: EntityHealth = {
        status: Math.random() > 0.9 ? 'degraded' : Math.random() > 0.95 ? 'unhealthy' : 'healthy',
        uptime: 95 + Math.random() * 5,
        latency: 10 + Math.random() * 50,
        errorRate: Math.random() * 2,
        consensusParticipation: 85 + Math.random() * 15
      };
      
      entities.push({
        id: entId,
        type: NodeType.ENTITY,
        name: `${entityTypes[entIndex % entityTypes.length]} ${entIndex}`,
        layer: NetworkLayer.ENTITY,
        depositaryId: dep.id,
        consensusType: Math.random() > 0.5 ? ConsensusType.PROPOSER_BASED : ConsensusType.GOSSIP_BASED,
        validators: Array(3 + Math.floor(Math.random() * 5)).fill(0).map((_, i) => 
          `0x${(entIndex * 10 + i).toString(16).padStart(40, '0')}`
        ),
        channels: [],
        tvl: randomBigInt(100000, 5000000),
        channelCount: 0,
        transactionRate: Math.floor(Math.random() * 1000),
        health
      });
      
      // Link entity to depositary
      dep.entities.push(entId);
      entIndex++;
    }
  });
  
  return entities;
}

// Generate channels between entities
function generateChannels(entities: EntityNode[]): Channel[] {
  const channels: Channel[] = [];
  const maxChannelsPerEntity = 5;
  
  entities.forEach((entity, index) => {
    // Create channels to random other entities
    const channelCount = Math.min(
      Math.floor(Math.random() * maxChannelsPerEntity) + 1,
      entities.length - 1
    );
    
    const targetIndices = new Set<number>();
    while (targetIndices.size < channelCount) {
      const targetIndex = Math.floor(Math.random() * entities.length);
      if (targetIndex !== index) {
        targetIndices.add(targetIndex);
      }
    }
    
    targetIndices.forEach(targetIndex => {
      const channelId = `ch-${channels.length}`;
      const capacity = randomBigInt(10000, 1000000);
      const available = BigInt(Math.floor(Number(capacity) * Math.random()));
      
      channels.push({
        id: channelId,
        source: entity.id,
        target: entities[targetIndex].id,
        capacity,
        available,
        creditLine: BigInt(Math.floor(Number(capacity) * 0.2)),
        isActive: Math.random() > 0.1,
        lastUpdate: Date.now() - Math.floor(Math.random() * 3600000)
      });
      
      // Update entity channel lists
      entity.channels.push(channelId);
      entities[targetIndex].channels.push(channelId);
      entity.channelCount++;
      entities[targetIndex].channelCount++;
    });
  });
  
  return channels;
}

// Calculate network metrics
function calculateMetrics(nodes: NetworkNode[], channels: Channel[]): NetworkMetrics {
  const entities = nodes.filter(n => n.type === NodeType.ENTITY) as EntityNode[];
  const activeChannels = channels.filter(ch => ch.isActive);
  
  const totalTvl = entities.reduce((sum, ent) => sum + ent.tvl, BigInt(0));
  const averageTps = entities.reduce((sum, ent) => sum + ent.transactionRate, 0) / entities.length;
  
  return {
    totalTvl,
    totalEntities: entities.length,
    totalChannels: channels.length,
    totalAccounts: 0, // Not generating accounts in this mock
    activeChannels: activeChannels.length,
    transactionVolume24h: randomBigInt(1000000, 50000000),
    averageTps: Math.floor(averageTps),
    networkHealth: 85 + Math.random() * 15
  };
}

// Main function to generate complete network state
export function generateMockNetworkState(
  jurisdictionCount = 3,
  depositariesPerJurisdiction = 2,
  entitiesPerDepositary = 5
): NetworkState {
  // Generate hierarchical structure
  const jurisdictions = generateJurisdictions(jurisdictionCount);
  const depositaries = generateDepositaries(jurisdictions, depositariesPerJurisdiction);
  const entities = generateEntities(depositaries, entitiesPerDepositary);
  const channels = generateChannels(entities);
  
  // Combine all nodes
  const nodes: NetworkNode[] = [
    ...jurisdictions,
    ...depositaries,
    ...entities
  ];
  
  // Position nodes for initial layout (optional, D3 will recalculate)
  const centerX = 800;
  const centerY = 600;
  const radius = 400;
  
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    node.position = {
      x: centerX + Math.cos(angle) * radius * (node.type === NodeType.JURISDICTION ? 0.5 : 1),
      y: centerY + Math.sin(angle) * radius * (node.type === NodeType.JURISDICTION ? 0.5 : 1)
    };
  });
  
  // Calculate metrics
  const metrics = calculateMetrics(nodes, channels);
  
  return {
    nodes,
    channels,
    metrics,
    timestamp: Date.now(),
    version: 1
  };
}

// Generate large network for stress testing
export function generateLargeNetworkState(): NetworkState {
  return generateMockNetworkState(5, 4, 50); // 5 jurisdictions, 20 depositaries, 1000 entities
}

// Generate small network for development
export function generateSmallNetworkState(): NetworkState {
  return generateMockNetworkState(2, 2, 3); // 2 jurisdictions, 4 depositaries, 12 entities
}