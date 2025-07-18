import {
  NetworkState,
  NetworkNode,
  Channel,
  NetworkMetrics,
  NetworkDelta,
  ConsensusEvent,
  CrossChainSwap,
  NodeType,
  NetworkLayer,
  ConsensusType,
  JurisdictionNode,
  DepositaryNode,
  EntityNode,
  AccountNode,
  EntityHealth
} from '../d3-app/types/network.types';

export class DataGenerator {
  private nodeIdCounter = 1;
  private channelIdCounter = 1;
  private eventIdCounter = 1;
  private swapIdCounter = 1;

  generateInitialState(): NetworkState {
    const nodes: NetworkNode[] = [];
    const channels: Channel[] = [];

    // Create jurisdictions
    const jurisdictions = this.createJurisdictions();
    nodes.push(...jurisdictions);

    // Create depositaries for each jurisdiction
    const depositaries = new Map<string, DepositaryNode[]>();
    jurisdictions.forEach(jurisdiction => {
      const deps = this.createDepositaries(jurisdiction);
      depositaries.set(jurisdiction.id, deps);
      nodes.push(...deps);
    });

    // Create entities for each depositary
    const entities = new Map<string, EntityNode[]>();
    depositaries.forEach((deps) => {
      deps.forEach(depositary => {
        const ents = this.createEntities(depositary);
        entities.set(depositary.id, ents);
        nodes.push(...ents);
      });
    });

    // Create accounts for some entities
    entities.forEach((ents) => {
      ents.forEach(entity => {
        if (Math.random() > 0.5) {
          const accounts = this.createAccounts(entity);
          nodes.push(...accounts);
        }
      });
    });

    // Create channels between nodes
    channels.push(...this.createChannels(nodes));

    const metrics = this.calculateMetrics({ nodes, channels } as NetworkState);

    return {
      nodes,
      channels,
      metrics,
      timestamp: Date.now(),
      version: 1
    };
  }

  private createJurisdictions(): JurisdictionNode[] {
    const frameworks = ['Common Law', 'Civil Law', 'Hybrid System'];
    const names = ['United States', 'European Union', 'Singapore'];
    
    return names.map((name, i) => ({
      id: `jurisdiction-${this.nodeIdCounter++}`,
      type: NodeType.JURISDICTION,
      name,
      layer: NetworkLayer.JURISDICTION,
      framework: frameworks[i],
      disputeResolutionRules: [
        'Arbitration Required',
        'Court System Available',
        'Smart Contract Enforcement'
      ],
      depositaries: []
    }));
  }

  private createDepositaries(jurisdiction: JurisdictionNode): DepositaryNode[] {
    const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'];
    const count = Math.floor(Math.random() * 3) + 2;
    
    const depositaries: DepositaryNode[] = [];
    for (let i = 0; i < count; i++) {
      const depositary: DepositaryNode = {
        id: `depositary-${this.nodeIdCounter++}`,
        type: NodeType.DEPOSITARY,
        name: `${jurisdiction.name} ${chains[i % chains.length]} Depositary`,
        layer: NetworkLayer.DEPOSITARY,
        chainId: chains[i % chains.length].toLowerCase(),
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        reserves: BigInt(Math.floor(Math.random() * 1000000) * 10**18),
        entities: [],
        lastRootHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        lastRootHeight: Math.floor(Math.random() * 10000)
      };
      
      jurisdiction.depositaries.push(depositary.id);
      depositaries.push(depositary);
    }
    
    return depositaries;
  }

  private createEntities(depositary: DepositaryNode): EntityNode[] {
    const types = ['Exchange', 'Lending Pool', 'DEX', 'Payment Processor', 'Bridge'];
    const count = Math.floor(Math.random() * 4) + 2;
    
    const entities: EntityNode[] = [];
    for (let i = 0; i < count; i++) {
      const entity: EntityNode = {
        id: `entity-${this.nodeIdCounter++}`,
        type: NodeType.ENTITY,
        name: `${types[i % types.length]} #${i + 1}`,
        layer: NetworkLayer.ENTITY,
        depositaryId: depositary.id,
        consensusType: Math.random() > 0.5 ? ConsensusType.PROPOSER_BASED : ConsensusType.GOSSIP_BASED,
        validators: this.generateValidators(),
        channels: [],
        tvl: BigInt(Math.floor(Math.random() * 500000) * 10**18),
        channelCount: 0,
        transactionRate: Math.random() * 1000,
        health: this.generateHealth()
      };
      
      depositary.entities.push(entity.id);
      entities.push(entity);
    }
    
    return entities;
  }

