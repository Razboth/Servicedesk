module.exports = {
  apps: [{
    // Application name
    name: 'bsg-servicedesk',
    
    // Script to start the application with Socket.io support
    script: 'node',
    args: 'server.js',
    
    // Cluster mode for better performance (must use fork for Socket.io)
    instances: 1,
    exec_mode: 'fork',
    
    // Auto restart on crash
    autorestart: true,
    watch: false,
    
    // Maximum memory before restart (useful to prevent memory leaks)
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOSTNAME: '0.0.0.0',
      USE_HTTPS: 'false',
      NEXTAUTH_URL: 'http://localhost:4000',
      DATABASE_URL: 'postgresql://postgres:admin@localhost:5432/servicedesk_database?schema=public'
    },
    
    // Log configuration
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    time: true,
    
    // Restart delay
    restart_delay: 4000,
    
    // Kill timeout
    kill_timeout: 3000,
    
    // Listen timeout
    listen_timeout: 10000,
    
    // Minimum uptime before considered successfully started
    min_uptime: '10s',
    
    // Maximum restart within 1 minute
    max_restarts: 10,
    
    // Ignore watch patterns
    ignore_watch: ['node_modules', '.git', 'logs', '.next', 'public/uploads'],
    
    // Post setup commands
    post_update: ['npm install'],
    
    // Interpreter arguments
    node_args: '--max-old-space-size=2048'
  },
  {
    // Development mode configuration
    name: 'bsg-servicedesk-dev',
    script: 'npm',
    args: 'run dev:https',
    instances: 1,
    exec_mode: 'fork',
    autorestart: false,
    watch: true,
    
    env: {
      NODE_ENV: 'development',
      PORT: 3001,
      USE_HTTPS: true,
      HOSTNAME: 'localhost'
    },
    
    error_file: './logs/pm2-dev-error.log',
    out_file: './logs/pm2-dev-out.log',
    merge_logs: true,
    time: true,
    
    ignore_watch: ['node_modules', '.git', 'logs', '.next', 'public/uploads', '*.log']
  },
  {
    // Network Monitoring Service
    name: 'bsg-monitoring',
    script: 'scripts/start-monitoring.ts',
    interpreter: 'tsx',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://postgres:admin@localhost:5432/servicedesk_database?schema=public',
      MONITORING_ENABLED: 'true'
    },
    
    error_file: './logs/pm2-monitoring-error.log',
    out_file: './logs/pm2-monitoring-out.log',
    merge_logs: true,
    time: true,
    
    restart_delay: 5000,
    kill_timeout: 3000,
    min_uptime: '30s',
    max_restarts: 5,
    
    args: 'start'
  }]
};