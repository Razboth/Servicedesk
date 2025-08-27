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
// Load environment variables
dotenv.config();
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const useHttps = process.env.USE_HTTPS !== 'false'; // Default to HTTPS
// Configure Next.js
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
// Certificate paths
const certsDir = path.join(__dirname, 'certificates');
// Function to check if certificates exist
const certificatesExist = () => {
    // Use the wildcard certificate for *.banksulutgo.co.id
    const certPath = path.join(certsDir, 'star_banksulutgo_co_id.crt');
    const keyPath = path.join(certsDir, 'star_banksulutgo_co_id.key');
    const caPath = path.join(certsDir, 'DigiCertCA.crt');
    return fs.existsSync(certPath) && fs.existsSync(keyPath);
};
// Function to start the server
const startServer = async () => {
    try {
        await app.prepare();
        if (useHttps && certificatesExist()) {
            // HTTPS Server with proper certificate chain
            const httpsOptions = {
                key: fs.readFileSync(path.join(certsDir, 'star_banksulutgo_co_id.key')),
                cert: fs.readFileSync(path.join(certsDir, 'star_banksulutgo_co_id.crt')),
                ca: fs.existsSync(path.join(certsDir, 'DigiCertCA.crt')) 
                    ? fs.readFileSync(path.join(certsDir, 'DigiCertCA.crt'))
                    : undefined
            };
            (0, https_1.createServer)(httpsOptions, async (req, res) => {
                try {
                    const parsedUrl = (0, url_1.parse)(req.url, true);
                    await handle(req, res, parsedUrl);
                }
                catch (err) {
                    console.error('Error occurred handling', req.url, err);
                    res.statusCode = 500;
                    res.end('Internal server error');
                }
            })
                .once('error', (err) => {
                console.error('Server error:', err);
                process.exit(1);
            })
                .listen(port, () => {
                console.log('╔════════════════════════════════════════════════════════╗');
                console.log('║                                                        ║');
                console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
                console.log('║                                                        ║');
                console.log('╚════════════════════════════════════════════════════════╝');
                console.log();
                console.log(`🔒 HTTPS Server ready on https://${hostname}:${port}`);
                console.log(`🚀 Environment: ${dev ? 'development' : 'production'}`);
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
        }
        else {
            // Fallback to HTTP if certificates don't exist or HTTPS is disabled
            if (useHttps && !certificatesExist()) {
                console.warn('⚠️  HTTPS certificates not found!');
                console.log('   Run "npm run cert:generate" to create certificates');
                console.log('   Falling back to HTTP...\n');
            }
            (0, http_1.createServer)(async (req, res) => {
                try {
                    const parsedUrl = (0, url_1.parse)(req.url, true);
                    await handle(req, res, parsedUrl);
                }
                catch (err) {
                    console.error('Error occurred handling', req.url, err);
                    res.statusCode = 500;
                    res.end('Internal server error');
                }
            })
                .once('error', (err) => {
                console.error('Server error:', err);
                process.exit(1);
            })
                .listen(port, () => {
                console.log('╔════════════════════════════════════════════════════════╗');
                console.log('║                                                        ║');
                console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
                console.log('║                                                        ║');
                console.log('╚════════════════════════════════════════════════════════╝');
                console.log();
                console.log(`⚠️  HTTP Server ready on http://${hostname}:${port}`);
                console.log(`🚀 Environment: ${dev ? 'development' : 'production'}`);
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
