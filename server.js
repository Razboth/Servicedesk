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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var https_1 = require("https");
var http_1 = require("http");
var url_1 = require("url");
var next_1 = __importDefault(require("next"));
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var dotenv = __importStar(require("dotenv"));
var socket_manager_1 = require("./lib/socket-manager");
// Load environment variables based on NODE_ENV
var envFile = process.env.NODE_ENV === 'development'
    ? '.env.development'
    : '.env';
dotenv.config({ path: envFile });
var dev = process.env.NODE_ENV !== 'production';
var hostname = process.env.HOSTNAME || 'localhost';
var port = parseInt(process.env.PORT || '3000', 10);
var useHttps = process.env.USE_HTTPS === 'true'; // Explicit true required for HTTPS
// Debug: Log environment variables
console.log('🔧 Configuration:');
console.log("   NODE_ENV: ".concat(process.env.NODE_ENV));
console.log("   USE_HTTPS: ".concat(process.env.USE_HTTPS));
console.log("   SSL_CERT_DIR: ".concat(process.env.SSL_CERT_DIR));
console.log("   SSL_CERT_FILE: ".concat(process.env.SSL_CERT_FILE));
console.log("   SSL_KEY_FILE: ".concat(process.env.SSL_KEY_FILE));
console.log("   PORT: ".concat(port));
console.log("   HOSTNAME: ".concat(hostname));
console.log("   useHttps resolved: ".concat(useHttps));
// Configure Next.js
var app = (0, next_1.default)({ dev: dev, hostname: hostname, port: port });
var handle = app.getRequestHandler();
// Certificate paths - configurable via environment variables
var certsDir = process.env.SSL_CERT_DIR || path.join(process.cwd(), 'certificates');
var sslCertFile = process.env.SSL_CERT_FILE || 'localhost.pem';
var sslKeyFile = process.env.SSL_KEY_FILE || 'localhost-key.pem';
// Function to check if certificates exist
var certificatesExist = function () {
    var certPath = path.join(certsDir, sslCertFile);
    var keyPath = path.join(certsDir, sslKeyFile);
    return fs.existsSync(certPath) && fs.existsSync(keyPath);
};
// Function to get certificate paths
var getCertificatePaths = function () {
    return {
        cert: path.join(certsDir, sslCertFile),
        key: path.join(certsDir, sslKeyFile),
    };
};
// Function to start the server
var startServer = function () { return __awaiter(void 0, void 0, void 0, function () {
    var server_1, certPaths, httpsOptions, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, app.prepare()];
            case 1:
                _a.sent();
                if (useHttps && certificatesExist()) {
                    certPaths = getCertificatePaths();
                    httpsOptions = {
                        key: fs.readFileSync(certPaths.key),
                        cert: fs.readFileSync(certPaths.cert),
                    };
                    console.log("\uD83D\uDCDC Loading SSL certificates from:");
                    console.log("   Certificate: ".concat(certPaths.cert));
                    console.log("   Key: ".concat(certPaths.key));
                    server_1 = (0, https_1.createServer)(httpsOptions, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
                        var parsedUrl, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    parsedUrl = (0, url_1.parse)(req.url, true);
                                    return [4 /*yield*/, handle(req, res, parsedUrl)];
                                case 1:
                                    _a.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_1 = _a.sent();
                                    console.error('Error occurred handling', req.url, err_1);
                                    res.statusCode = 500;
                                    res.end('Internal server error');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    server_1.once('error', function (err) {
                        console.error('Server error:', err);
                        process.exit(1);
                    });
                    server_1.listen(port, function () {
                        // Initialize Socket.io
                        var io = (0, socket_manager_1.initializeSocketServer)(server_1);
                        console.log('╔════════════════════════════════════════════════════════╗');
                        console.log('║                                                        ║');
                        console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
                        console.log('║                                                        ║');
                        console.log('╚════════════════════════════════════════════════════════╝');
                        console.log();
                        console.log("\uD83D\uDD12 HTTPS Server ready on https://".concat(hostname, ":").concat(port));
                        console.log("\uD83D\uDE80 Environment: ".concat(dev ? 'development' : 'production'));
                        console.log("\uD83D\uDD0C Socket.io server initialized");
                        console.log();
                        if (dev) {
                            console.log('📝 Development Notes:');
                            console.log('   - If you see a certificate warning, click "Advanced" → "Proceed"');
                            console.log('   - Or run "npm run cert:generate" to regenerate certificates');
                            console.log();
                        }
                        // Also create HTTP redirect server on port 80 (optional)
                        if (process.env.REDIRECT_HTTP === 'true') {
                            var httpPort_1 = 80;
                            (0, http_1.createServer)(function (req, res) {
                                var _a;
                                var host = (_a = req.headers.host) === null || _a === void 0 ? void 0 : _a.replace(/:\d+$/, '');
                                res.writeHead(301, {
                                    Location: "https://".concat(host, ":").concat(port).concat(req.url)
                                });
                                res.end();
                            }).listen(httpPort_1, function () {
                                console.log("\uD83D\uDD04 HTTP redirect server running on port ".concat(httpPort_1));
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
                    server_1 = (0, http_1.createServer)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
                        var parsedUrl, err_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    parsedUrl = (0, url_1.parse)(req.url, true);
                                    return [4 /*yield*/, handle(req, res, parsedUrl)];
                                case 1:
                                    _a.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_2 = _a.sent();
                                    console.error('Error occurred handling', req.url, err_2);
                                    res.statusCode = 500;
                                    res.end('Internal server error');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    server_1.once('error', function (err) {
                        console.error('Server error:', err);
                        process.exit(1);
                    });
                    server_1.listen(port, function () {
                        // Initialize Socket.io
                        var io = (0, socket_manager_1.initializeSocketServer)(server_1);
                        console.log('╔════════════════════════════════════════════════════════╗');
                        console.log('║                                                        ║');
                        console.log('║     🏦 Bank SulutGo ServiceDesk Server Started        ║');
                        console.log('║                                                        ║');
                        console.log('╚════════════════════════════════════════════════════════╝');
                        console.log();
                        console.log("\u26A0\uFE0F  HTTP Server ready on http://".concat(hostname, ":").concat(port));
                        console.log("\uD83D\uDE80 Environment: ".concat(dev ? 'development' : 'production'));
                        console.log("\uD83D\uDD0C Socket.io server initialized");
                        console.log();
                        console.log('⚠️  WARNING: Running on HTTP (not secure)');
                        console.log('   For HTTPS, run "npm run cert:generate" then restart');
                        console.log();
                    });
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Failed to start server:', error_1);
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Handle graceful shutdown
process.on('SIGTERM', function () {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
process.on('SIGINT', function () {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
// Start the server
startServer();
