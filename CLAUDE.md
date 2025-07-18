# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XLN (Extended Lightning Network) is a Meta Layer 2 blockchain protocol implementing a pure functional state machine architecture with Byzantine Fault Tolerant (BFT) consensus. The project aims to solve blockchain fragmentation and create a unified payment network across multiple chains.

## Development Commands

### Running the Server
```bash
# For regular use
bun run src/server.ts

# For debugging
bun repl
await import('./debug.js');
```

### TypeScript Execution
The project uses Bun as the TypeScript runtime. No compilation step is needed - run TypeScript files directly with `bun`.

## Architecture Overview

### Core Components

1. **Server**: Root machine that aggregates messages every 100ms into blocks
   - No consensus between servers (each is independent)
   - Maintains state only for entities it participates in
   - Primary purpose: message forwarding and state organization

2. **Signer**: Manages private keys and entity-level consensus
   - Parent machine for entities
   - Handles proposal voting
   - Simple key-value mapping to entities

3. **Entity**: Account abstraction for wallets, DAOs, payment hubs, or dApps
   - All business logic lives here
   - State shared only between participants
   - Managed through proposals with signer quorum

4. **Channel**: Bilateral account for entity-to-entity communication

5. **Depositary**: Smart contract interface for on-chain reserves

### State Machine Model

The system follows a pure functional pattern:
```typescript
(prevState, input) → {nextState, outputs}
```

Key principles:
- Immutable state transitions
- Environment-based architecture (all state in `Env` object)
- Time-machine debugging with complete snapshot history
- 100ms tick intervals for block formation

### Consensus Mechanisms

Two modes supported:
- **Proposer-based**: Single proposer, multiple validators
- **Gossip-based**: All validators broadcast to each other

Weighted voting with configurable thresholds using BigInt for voting power calculations.

### Data Flow

1. Server aggregates messages every 100ms
2. Forms transaction maps and coordinates with signers
3. Creates Merkle trees from finalized blocks
4. Updates state and distributes to other servers
5. Entities process transactions through proposal system
6. Quorum approval required for state changes

## Key Implementation Details

### Message Processing (`processServerInput`)
- Merges duplicate entity inputs
- Processes server transactions (replica imports)
- Routes entity inputs to appropriate replicas
- Returns entity outputs for next tick

### Entity Processing (`processEntityInput`)
- Handles transaction mempool
- Manages proposal creation and voting
- Processes precommits and frame signatures
- Auto-proposes when proposer has pending transactions

### State Management
- In-memory JSON operations for MVP
- Planned LevelDB persistence with:
  - Mutable snapshots (by sequential ID)
  - Immutable snapshots (by hash)
- Complete state loaded at startup

## Future Implementation Plans

### Storage Layer
- LevelDB for block and state storage
- RLP encoding for efficient data representation
- DAG-based transaction storage
- Granular property point breakdown

### Security Evolution
- Current: API token-based authorization
- Planned: Full cryptographic verification with ethers.js
- Aggregated signature mechanism
- "Egg agents" for participant availability

### Cross-Chain Features
- HTLC-based atomic swaps
- Multi-asset support (ERC-20/721/1155)
- Cross-jurisdictional token exchange
- Depositary contracts on each chain

## Testing Approach

The codebase includes comprehensive demo scenarios in `server.ts`:
- Multi-entity consensus tests
- Corner case handling (empty mempools, batch operations)
- Byzantine fault tolerance verification
- Time-machine debugging capabilities

Run the demo:
```bash
bun run src/server.ts
```

## Important Notes

- No build step required - TypeScript runs directly via Bun
- Environment detection for browser compatibility included
- Debug logging controlled via `debug` package patterns
- Deterministic execution with no randomness for reproducibility