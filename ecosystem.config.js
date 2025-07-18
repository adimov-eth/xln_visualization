module.exports = {
  apps: [
    {
      name: 'xln-websocket-server',
      script: 'src/server/server.ts',
      interpreter: 'ts-node',
      interpreter_args: '--project tsconfig.server.json',
      env: {
        NODE_ENV: 'development',
        WS_PORT: 4001
      },
      env_production: {
        NODE_ENV: 'production',
        WS_PORT: 4001
      },
      watch: ['src/server'],
      ignore_watch: ['node_modules', 'dist', 'logs'],
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      error_file: './logs/websocket-server-error.log',
      out_file: './logs/websocket-server-out.log',
      log_file: './logs/websocket-server-combined.log',
      time: true
    },
    {
      name: 'xln-webpack-dev-server',
      script: 'webpack',
      args: 'serve --mode development --port 4000',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      error_file: './logs/webpack-dev-server-error.log',
      out_file: './logs/webpack-dev-server-out.log',
      log_file: './logs/webpack-dev-server-combined.log',
      time: true
    }
  ]
};