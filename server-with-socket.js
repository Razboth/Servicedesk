const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocketServer } = require('./lib/services/socket.service');
const { verifyEmailConfiguration } = require('./lib/services/email.service');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  initSocketServer(httpServer);

  // Verify email configuration
  verifyEmailConfiguration().then((isConfigured) => {
    if (isConfigured) {
      console.log('✅ Email service is configured and ready');
    } else {
      console.warn('⚠️ Email service is not configured. Please check your environment variables:');
      console.warn('   - EMAIL_SERVER_HOST');
      console.warn('   - EMAIL_SERVER_PORT');
      console.warn('   - EMAIL_SERVER_USER');
      console.warn('   - EMAIL_SERVER_PASSWORD');
    }
  });

  // Start server
  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.io ready for real-time updates`);
      console.log(`📧 Email notifications ${process.env.EMAIL_SERVER_HOST ? 'enabled' : 'disabled'}`);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});