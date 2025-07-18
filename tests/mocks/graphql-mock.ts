import { graphql, GraphQLSchema, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { testDataGenerator } from '../utils/test-data-generators';

// GraphQL Schema based on XLN requirements
const typeDefs = `
  scalar Date
  scalar JSON

  type Entity {
    id: ID!
    name: String!
    type: EntityType!
    address: String!
    publicKey: String!
    reputation: Float!
    stake: Float!
    status: EntityStatus!
    metrics: EntityMetrics!
    coordinates: Coordinates
    channels: [Channel!]!
    transactions(limit: Int, offset: Int): [Transaction!]!
  }

  type Channel {
    id: ID!
    source: Entity!
    target: Entity!
    capacity: Float!
    balance: Float!
    state: ChannelState!
    feeRate: Float!
    lastUpdate: Date!
    metrics: ChannelMetrics!
  }

  type Depositary {
    id: ID!
    name: String!
    chain: ChainType!
    reserves: Float!
    collateralizationRatio: Float!
    validators: [String!]!
    consensusType: ConsensusType!
    status: DepositaryStatus!
  }

  type Transaction {
    id: ID!
    from: Entity!
    to: Entity!
    amount: Float!
    fee: Float!
    timestamp: Date!
    status: TransactionStatus!
    path: [Entity!]!
    hashLock: String
    timelock: Int
  }

  type ConsensusEvent {
    id: ID!
    type: ConsensusEventType!
    round: Int!
    proposer: String!
    validators: [String!]!
    signatures: [String!]!
    timestamp: Date!
    blockHeight: Int!
  }

  type EntityMetrics {
    uptime: Float!
    transactionVolume: Float!
    channelCount: Int!
    liquidity: Float!
  }

  type ChannelMetrics {
    throughput: Float!
    successRate: Float!
    avgLatency: Int!
  }

  type NetworkMetrics {
    totalValueLocked: Float!
    activeEntities: Int!
    openChannels: Int!
    dailyVolume: Float!
    networkFees: Float!
  }

  type Coordinates {
    x: Float!
    y: Float!
    z: Float
  }

  enum EntityType {
    HUB
    LEAF
    GATEWAY
  }

  enum EntityStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
  }

  enum ChannelState {
    OPEN
    CLOSING
    CLOSED
    DISPUTED
  }

  enum ChainType {
    ETHEREUM
    BITCOIN
    SOLANA
    POLYGON
  }

  enum ConsensusType {
    PROPOSER
    GOSSIP
  }

  enum DepositaryStatus {
    SYNCED
    SYNCING
    OFFLINE
  }

  enum TransactionStatus {
    PENDING
    CONFIRMED
    FAILED
    EXPIRED
  }

  enum ConsensusEventType {
    PROPOSE
    VOTE
    COMMIT
    FINALIZE
  }

  type Query {
    # Entity queries
    entity(id: ID!): Entity
    entities(
      type: EntityType
      status: EntityStatus
      limit: Int
      offset: Int
    ): [Entity!]!
    
    # Channel queries
    channel(id: ID!): Channel
    channels(
      state: ChannelState
      sourceId: ID
      targetId: ID
      limit: Int
      offset: Int
    ): [Channel!]!
    
    # Depositary queries
    depositary(id: ID!): Depositary
    depositaries(
      chain: ChainType
      status: DepositaryStatus
    ): [Depositary!]!
    
    # Transaction queries
    transaction(id: ID!): Transaction
    transactions(
      status: TransactionStatus
      fromId: ID
      toId: ID
      limit: Int
      offset: Int
    ): [Transaction!]!
    
    # Consensus queries
    consensusEvents(
      type: ConsensusEventType
      round: Int
      limit: Int
      offset: Int
    ): [ConsensusEvent!]!
    
    # Network metrics
    networkMetrics: NetworkMetrics!
    
    # Search
    search(query: String!): SearchResults!
  }

  type Mutation {
    # Channel operations
    openChannel(sourceId: ID!, targetId: ID!, capacity: Float!): Channel!
    closeChannel(channelId: ID!): Channel!
    updateChannelBalance(channelId: ID!, balance: Float!): Channel!
    
    # Transaction operations
    sendTransaction(
      fromId: ID!
      toId: ID!
      amount: Float!
    ): Transaction!
    
    # Entity operations
    updateEntityStatus(entityId: ID!, status: EntityStatus!): Entity!
    updateEntityMetrics(entityId: ID!, metrics: JSON!): Entity!
  }

  type Subscription {
    # Real-time updates
    entityUpdated(entityId: ID): Entity!
    channelUpdated(channelId: ID): Channel!
    transactionUpdated(transactionId: ID): Transaction!
    consensusEvent: ConsensusEvent!
    metricsUpdated: NetworkMetrics!
    alert: Alert!
  }

  type Alert {
    id: ID!
    level: AlertLevel!
    title: String!
    message: String!
    entityId: ID
    channelId: ID
    timestamp: Date!
  }

  enum AlertLevel {
    INFO
    WARNING
    ERROR
    CRITICAL
  }

  type SearchResults {
    entities: [Entity!]!
    channels: [Channel!]!
    transactions: [Transaction!]!
    totalCount: Int!
  }
`;

// Create mock resolvers
export function createMockResolvers(networkState = testDataGenerator.generateNetworkState()) {
  const entities = Array.from(networkState.entities.values());
  const channels = Array.from(networkState.channels.values());
  const depositaries = Array.from(networkState.depositaries.values());
  
  return {
    Query: {
      entity: (_: any, { id }: { id: string }) => {
        return networkState.entities.get(id) || null;
      },
      
      entities: (_: any, args: any) => {
        let result = entities;
        
        if (args.type) {
          result = result.filter(e => e.type.toUpperCase() === args.type);
        }
        
        if (args.status) {
          result = result.filter(e => e.status.toUpperCase() === args.status);
        }
        
        const offset = args.offset || 0;
        const limit = args.limit || result.length;
        
        return result.slice(offset, offset + limit);
      },
      
      channel: (_: any, { id }: { id: string }) => {
        return networkState.channels.get(id) || null;
      },
      
      channels: (_: any, args: any) => {
        let result = channels;
        
        if (args.state) {
          result = result.filter(c => c.state.toUpperCase() === args.state);
        }
        
        if (args.sourceId) {
          result = result.filter(c => c.source === args.sourceId);
        }
        
        if (args.targetId) {
          result = result.filter(c => c.target === args.targetId);
        }
        
        const offset = args.offset || 0;
        const limit = args.limit || result.length;
        
        return result.slice(offset, offset + limit);
      },
      
      networkMetrics: () => networkState.metrics,
      
      search: (_: any, { query }: { query: string }) => {
        const searchTerm = query.toLowerCase();
        
        const matchingEntities = entities.filter(e => 
          e.name.toLowerCase().includes(searchTerm) ||
          e.id.includes(searchTerm) ||
          e.type.includes(searchTerm)
        );
        
        const matchingChannels = channels.filter(c =>
          c.id.includes(searchTerm)
        );
        
        const matchingTransactions = networkState.transactions.filter(t =>
          t.id.includes(searchTerm)
        );
        
        return {
          entities: matchingEntities,
          channels: matchingChannels,
          transactions: matchingTransactions,
          totalCount: matchingEntities.length + matchingChannels.length + matchingTransactions.length,
        };
      },
    },
    
    Mutation: {
      openChannel: (_: any, args: any) => {
        const newChannel = testDataGenerator.generateChannel(args.sourceId, args.targetId, {
          capacity: args.capacity,
          state: 'open',
        });
        networkState.channels.set(newChannel.id, newChannel);
        return newChannel;
      },
      
      sendTransaction: (_: any, args: any) => {
        const from = networkState.entities.get(args.fromId);
        const to = networkState.entities.get(args.toId);
        
        if (!from || !to) {
          throw new Error('Invalid entity ID');
        }
        
        const transaction = testDataGenerator.generateTransaction(
          [from, to],
          {
            from: args.fromId,
            to: args.toId,
            amount: args.amount,
            status: 'pending',
          }
        );
        
        networkState.transactions.push(transaction);
        return transaction;
      },
    },
    
    Subscription: {
      entityUpdated: {
        subscribe: () => ({
          [Symbol.asyncIterator]: async function* () {
            while (true) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const randomEntity = entities[Math.floor(Math.random() * entities.length)];
              randomEntity.metrics.transactionVolume += Math.random() * 100;
              yield { entityUpdated: randomEntity };
            }
          },
        }),
      },
      
      metricsUpdated: {
        subscribe: () => ({
          [Symbol.asyncIterator]: async function* () {
            while (true) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              networkState.metrics.dailyVolume *= 1 + (Math.random() - 0.5) * 0.1;
              networkState.metrics.networkFees *= 1 + (Math.random() - 0.5) * 0.05;
              yield { metricsUpdated: networkState.metrics };
            }
          },
        }),
      },
    },
    
    // Type resolvers for nested fields
    Entity: {
      channels: (entity: any) => {
        return channels.filter(c => c.source === entity.id || c.target === entity.id);
      },
      transactions: (entity: any, args: any) => {
        let txs = networkState.transactions.filter(t => 
          t.from === entity.id || t.to === entity.id
        );
        
        const offset = args.offset || 0;
        const limit = args.limit || txs.length;
        
        return txs.slice(offset, offset + limit);
      },
    },
    
    Channel: {
      source: (channel: any) => networkState.entities.get(channel.source),
      target: (channel: any) => networkState.entities.get(channel.target),
    },
    
    Transaction: {
      from: (transaction: any) => networkState.entities.get(transaction.from),
      to: (transaction: any) => networkState.entities.get(transaction.to),
      path: (transaction: any) => transaction.path.map((id: string) => 
        networkState.entities.get(id)
      ).filter(Boolean),
    },
  };
}