  private createAccounts(entity: EntityNode): AccountNode[] {
    const count = Math.floor(Math.random() * 5) + 1;
    const accounts: AccountNode[] = [];
    
    for (let i = 0; i < count; i++) {
      accounts.push({
        id: `account-${this.nodeIdCounter++}`,
        type: NodeType.ACCOUNT,
        name: `Account ${i + 1}`,
        layer: NetworkLayer.ENTITY,
        entityId: entity.id,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        balance: BigInt(Math.floor(Math.random() * 10000) * 10**18),
        creditLimit: BigInt(Math.floor(Math.random() * 5000) * 10**18),
        channels: []
      });
    }
    
    return accounts;
  }

  private createChannels(nodes: NetworkNode[]): Channel[] {
    const channels: Channel[] = [];
    const entities = nodes.filter(n => n.type === NodeType.ENTITY);
    const accounts = nodes.filter(n => n.type === NodeType.ACCOUNT);
    
    // Create channels between entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (Math.random() > 0.6) {
          const channel = this.createChannel(entities[i], entities[j]);
          channels.push(channel);
          
          // Update entity channel references
          (entities[i] as EntityNode).channels.push(channel.id);
          (entities[j] as EntityNode).channels.push(channel.id);
          (entities[i] as EntityNode).channelCount++;
          (entities[j] as EntityNode).channelCount++;
        }
      }
    }
    
    // Create channels between accounts and entities
    accounts.forEach(account => {
      const accountNode = account as AccountNode;
      const entity = entities.find(e => e.id === accountNode.entityId);
      
      if (entity && Math.random() > 0.3) {
        const channel = this.createChannel(account, entity);
        channels.push(channel);
        accountNode.channels.push(channel.id);
      }
    });
    
    return channels;
  }

  private createChannel(source: NetworkNode, target: NetworkNode): Channel {
    const capacity = BigInt(Math.floor(Math.random() * 100000) * 10**18);
    const used = BigInt(Math.floor(Math.random() * Number(capacity) / 10**18) * 10**18);
    
    return {
      id: `channel-${this.channelIdCounter++}`,
      source: source.id,
      target: target.id,
      capacity,
      available: capacity - used,
      creditLine: BigInt(Math.floor(Math.random() * 50000) * 10**18),
      isActive: Math.random() > 0.1,
      lastUpdate: Date.now()
    };
  }

  private generateValidators(): string[] {
    const count = Math.floor(Math.random() * 5) + 3;
    const validators: string[] = [];
    
    for (let i = 0; i < count; i++) {
      validators.push(`0x${Math.random().toString(16).substr(2, 40)}`);
    }
    
    return validators;
  }

  private generateHealth(): EntityHealth {
    const statuses: EntityHealth['status'][] = ['healthy', 'degraded', 'unhealthy'];
    const weights = [0.7, 0.2, 0.1];
    const random = Math.random();
    
    let status: EntityHealth['status'] = 'healthy';
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        status = statuses[i];
        break;
      }
    }
    
    return {
      status,
      uptime: Math.random() * 0.2 + 0.8, // 80-100%
      latency: Math.random() * 100 + 10, // 10-110ms
      errorRate: Math.random() * 0.05, // 0-5%
      consensusParticipation: Math.random() * 0.3 + 0.7 // 70-100%
    };
  }

  calculateMetrics(state: NetworkState): NetworkMetrics {
    const entities = state.nodes.filter(n => n.type === NodeType.ENTITY) as EntityNode[];
    const accounts = state.nodes.filter(n => n.type === NodeType.ACCOUNT);
    const activeChannels = state.channels.filter(c => c.isActive);
    
    const totalTvl = entities.reduce((sum, entity) => sum + entity.tvl, BigInt(0));
    const averageTps = entities.reduce((sum, entity) => sum + entity.transactionRate, 0) / (entities.length || 1);
    
    // Calculate network health based on entity health
    const healthScore = entities.reduce((sum, entity) => {
      const score = entity.health.status === 'healthy' ? 1 : 
                    entity.health.status === 'degraded' ? 0.5 : 0;
      return sum + score;
    }, 0);
    const networkHealth = (healthScore / (entities.length || 1)) * 100;
    
    return {
      totalTvl,
      totalEntities: entities.length,
      totalChannels: state.channels.length,
      totalAccounts: accounts.length,
      activeChannels: activeChannels.length,
      transactionVolume24h: BigInt(Math.floor(Math.random() * 1000000) * 10**18),
      averageTps,
      networkHealth
    };
  }

  generateNetworkDelta(currentState: NetworkState): NetworkDelta {
    const delta: NetworkDelta = {};
    
    // Randomly update some entities
    const entities = currentState.nodes.filter(n => n.type === NodeType.ENTITY) as EntityNode[];
    const entitiesToUpdate = entities.filter(() => Math.random() > 0.7);
    
    if (entitiesToUpdate.length > 0) {
      delta.updatedNodes = entitiesToUpdate.map(entity => ({
        id: entity.id,
        health: this.generateHealth(),
        transactionRate: Math.max(0, entity.transactionRate + (Math.random() - 0.5) * 100),
        tvl: entity.tvl + BigInt(Math.floor((Math.random() - 0.5) * 10000) * 10**18)
      }));
    }
    
    // Randomly update some channels
    const channelsToUpdate = currentState.channels.filter(() => Math.random() > 0.8);
    
    if (channelsToUpdate.length > 0) {
      delta.updatedChannels = channelsToUpdate.map(channel => {
        const available = channel.available + BigInt(Math.floor((Math.random() - 0.5) * 1000) * 10**18);
        return {
          id: channel.id,
          available: available > BigInt(0) ? available : BigInt(0),
          isActive: Math.random() > 0.05,
          lastUpdate: Date.now()
        };
      });
    }
    
    // Occasionally add new accounts
    if (Math.random() > 0.9) {
      const randomEntity = entities[Math.floor(Math.random() * entities.length)];
      if (randomEntity) {
        const newAccount: AccountNode = {
          id: `account-${this.nodeIdCounter++}`,
          type: NodeType.ACCOUNT,
          name: `New Account ${this.nodeIdCounter}`,
          layer: NetworkLayer.ENTITY,
          entityId: randomEntity.id,
          address: `0x${Math.random().toString(16).substr(2, 40)}`,
          balance: BigInt(Math.floor(Math.random() * 10000) * 10**18),
          creditLimit: BigInt(Math.floor(Math.random() * 5000) * 10**18),
          channels: []
        };
        delta.addedNodes = [newAccount];
      }
    }
    
    return delta;
  }

  generateConsensusEvent(state: NetworkState): ConsensusEvent | null {
    const entities = state.nodes.filter(n => n.type === NodeType.ENTITY) as EntityNode[];
    if (entities.length === 0) return null;
    
    const entity = entities[Math.floor(Math.random() * entities.length)];
    
    return {
      id: `consensus-${this.eventIdCounter++}`,
      entityId: entity.id,
      type: entity.consensusType,
      round: Math.floor(Math.random() * 1000),
      proposer: entity.consensusType === ConsensusType.PROPOSER_BASED ? 
        entity.validators[0] : undefined,
      validators: entity.validators.slice(0, Math.floor(Math.random() * entity.validators.length) + 1),
      timestamp: Date.now(),
      duration: Math.random() * 2000 + 500, // 0.5-2.5s
      success: Math.random() > 0.1
    };
  }

  generateCrossChainSwap(state: NetworkState): CrossChainSwap | null {
    const entities = state.nodes.filter(n => n.type === NodeType.ENTITY) as EntityNode[];
    if (entities.length < 2) return null;
    
    const sourceEntity = entities[Math.floor(Math.random() * entities.length)];
    const targetEntity = entities.filter(e => e.id !== sourceEntity.id)[
      Math.floor(Math.random() * (entities.length - 1))
    ];
    
    const sourceDepositary = state.nodes.find(n => n.id === sourceEntity.depositaryId) as DepositaryNode;
    const targetDepositary = state.nodes.find(n => n.id === targetEntity.depositaryId) as DepositaryNode;
    
    if (!sourceDepositary || !targetDepositary) return null;
    
    return {
      id: `swap-${this.swapIdCounter++}`,
      sourceChain: sourceDepositary.chainId,
      targetChain: targetDepositary.chainId,
      sourceEntity: sourceEntity.id,
      targetEntity: targetEntity.id,
      amount: BigInt(Math.floor(Math.random() * 10000) * 10**18),
      hashLock: `0x${Math.random().toString(16).substr(2, 64)}`,
      status: 'pending',
      timestamp: Date.now()
    };
  }
}