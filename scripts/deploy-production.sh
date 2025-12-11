#!/bin/bash

# ==========================================================
# Bank SulutGo ServiceDesk - Production Deployment Script
# ==========================================================
# Script untuk build dan menjalankan aplikasi dengan PM2
# Menggunakan HTTPS port 443 dengan SSL Bank SulutGo
#
# Penggunaan:
#   chmod +x scripts/deploy-production.sh
#   sudo ./scripts/deploy-production.sh
#
# ==========================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/servicedesk"
APP_NAME="bsg-servicedesk"
NODE_ENV="production"
PORT="443"
HOSTNAME="0.0.0.0"

# SSL Configuration - Bank SulutGo Wildcard Certificate
SSL_CERT_DIR="./certificates"
SSL_CERT_FILE="banksulutgo.crt"
SSL_KEY_FILE="banksulutgo.key"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo ""
echo "=========================================================="
echo "  Bank SulutGo ServiceDesk - Production Deployment"
echo "=========================================================="
echo ""

# Check if running as root (required for port 443)
if [ "$EUID" -ne 0 ]; then
    log_error "Script ini harus dijalankan dengan sudo untuk akses port 443"
    echo "  Gunakan: sudo ./scripts/deploy-production.sh"
    exit 1
fi

# Navigate to app directory
if [ ! -d "$APP_DIR" ]; then
    log_error "Direktori aplikasi tidak ditemukan: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"
log_info "Working directory: $(pwd)"

# Check if certificates exist
CERT_PATH="$SSL_CERT_DIR/$SSL_CERT_FILE"
KEY_PATH="$SSL_CERT_DIR/$SSL_KEY_FILE"

if [ ! -f "$CERT_PATH" ]; then
    log_error "SSL Certificate tidak ditemukan: $CERT_PATH"
    echo "  Pastikan sertifikat Bank SulutGo sudah dicopy ke folder certificates/"
    exit 1
fi

if [ ! -f "$KEY_PATH" ]; then
    log_error "SSL Key tidak ditemukan: $KEY_PATH"
    echo "  Pastikan private key Bank SulutGo sudah dicopy ke folder certificates/"
    exit 1
fi

log_success "SSL certificates ditemukan"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js tidak ditemukan. Install Node.js 20 terlebih dahulu."
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm tidak ditemukan."
    exit 1
fi

NPM_VERSION=$(npm --version)
log_info "npm version: $NPM_VERSION"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 tidak ditemukan. Menginstall PM2..."
    npm install -g pm2
fi

PM2_VERSION=$(pm2 --version)
log_info "PM2 version: $PM2_VERSION"

# Step 1: Stop existing PM2 process
echo ""
log_info "Step 1: Menghentikan proses PM2 yang ada..."

if pm2 list | grep -q "$APP_NAME"; then
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    log_success "Proses $APP_NAME dihentikan"
else
    log_info "Tidak ada proses $APP_NAME yang berjalan"
fi

# Step 2: Clean old build
echo ""
log_info "Step 2: Membersihkan build lama..."

if [ -d ".next" ]; then
    rm -rf .next
    log_success "Folder .next dihapus"
else
    log_info "Folder .next tidak ada"
fi

# Step 3: Install dependencies (if needed)
echo ""
log_info "Step 3: Memeriksa dependencies..."

if [ ! -d "node_modules" ]; then
    log_info "Menginstall dependencies..."
    npm install
    log_success "Dependencies terinstall"
else
    log_info "node_modules sudah ada"
fi

# Step 4: Generate Prisma client
echo ""
log_info "Step 4: Generate Prisma client..."

npx prisma generate
log_success "Prisma client generated"

# Step 5: Build application
echo ""
log_info "Step 5: Building aplikasi (ini mungkin memakan waktu beberapa menit)..."

npm run build

if [ ! -f ".next/required-server-files.json" ]; then
    log_error "Build gagal! File .next/required-server-files.json tidak ditemukan"
    exit 1
fi

log_success "Build selesai"

# Step 6: Create PM2 ecosystem file for production
echo ""
log_info "Step 6: Membuat konfigurasi PM2..."

cat > ecosystem.production.config.js << 'PMCONFIG'
const path = require('path');
const dotenv = require('dotenv');

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'bsg-servicedesk',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        // Load from .env file + override with production settings
        ...process.env,
        NODE_ENV: 'production',
        PORT: 443,
        HOSTNAME: '0.0.0.0',
        USE_HTTPS: 'true',
        SSL_CERT_DIR: './certificates',
        SSL_CERT_FILE: 'banksulutgo.crt',
        SSL_KEY_FILE: 'banksulutgo.key',
        // IMPORTANT: Set NEXTAUTH_URL to your production URL
        // This must match the URL users access the site from
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://hd.bsg.id',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
    },
  ],
};
PMCONFIG

log_success "Konfigurasi PM2 dibuat: ecosystem.production.config.js"

# Step 7: Create logs directory
echo ""
log_info "Step 7: Menyiapkan direktori logs..."

mkdir -p logs
chown -R $SUDO_USER:$SUDO_USER logs 2>/dev/null || true
log_success "Direktori logs siap"

# Step 8: Start with PM2
echo ""
log_info "Step 8: Menjalankan aplikasi dengan PM2..."

pm2 start ecosystem.production.config.js
log_success "Aplikasi dimulai"

# Step 9: Save PM2 process list
echo ""
log_info "Step 9: Menyimpan konfigurasi PM2..."

pm2 save
log_success "Konfigurasi PM2 tersimpan"

# Step 10: Setup PM2 startup (optional)
echo ""
log_info "Step 10: Setup startup otomatis..."

pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER 2>/dev/null || log_warning "Startup setup memerlukan konfigurasi manual"

# Summary
echo ""
echo "=========================================================="
echo "  Deployment Selesai!"
echo "=========================================================="
echo ""
log_success "Aplikasi berjalan di https://0.0.0.0:443"
echo ""
log_info "Perintah berguna:"
echo "  pm2 status              - Lihat status aplikasi"
echo "  pm2 logs $APP_NAME      - Lihat logs"
echo "  pm2 restart $APP_NAME   - Restart aplikasi"
echo "  pm2 stop $APP_NAME      - Stop aplikasi"
echo ""

# Show PM2 status
echo ""
log_info "Status PM2:"
pm2 status

# Show last few logs
echo ""
log_info "Log terakhir:"
pm2 logs "$APP_NAME" --lines 10 --nostream

echo ""
echo "=========================================================="
