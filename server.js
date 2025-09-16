"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const socket_manager_1 = require("./lib/socket-manager");
// Load environment variables
dotenv.config();
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '4000', 10);
const useHttps = process.env.USE_HTTPS !== 'false'; // Default to HTTPS
// Configure Next.js
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
// Certificate paths
const certsDir = path.join(__dirname, 'certificates');
// Function to check if certificates exist and determine which to use
const getCertificateConfig = () => {
    // Check for production Bank SulutGo certificate first
    const prodCertPath = path.join(certsDir, 'star_banksulutgo_co_id.crt');
    const prodKeyPath = path.join(certsDir, 'star_banksulutgo_co_id.key');
    const prodCaPath = path.join(certsDir, 'DigiCertCA.crt');
    
    if (fs.existsSync(prodCertPath) && fs.existsSync(prodKeyPath)) {
        const config = {
            cert: fs.readFileSync(prodCertPath),
            key: fs.readFileSync(prodKeyPath)
        };
        // Include CA certificate if it exists
        if (fs.existsSync(prodCaPath)) {
            config.ca = fs.readFileSync(prodCaPath);
        }
        return { exists: true, config, type: 'production' };
    }
    
    // Fallback to localhost certificate
    const certPath = path.join(certsDir, 'localhost.pem');
    const keyPath = path.join(certsDir, 'localhost-key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return {
            exists: true,
            config: {
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath)
            },
            type: 'localhost'
        };
    }
    
    return { exists: false, config: null, type: null };
};
// Function to initialize Prisma
const initializePrisma = async () => {
    try {
        // Import Prisma client
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
        
        // Test connection with retry
        let retries = 5;
        while (retries > 0) {
            try {
                await prisma.$connect();
                console.log('✅ Prisma client connected successfully');
                
                // Store in global for reuse
                global.prisma = prisma;
                return prisma;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    console.error('❌ Failed to connect Prisma after all retries:', error);
                    throw error;
                }
                console.warn(`⚠️ Prisma connection failed, retrying... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    } catch (error) {
        console.error('❌ Failed to initialize Prisma:', error);
        throw error;
    }
};

// Function to start the server
const startServer = async () => {
    try {
        // Initialize Prisma first
        await initializePrisma();
        
        await app.prepare();
        let server;
        const certConfig = getCertificateConfig();
        if (useHttps && certConfig.exists) {
            // HTTPS Server
            const httpsOptions = certConfig.config;
            server = (0, https_1.createServer)(httpsOptions, async (req, res) => {
                try {
                    const parsedUrl = (0, url_1.parse)(req.url, true);
                    await handle(req, res, parsedUrl);
                }
                catch (err) {
                    console.error('Error occurred handling', req.url, err);
                    res.statusCode = 500;
                    res.end('Internal server error');
                }
            });
            server.once('error', (err) => {
                console.error('Server error:', err);
                process.exit(1);
            });
            server.listen(port, () => {
                // Initialize Socket.io
                const io = (0, socket_manager_1.initializeSocketServer)(server);
                console.log('╔════════════════════════════════════════════════════════╗');
                console.log('║                                                        ║');
                console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
                console.log('║                                                        ║');
                console.log('╚════════════════════════════════════════════════════════╝');
                console.log();
                console.log(`🔒 HTTPS Server ready on https://${hostname}:${port}`);
                console.log(`🚀 Environment: ${dev ? 'development' : 'production'}`);
                console.log(`🔌 Socket.io server initialized`);
                console.log(`📜 Using ${certConfig.type === 'production' ? 'Bank SulutGo wildcard' : 'localhost'} certificate`);
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
                    (0, http_1.createServer)((req, res) => {
                        var _a;
                        const host = (_a = req.headers.host) === null || _a === void 0 ? void 0 : _a.replace(/:\d+$/, '');
                        res.writeHead(301, {
                            Location: `https://${host}:${port}${req.url}`
                        });
                        res.end();
                    }).listen(httpPort, () => {
                        console.log(`🔄 HTTP redirect server running on port ${httpPort}`);
                    });
                }
            });
        }
        else {
            // Fallback to HTTP if certificates don't exist or HTTPS is disabled
            if (useHttps && !certConfig.exists) {
                console.warn('⚠️  HTTPS certificates not found!');
                console.log('   Run "npm run cert:generate" to create certificates');
                console.log('   Falling back to HTTP...\n');
            }
            server = (0, http_1.createServer)(async (req, res) => {
                try {
                    const parsedUrl = (0, url_1.parse)(req.url, true);
                    await handle(req, res, parsedUrl);
                }
                catch (err) {
                    console.error('Error occurred handling', req.url, err);
                    res.statusCode = 500;
                    res.end('Internal server error');
                }
            });
            server.once('error', (err) => {
                console.error('Server error:', err);
                process.exit(1);
            });
            server.listen(port, () => {
                // Initialize Socket.io
                const io = (0, socket_manager_1.initializeSocketServer)(server);
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
    }
    catch (error) {
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