// Create executable schema
export function createMockSchema(networkState = testDataGenerator.generateNetworkState()) {
  return makeExecutableSchema({
    typeDefs,
    resolvers: createMockResolvers(networkState),
  });
}

// Create mock GraphQL server
export class MockGraphQLServer {
  private schema: GraphQLSchema;
  private networkState: any;

  constructor(networkState = testDataGenerator.generateNetworkState()) {
    this.networkState = networkState;
    this.schema = createMockSchema(networkState);
  }

  async execute(query: string, variables?: any) {
    const result = await graphql({
      schema: this.schema,
      source: query,
      variableValues: variables,
    });
    
    return result;
  }

  getNetworkState() {
    return this.networkState;
  }

  updateNetworkState(updates: Partial<any>) {
    Object.assign(this.networkState, updates);
  }
}

// Export test queries
export const testQueries = {
  getEntity: `
    query GetEntity($id: ID!) {
      entity(id: $id) {
        id
        name
        type
        status
        metrics {
          uptime
          transactionVolume
          channelCount
          liquidity
        }
        channels {
          id
          state
          capacity
          balance
        }
      }
    }
  `,
  
  getEntities: `
    query GetEntities($type: EntityType, $status: EntityStatus, $limit: Int) {
      entities(type: $type, status: $status, limit: $limit) {
        id
        name
        type
        status
      }
    }
  `,
  
  getNetworkMetrics: `
    query GetNetworkMetrics {
      networkMetrics {
        totalValueLocked
        activeEntities
        openChannels
        dailyVolume
        networkFees
      }
    }
  `,
  
  search: `
    query Search($query: String!) {
      search(query: $query) {
        entities {
          id
          name
          type
        }
        channels {
          id
          state
        }
        totalCount
      }
    }
  `,
  
  sendTransaction: `
    mutation SendTransaction($fromId: ID!, $toId: ID!, $amount: Float!) {
      sendTransaction(fromId: $fromId, toId: $toId, amount: $amount) {
        id
        status
        amount
        fee
      }
    }
  `,
  
  subscribeToMetrics: `
    subscription MetricsUpdated {
      metricsUpdated {
        totalValueLocked
        activeEntities
        openChannels
        dailyVolume
        networkFees
      }
    }
  `,
};