module.exports = {
  apps: [
    {
      name: 'xln-websocket-server',
      script: 'dist/server/server.js',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 4001
      },
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      error_file: './logs/websocket-server-error.log',
      out_file: './logs/websocket-server-out.log',
      log_file: './logs/websocket-server-combined.log',
      time: true,
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      // Auto-restart on crashes
      autorestart: true,
      // Graceful shutdown
      kill_timeout: 5000,
      // Performance monitoring
      pmx: true,
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'xln-static-server',
      script: 'serve',
      args: '-s dist -l 4000',
      env: {
        NODE_ENV: 'production'
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      error_file: './logs/static-server-error.log',
      out_file: './logs/static-server-out.log',
      log_file: './logs/static-server-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      kill_timeout: 5000,
      pmx: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};