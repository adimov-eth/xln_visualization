import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

// XLN Network Types based on PRD
export interface Entity {
  id: string;
  name: string;
  type: 'hub' | 'leaf' | 'gateway';
  address: string;
  publicKey: string;
  reputation: number;
  stake: number;
  status: 'active' | 'inactive' | 'suspended';
  metrics: {
    uptime: number;
    transactionVolume: number;
    channelCount: number;
    liquidity: number;
  };
  coordinates?: { x: number; y: number; z?: number };
}

export interface Channel {
  id: string;
  source: string;
  target: string;
  capacity: number;
  balance: number;
  state: 'open' | 'closing' | 'closed' | 'disputed';
  feeRate: number;
  lastUpdate: Date;
  metrics: {
    throughput: number;
    successRate: number;
    avgLatency: number;
  };
}

export interface Depositary {
  id: string;
  name: string;
  chain: 'ethereum' | 'bitcoin' | 'solana' | 'polygon';
  reserves: number;
  collateralizationRatio: number;
  validators: string[];
  consensusType: 'proposer' | 'gossip';
  status: 'synced' | 'syncing' | 'offline';
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  path: string[];
  hashLock?: string;
  timelock?: number;
}

export interface ConsensusEvent {
  id: string;
  type: 'propose' | 'vote' | 'commit' | 'finalize';
  round: number;
  proposer: string;
  validators: string[];
  signatures: string[];
  timestamp: Date;
  blockHeight: number;
}

export interface NetworkState {
  version: string;
  timestamp: Date;
  entities: Map<string, Entity>;
  channels: Map<string, Channel>;
  depositaries: Map<string, Depositary>;
  transactions: Transaction[];
  consensusEvents: ConsensusEvent[];
  metrics: {
    totalValueLocked: number;
    activeEntities: number;
    openChannels: number;
    dailyVolume: number;
    networkFees: number;
  };
}

