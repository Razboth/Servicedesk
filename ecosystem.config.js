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
      PORT: 443,
      HOSTNAME: '0.0.0.0',
      USE_HTTPS: 'true',
      // SSL Certificate configuration for Bank SulutGo
      SSL_CERT_DIR: './certificates',
      SSL_CERT_FILE: 'star_banksulutgo_co_id.crt',       // Certificate file
      SSL_KEY_FILE: 'star_banksulutgo_co_id.key',    // Private key file
      NEXTAUTH_URL: 'https://hddev.bsg.id',
      NEXT_PUBLIC_APP_URL: 'https://hddev.bsg.id',
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
    script: 'node',
    args: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      USE_HTTPS: 'true',
      NEXTAUTH_URL: 'https://199.90.10.215:3000',
      NEXT_PUBLIC_APP_URL: 'https://199.90.10.215:3000',
      DATABASE_URL: 'postgresql://postgres:admin@localhost:5432/servicedesk_database_development?schema=public'
    },

    error_file: './logs/pm2-dev-error.log',
    out_file: './logs/pm2-dev-out.log',
    merge_logs: true,
    time: true,

    restart_delay: 4000,
    kill_timeout: 3000,
    listen_timeout: 10000,
    min_uptime: '10s',
    max_restarts: 10,

    ignore_watch: ['node_modules', '.git', 'logs', '.next', 'public/uploads'],
    node_args: '--max-old-space-size=2048'
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
  },
  {
    // SLA Breach Checker Cron Job
    // Runs every 15 minutes to check for SLA breaches and send notifications
    name: 'bsg-sla-checker',
    script: 'node',
    args: '-e "const https = require(\'https\'); const options = {hostname: \'localhost\', port: 443, path: \'/api/cron/sla-check?key=\' + (process.env.SLA_CRON_SECRET || \'\'), method: \'GET\', rejectUnauthorized: false}; const req = https.request(options, (res) => { let data = \'\'; res.on(\'data\', c => data += c); res.on(\'end\', () => console.log(new Date().toISOString() + \' SLA Check:\', data)); }); req.on(\'error\', console.error); req.end();"',
    cron_restart: '*/15 * * * *',
    autorestart: false,
    watch: false,
    instances: 1,
    exec_mode: 'fork',

    env: {
      NODE_ENV: 'production',
      SLA_CRON_SECRET: process.env.SLA_CRON_SECRET || 'change-this-secret'
    },

    error_file: './logs/pm2-sla-checker-error.log',
    out_file: './logs/pm2-sla-checker-out.log',
    merge_logs: true,
    time: true
  }]
};
