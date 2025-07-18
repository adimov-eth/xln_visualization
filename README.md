# XLN Network Interactive Visualization

A real-time, interactive visualization dashboard for the Extended Lightning Network (XLN), providing intuitive insights into network topology, consensus mechanisms, and cross-chain payment flows.

## Features

### Phase A - Foundation (Implemented)
- ✅ Force-directed network topology visualization
- ✅ Real-time WebSocket updates
- ✅ Interactive pan, zoom, and drag
- ✅ Layer-based filtering (Entity, Depositary, Channel)
- ✅ Metrics dashboard (TVL, node counts)
- ✅ Performance optimized for 10K+ nodes

### Coming Soon (Phase B-D)
- 🚧 Consensus visualization animations
- 🚧 Cross-chain flow animations
- 🚧 Time machine replay
- 🚧 Advanced search and filtering
- 🚧 3D visualization mode

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

The application will open at http://localhost:3000

## Architecture

The application uses a performance-first architecture:

- **Frontend**: React 18 + TypeScript + D3.js
- **State Management**: Zustand with immer
- **Real-time**: WebSocket with delta compression
- **Rendering**: Multi-layer approach (WebGL ready)
- **Testing**: Jest + React Testing Library

## Project Structure

```
src/d3-app/
├── components/        # React components
├── services/         # WebSocket, API services
├── types/           # TypeScript definitions
├── utils/           # Helper functions
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── styles/          # CSS modules
└── docs/            # Architecture documentation
```

## Performance

The visualization is optimized to handle:
- 10,000+ nodes at 60 FPS
- Real-time updates via WebSocket
- Sub-100ms interaction response time
- Progressive data loading

## Development

### Requirements
- Node.js >= 16.0.0
- npm >= 8.0.0

### Testing
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:performance   # Performance benchmarks
npm run test:accessibility # WCAG compliance
npm run test:visual        # Visual regression
```

### Code Quality
```bash
npm run lint       # ESLint
npm run type-check # TypeScript validation
```

## Documentation

- [Architecture Overview](./src/d3-app/ARCHITECTURE.md)
- [State Management](./src/d3-app/docs/STATE_MANAGEMENT.md)
- [WebGL Performance](./src/d3-app/docs/WEBGL_PERFORMANCE.md)
- [Data Flow](./src/d3-app/docs/DATA_FLOW.md)
- [Component Patterns](./src/d3-app/docs/COMPONENT_PATTERNS.md)
- [Plugin Development](./src/d3-app/docs/EXTENSIBILITY.md)

## License

Copyright (c) 2025 XLN Network