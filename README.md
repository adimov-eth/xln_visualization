# XLN Network Interactive Visualization

Extended Lightning Network Interactive Visualization Dashboard built with React + D3.js + Socket.IO.

## Features

- **Real-time Network Visualization**: Force-directed graph with 10K+ nodes
- **Consensus Animation**: Particle effects showing consensus rounds
- **Entity & Channel Inspection**: Deep dive panels with detailed metrics
- **WebSocket Integration**: Real-time data streaming
- **Performance Optimized**: 60 FPS with React.memo optimizations
- **PM2 Process Management**: Production-ready deployment

## Quick Start

### Development

```bash
# Install dependencies
bun install

# Start development with PM2
bun run pm2:dev

# Or start with traditional method
bun start
```

### Production

```bash
# Build the application
bun run build
bun run build:server

# Start production with PM2
bun run pm2:start

# Monitor processes
bun run pm2:monit
```

## PM2 Commands

```bash
# Development
bun run pm2:dev          # Start development servers
bun run pm2:stop         # Stop all processes
bun run pm2:restart      # Restart all processes
bun run pm2:status       # Check process status
bun run pm2:logs         # View logs
bun run pm2:monit        # Monitor dashboard

# Production
bun run pm2:start        # Start production servers
bun run pm2:reload       # Zero-downtime reload
bun run pm2:delete       # Delete all processes
bun run pm2:flush        # Clear logs
```

## Architecture

### Services

- **WebSocket Server** (Port 4001): Real-time data streaming with Socket.IO
- **Development Server** (Port 4000): Webpack dev server with hot reload
- **Production Server** (Port 4000): Static file serving with `serve`

### Process Management

- **Development**: Single instance with file watching
- **Production**: Clustered instances with auto-restart and health monitoring

## Configuration

### Development (`ecosystem.config.js`)

- WebSocket server with TypeScript and file watching
- Webpack dev server with hot reload
- Single instance per service

### Production (`ecosystem.config.production.js`)

- Clustered WebSocket server for scalability
- Static file serving with multiple instances
- Health monitoring and auto-restart
- Log rotation and performance monitoring

## Logs

All logs are stored in the `logs/` directory:

- `websocket-server-*.log`: WebSocket server logs
- `webpack-dev-server-*.log`: Development server logs (dev only)
- `static-server-*.log`: Static file server logs (production only)

## Technology Stack

- **Frontend**: React 18, D3.js, TypeScript
- **Backend**: Node.js, Socket.IO, Express
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Build**: Webpack 5, TypeScript
- **Process Management**: PM2
- **Testing**: Bun Test, React Testing Library

## Project Structure

```
XLN/
├── src/
│   ├── d3-app/              # React visualization app
│   │   ├── components/      # React components
│   │   ├── services/        # WebSocket & consensus services
│   │   ├── utils/          # Utilities and mock data
│   │   └── types/          # TypeScript definitions
│   └── server/             # WebSocket server
├── tests/                  # Test suites
├── logs/                   # PM2 logs
├── ecosystem.config.js     # PM2 development config
├── ecosystem.config.production.js  # PM2 production config
└── webpack.config.js       # Webpack configuration
```

## Performance

- **60 FPS** visualization with optimized React rendering
- **Real-time** WebSocket data streaming
- **Clustered** production deployment
- **Auto-scaling** based on CPU cores
- **Memory monitoring** with automatic restart

## Monitoring

PM2 provides comprehensive monitoring:

- Process health and uptime
- Memory and CPU usage
- Auto-restart on crashes
- Log aggregation and rotation
- Performance metrics

View the monitoring dashboard:
```bash
bun run pm2:monit
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.