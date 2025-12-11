import { createServer as createHttpsServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { parse } from 'url';
import next from 'next';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocketServer } from './lib/socket-manager';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'development'
  ? '.env.development'
  : '.env';

dotenv.config({ path: envFile });

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const useHttps = process.env.USE_HTTPS === 'true'; // Explicit true required for HTTPS

// Debug: Log environment variables
console.log('🔧 Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   USE_HTTPS: ${process.env.USE_HTTPS}`);
console.log(`   SSL_CERT_DIR: ${process.env.SSL_CERT_DIR}`);
console.log(`   SSL_CERT_FILE: ${process.env.SSL_CERT_FILE}`);
console.log(`   SSL_KEY_FILE: ${process.env.SSL_KEY_FILE}`);
console.log(`   PORT: ${port}`);
console.log(`   HOSTNAME: ${hostname}`);
console.log(`   useHttps resolved: ${useHttps}`);

// Configure Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Certificate paths - configurable via environment variables
const certsDir = process.env.SSL_CERT_DIR || path.join(process.cwd(), 'certificates');
const sslCertFile = process.env.SSL_CERT_FILE || 'localhost.pem';
const sslKeyFile = process.env.SSL_KEY_FILE || 'localhost-key.pem';

// Function to check if certificates exist
const certificatesExist = (): boolean => {
  const certPath = path.join(certsDir, sslCertFile);
  const keyPath = path.join(certsDir, sslKeyFile);
  return fs.existsSync(certPath) && fs.existsSync(keyPath);
};

// Function to get certificate paths
const getCertificatePaths = () => {
  return {
    cert: path.join(certsDir, sslCertFile),
    key: path.join(certsDir, sslKeyFile),
  };
};

// Function to start the server
const startServer = async () => {
  try {
    await app.prepare();
    
    let server: any;
    
    if (useHttps && certificatesExist()) {
      // HTTPS Server
      const certPaths = getCertificatePaths();
      const httpsOptions = {
        key: fs.readFileSync(certPaths.key),
        cert: fs.readFileSync(certPaths.cert),
      };

      console.log(`📜 Loading SSL certificates from:`);
      console.log(`   Certificate: ${certPaths.cert}`);
      console.log(`   Key: ${certPaths.key}`);
      
      server = createHttpsServer(httpsOptions, async (req, res) => {
        try {
          const parsedUrl = parse(req.url!, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error occurred handling', req.url, err);
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });
      
      server.once('error', (err: any) => {
        console.error('Server error:', err);
        process.exit(1);
      });
      
      server.listen(port, () => {
        // Initialize Socket.io
        const io = initializeSocketServer(server);
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log();
        console.log(`🔒 HTTPS Server ready on https://${hostname}:${port}`);
        console.log(`🚀 Environment: ${dev ? 'development' : 'production'}`);
        console.log(`🔌 Socket.io server initialized`);
        console.log();
          
          if (dev) {
            console.log('📝 Development Notes:');
            console.log('   - If you see a certificate warning, click "Advanced" → "Proceed"');
            console.log('   - Or run "npm run cert:generate" to regenerate certificates');
            console.log();
          }
          
          // Also create HTTP redirect server on port 80 (optional)
          if (process.env.REDIRECT_HTTP === 'true') {
            const httpPort = 80;
            createHttpServer((req, res) => {
              const host = req.headers.host?.replace(/:\d+$/, '');
              res.writeHead(301, {
                Location: `https://${host}:${port}${req.url}`
              });
              res.end();
            }).listen(httpPort, () => {
              console.log(`🔄 HTTP redirect server running on port ${httpPort}`);
            });
          }
        });
    } else {
      // Fallback to HTTP if certificates don't exist or HTTPS is disabled
      if (useHttps && !certificatesExist()) {
        console.warn('⚠️  HTTPS certificates not found!');
        console.log('   Run "npm run cert:generate" to create certificates');
        console.log('   Falling back to HTTP...\n');
      }
      
      server = createHttpServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url!, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error occurred handling', req.url, err);
          res.statusCode = 500;
          res.end('Internal server error');
        }
      });
      
      server.once('error', (err: any) => {
        console.error('Server error:', err);
        process.exit(1);
      });
      
      server.listen(port, () => {
          // Initialize Socket.io
          const io = initializeSocketServer(server);
          console.log('╔════════════════════════════════════════════════════════╗');
          console.log('║                                                        ║');
          console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
          console.log('║                                                        ║');
          console.log('╚════════════════════════════════════════════════════════╝');
          console.log();
          console.log(`⚠️  HTTP Server ready on http://${hostname}:${port}`);
          console.log(`🚀 Environment: ${dev ? 'development' : 'production'}`);
          console.log(`🔌 Socket.io server initialized`);
          console.log();
          console.log('⚠️  WARNING: Running on HTTP (not secure)');
          console.log('   For HTTPS, run "npm run cert:generate" then restart');
          console.log();
        });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();