// Test Data Generators
export class TestDataGenerator {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
    faker.seed(this.seed);
  }

  generateEntity(overrides?: Partial<Entity>): Entity {
    const types: Entity['type'][] = ['hub', 'leaf', 'gateway'];
    const statuses: Entity['status'][] = ['active', 'inactive', 'suspended'];

    return {
      id: uuidv4(),
      name: faker.company.name(),
      type: faker.helpers.arrayElement(types),
      address: faker.finance.ethereumAddress(),
      publicKey: faker.string.hexadecimal({ length: 64 }),
      reputation: faker.number.float({ min: 0, max: 100, precision: 0.1 }),
      stake: faker.number.float({ min: 1000, max: 1000000, precision: 0.01 }),
      status: faker.helpers.arrayElement(statuses),
      metrics: {
        uptime: faker.number.float({ min: 0.9, max: 1, precision: 0.001 }),
        transactionVolume: faker.number.int({ min: 0, max: 1000000 }),
        channelCount: faker.number.int({ min: 0, max: 100 }),
        liquidity: faker.number.float({ min: 0, max: 10000000, precision: 0.01 }),
      },
      coordinates: {
        x: faker.number.float({ min: -500, max: 500 }),
        y: faker.number.float({ min: -500, max: 500 }),
        z: faker.number.float({ min: -100, max: 100 }),
      },
      ...overrides,
    };
  }

  generateChannel(sourceId: string, targetId: string, overrides?: Partial<Channel>): Channel {
    const states: Channel['state'][] = ['open', 'closing', 'closed', 'disputed'];
    const capacity = faker.number.float({ min: 10000, max: 10000000, precision: 0.01 });

    return {
      id: uuidv4(),
      source: sourceId,
      target: targetId,
      capacity,
      balance: faker.number.float({ min: 0, max: capacity, precision: 0.01 }),
      state: faker.helpers.arrayElement(states),
      feeRate: faker.number.float({ min: 0.0001, max: 0.01, precision: 0.0001 }),
      lastUpdate: faker.date.recent({ days: 7 }),
      metrics: {
        throughput: faker.number.float({ min: 0, max: 1000, precision: 0.1 }),
        successRate: faker.number.float({ min: 0.8, max: 1, precision: 0.001 }),
        avgLatency: faker.number.int({ min: 10, max: 500 }),
      },
      ...overrides,
    };
  }

  generateDepositary(overrides?: Partial<Depositary>): Depositary {
    const chains: Depositary['chain'][] = ['ethereum', 'bitcoin', 'solana', 'polygon'];
    const consensusTypes: Depositary['consensusType'][] = ['proposer', 'gossip'];
    const statuses: Depositary['status'][] = ['synced', 'syncing', 'offline'];

    return {
      id: uuidv4(),
      name: `${faker.company.name()} Depositary`,
      chain: faker.helpers.arrayElement(chains),
      reserves: faker.number.float({ min: 1000000, max: 100000000, precision: 0.01 }),
      collateralizationRatio: faker.number.float({ min: 1.2, max: 2, precision: 0.01 }),
      validators: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () =>
        faker.finance.ethereumAddress()
      ),
      consensusType: faker.helpers.arrayElement(consensusTypes),
      status: faker.helpers.arrayElement(statuses),
      ...overrides,
    };
  }

  generateTransaction(entities: Entity[], overrides?: Partial<Transaction>): Transaction {
    const statuses: Transaction['status'][] = ['pending', 'confirmed', 'failed', 'expired'];
    const from = faker.helpers.arrayElement(entities);
    const to = faker.helpers.arrayElement(entities.filter(e => e.id !== from.id));
    
    // Generate realistic path through network
    const pathLength = faker.number.int({ min: 2, max: 5 });
    const path = [from.id];
    for (let i = 1; i < pathLength - 1; i++) {
      const intermediary = faker.helpers.arrayElement(
        entities.filter(e => !path.includes(e.id) && e.id !== to.id)
      );
      path.push(intermediary.id);
    }
    path.push(to.id);

    return {
      id: uuidv4(),
      from: from.id,
      to: to.id,
      amount: faker.number.float({ min: 1, max: 100000, precision: 0.01 }),
      fee: faker.number.float({ min: 0.01, max: 10, precision: 0.01 }),
      timestamp: faker.date.recent({ days: 1 }),
      status: faker.helpers.arrayElement(statuses),
      path,
      hashLock: faker.string.hexadecimal({ length: 64 }),
      timelock: faker.number.int({ min: 600, max: 3600 }), // 10 mins to 1 hour
      ...overrides,
    };
  }

  generateConsensusEvent(validators: string[], overrides?: Partial<ConsensusEvent>): ConsensusEvent {
    const types: ConsensusEvent['type'][] = ['propose', 'vote', 'commit', 'finalize'];
    const selectedValidators = faker.helpers.arrayElements(
      validators,
      faker.number.int({ min: Math.ceil(validators.length * 0.67), max: validators.length })
    );

    return {
      id: uuidv4(),
      type: faker.helpers.arrayElement(types),
      round: faker.number.int({ min: 1, max: 10000 }),
      proposer: faker.helpers.arrayElement(validators),
      validators: selectedValidators,
      signatures: selectedValidators.map(() => faker.string.hexadecimal({ length: 128 })),
      timestamp: faker.date.recent({ days: 1 }),
      blockHeight: faker.number.int({ min: 1000000, max: 2000000 }),
      ...overrides,
    };
  }

  generateNetworkState(config: {
    entityCount?: number;
    channelCount?: number;
    depositaryCount?: number;
    transactionCount?: number;
    consensusEventCount?: number;
  } = {}): NetworkState {
    const {
      entityCount = 50,
      channelCount = 100,
      depositaryCount = 5,
      transactionCount = 200,
      consensusEventCount = 20,
    } = config;

    // Generate entities
    const entities = new Map<string, Entity>();
    const entityArray: Entity[] = [];
    for (let i = 0; i < entityCount; i++) {
      const entity = this.generateEntity();
      entities.set(entity.id, entity);
      entityArray.push(entity);
    }

    // Generate channels between entities
    const channels = new Map<string, Channel>();
    for (let i = 0; i < channelCount; i++) {
      const source = faker.helpers.arrayElement(entityArray);
      const target = faker.helpers.arrayElement(entityArray.filter(e => e.id !== source.id));
      const channel = this.generateChannel(source.id, target.id);
      channels.set(channel.id, channel);
    }

    // Generate depositaries
    const depositaries = new Map<string, Depositary>();
    for (let i = 0; i < depositaryCount; i++) {
      const depositary = this.generateDepositary();
      depositaries.set(depositary.id, depositary);
    }

    // Generate transactions
    const transactions: Transaction[] = [];
    for (let i = 0; i < transactionCount; i++) {
      transactions.push(this.generateTransaction(entityArray));
    }

    // Generate consensus events
    const consensusEvents: ConsensusEvent[] = [];
    const allValidators = Array.from(depositaries.values()).flatMap(d => d.validators);
    for (let i = 0; i < consensusEventCount; i++) {
      consensusEvents.push(this.generateConsensusEvent(allValidators));
    }

    // Calculate network metrics
    const activeEntities = Array.from(entities.values()).filter(e => e.status === 'active').length;
    const openChannels = Array.from(channels.values()).filter(c => c.state === 'open').length;
    const totalValueLocked = Array.from(depositaries.values()).reduce((sum, d) => sum + d.reserves, 0);
    const dailyVolume = transactions
      .filter(t => t.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0);
    const networkFees = transactions.reduce((sum, t) => sum + t.fee, 0);

    return {
      version: '1.0.0',
      timestamp: new Date(),
      entities,
      channels,
      depositaries,
      transactions,
      consensusEvents,
      metrics: {
        totalValueLocked,
        activeEntities,
        openChannels,
        dailyVolume,
        networkFees,
      },
    };
  }

  // Generate stress test data
  generateLargeNetworkState(): NetworkState {
    return this.generateNetworkState({
      entityCount: 10000,
      channelCount: 50000,
      depositaryCount: 20,
      transactionCount: 100000,
      consensusEventCount: 1000,
    });
  }

  // Generate minimal test data
  generateMinimalNetworkState(): NetworkState {
    return this.generateNetworkState({
      entityCount: 3,
      channelCount: 2,
      depositaryCount: 1,
      transactionCount: 5,
      consensusEventCount: 2,
    });
  }

  // Generate network state with specific patterns
  generateNetworkWithHubs(hubCount: number = 5): NetworkState {
    const state = this.generateNetworkState();
    
    // Convert some entities to hubs with many connections
    const entities = Array.from(state.entities.values());
    for (let i = 0; i < Math.min(hubCount, entities.length); i++) {
      entities[i].type = 'hub';
      entities[i].metrics.channelCount = faker.number.int({ min: 50, max: 200 });
      entities[i].metrics.liquidity = faker.number.float({ min: 1000000, max: 10000000 });
    }

    return state;
  }

  // Generate failing transactions for testing
  generateFailingTransactions(count: number = 10): Transaction[] {
    const entities = Array.from({ length: 10 }, () => this.generateEntity());
    return Array.from({ length: count }, () =>
      this.generateTransaction(entities, {
        status: faker.helpers.arrayElement(['failed', 'expired']),
        amount: faker.number.float({ min: 1000000, max: 10000000 }), // Large amounts that might fail
      })
    );
  }
}

// Export singleton instance
export const testDataGenerator = new TestDataGenerator();

// Performance test data generator
export function generatePerformanceTestData(size: 'small' | 'medium' | 'large' | 'stress') {
  const configs = {
    small: { entityCount: 10, channelCount: 20, transactionCount: 50 },
    medium: { entityCount: 100, channelCount: 500, transactionCount: 1000 },
    large: { entityCount: 1000, channelCount: 5000, transactionCount: 10000 },
    stress: { entityCount: 10000, channelCount: 50000, transactionCount: 100000 },
  };

  return testDataGenerator.generateNetworkState(configs[size]);
}