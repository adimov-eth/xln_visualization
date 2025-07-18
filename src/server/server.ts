import WebSocketServer from './websocket-server';

const WS_PORT = process.env.WS_PORT || 4001;

// Start the WebSocket server only
const wsServer = new WebSocketServer(Number(WS_PORT));
console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing WebSocket server');
  wsServer.stop();
});

export { wsServer };