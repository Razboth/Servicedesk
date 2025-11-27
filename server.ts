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
const useHttps = process.env.USE_HTTPS !== 'false'; // Default to HTTPS

// Configure Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Certificate paths
const certsDir = path.join(process.cwd(), 'certificates');

// Function to check if Bank SulutGo production certificates exist
const prodCertificatesExist = (): boolean => {
  const certPath = path.join(certsDir, 'star_banksulutgo_co_id.crt');
  const keyPath = path.join(certsDir, 'star_banksulutgo_co_id.key');
  const caPath = path.join(certsDir, 'DigiCertCA.crt');
  return fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.existsSync(caPath);
};

// Function to check if localhost development certificates exist
const devCertificatesExist = (): boolean => {
  const certPath = path.join(certsDir, 'localhost.pem');
  const keyPath = path.join(certsDir, 'localhost-key.pem');
  return fs.existsSync(certPath) && fs.existsSync(keyPath);
};

// Function to start the server
const startServer = async () => {
  try {
    await app.prepare();
    
    let server: any;

    // Determine which certificates to use based on environment
    const useProductionCerts = !dev && prodCertificatesExist();
    const useDevelopmentCerts = dev && devCertificatesExist();

    if (useHttps && (useProductionCerts || useDevelopmentCerts)) {
      // HTTPS Server with appropriate certificate
      let httpsOptions: any;

      if (useProductionCerts) {
        // Production: Use Bank SulutGo wildcard certificate
        httpsOptions = {
          key: fs.readFileSync(path.join(certsDir, 'star_banksulutgo_co_id.key')),
          cert: fs.readFileSync(path.join(certsDir, 'star_banksulutgo_co_id.crt')),
          ca: fs.readFileSync(path.join(certsDir, 'DigiCertCA.crt')),
        };
        console.log('🔒 Using Bank SulutGo wildcard certificate');
      } else {
        // Development: Use localhost self-signed certificate
        httpsOptions = {
          key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
          cert: fs.readFileSync(path.join(certsDir, 'localhost.pem')),
        };
        console.log('🔒 Using localhost self-signed certificate');
      }

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
              // Omit port 443 from URL (default HTTPS port)
              const redirectUrl = port === 443
                ? `https://${host}${req.url}`
                : `https://${host}:${port}${req.url}`;
              res.writeHead(301, {
                Location: redirectUrl
              });
              res.end();
            }).listen(httpPort, () => {
              console.log(`🔄 HTTP redirect server running on port ${httpPort}`);
            });
          }
        });
    } else {
      // Fallback to HTTP if certificates don't exist or HTTPS is disabled
      if (useHttps && !useProductionCerts && !useDevelopmentCerts) {
        console.warn('⚠️  HTTPS certificates not found!');
        if (!dev) {
          console.log('   Production certificates (star_banksulutgo_co_id.*) not found in certificates folder');
        } else {
          console.log('   Development certificates (localhost.*) not found');
          console.log('   Run "npm run cert:generate" to create certificates');
        }
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