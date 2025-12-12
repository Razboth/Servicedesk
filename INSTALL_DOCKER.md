# Panduan Instalasi Docker - Ubuntu Server

Panduan lengkap untuk deploy Bank SulutGo ServiceDesk menggunakan Docker di Ubuntu Server yang kosong (fresh install).

---

## Daftar Isi

1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Langkah 1: Update Sistem](#langkah-1-update-sistem)
3. [Langkah 2: Install Docker](#langkah-2-install-docker)
4. [Langkah 3: Install Docker Compose](#langkah-3-install-docker-compose)
5. [Langkah 4: Clone Repository](#langkah-4-clone-repository)
6. [Langkah 5: Konfigurasi Environment](#langkah-5-konfigurasi-environment)
7. [Langkah 6: Setup Direktori](#langkah-6-setup-direktori)
8. [Langkah 7: Restore Database (Opsional)](#langkah-7-restore-database-opsional)
9. [Langkah 8: Setup SSL Certificate](#langkah-8-setup-ssl-certificate)
10. [Langkah 9: Build dan Jalankan](#langkah-9-build-dan-jalankan)
11. [Langkah 10: Inisialisasi Database](#langkah-10-inisialisasi-database)
12. [Perintah Berguna](#perintah-berguna)
13. [Troubleshooting](#troubleshooting)
14. [Backup & Restore](#backup--restore)

---

## Persyaratan Sistem

- Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS
- RAM minimal 4GB (rekomendasi 8GB)
- Disk minimal 40GB
- Akses root atau sudo
- Port 80, 443 terbuka (untuk HTTPS)

---

## Langkah 1: Update Sistem

```bash
# Login sebagai root atau gunakan sudo
sudo apt update && sudo apt upgrade -y

# Install paket yang diperlukan
sudo apt install -y \
    curl \
    wget \
    git \
    nano \
    htop \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release
```

---

## Langkah 2: Install Docker

```bash
# Hapus versi Docker lama (jika ada)
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Tambahkan Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Tambahkan repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Tambahkan user ke grup docker (agar tidak perlu sudo)
sudo usermod -aG docker $USER

# Aktifkan Docker agar berjalan otomatis saat boot
sudo systemctl enable docker
sudo systemctl start docker

# Verifikasi instalasi
docker --version
docker compose version
```

> **Catatan**: Logout dan login kembali agar perubahan grup berlaku, atau jalankan `newgrp docker`

---

## Langkah 3: Install Docker Compose

Docker Compose sudah termasuk dalam instalasi Docker di atas (docker-compose-plugin). Verifikasi dengan:

```bash
docker compose version
# Output: Docker Compose version v2.x.x
```

Jika ingin menggunakan perintah `docker-compose` (dengan tanda hubung):

```bash
# Buat symlink (opsional)
sudo ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
```

---

## Langkah 4: Clone Repository

```bash
# Buat direktori untuk aplikasi
sudo mkdir -p /opt/servicedesk
cd /opt/servicedesk

# Clone repository
sudo git clone https://github.com/Razboth/Servicedesk.git .

# Set kepemilikan ke user saat ini
sudo chown -R $USER:$USER /opt/servicedesk
```

---

## Langkah 5: Konfigurasi Environment

### 5.1 Buat file .env

```bash
# Copy template environment
cp .env.example .env

# Edit file .env
nano .env
```

### 5.2 Isi konfigurasi berikut:

```env
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DB_USER=servicedesk
DB_PASSWORD=ganti_dengan_password_kuat_anda
DB_NAME=servicedesk_database

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=production
PORT=4000

# NextAuth Configuration
NEXTAUTH_URL=https://hd.bsg.id
NEXTAUTH_SECRET=ganti_dengan_secret_acak_yang_panjang_minimal_32_karakter

# Security Keys (generate dengan: openssl rand -base64 32)
ENCRYPTION_KEY=ganti_dengan_encryption_key_32_karakter
JWT_SECRET=ganti_dengan_jwt_secret_acak

# ===========================================
# EMAIL CONFIGURATION (Opsional)
# ===========================================
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=email@gmail.com
EMAIL_SERVER_PASSWORD=app_password_gmail
EMAIL_FROM=noreply@banksulutgo.co.id

# ===========================================
# SSL/DOMAIN CONFIGURATION
# ===========================================
DOMAIN=hd.bsg.id
SSL_EMAIL=admin@bsg.id

# ===========================================
# REDIS CONFIGURATION
# ===========================================
REDIS_PASSWORD=ganti_dengan_redis_password

# ===========================================
# BACKUP CONFIGURATION
# ===========================================
BACKUP_RETENTION_DAYS=7

# ===========================================
# MONITORING
# ===========================================
MONITORING_ENABLED=true

# ===========================================
# UPLOAD CONFIGURATION
# ===========================================
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### 5.3 Generate secrets otomatis:

```bash
# Generate NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET: $(openssl rand -base64 32)"

# Generate ENCRYPTION_KEY
echo "ENCRYPTION_KEY: $(openssl rand -base64 32)"

# Generate JWT_SECRET
echo "JWT_SECRET: $(openssl rand -base64 32)"

# Generate DB_PASSWORD
echo "DB_PASSWORD: $(openssl rand -base64 24)"

# Generate REDIS_PASSWORD
echo "REDIS_PASSWORD: $(openssl rand -base64 24)"
```

---

## Langkah 6: Setup Direktori

```bash
# Buat direktori untuk Docker volumes
sudo mkdir -p /var/lib/servicedesk/{postgres,uploads}
sudo mkdir -p /var/log/servicedesk
sudo mkdir -p /opt/servicedesk/{backups,nginx/ssl,nginx/conf.d}

# Set permission
sudo chown -R 1001:1001 /var/lib/servicedesk/uploads
sudo chown -R 999:999 /var/lib/servicedesk/postgres
sudo chown -R $USER:$USER /var/log/servicedesk
sudo chown -R $USER:$USER /opt/servicedesk/backups
sudo chown -R $USER:$USER /opt/servicedesk/nginx
```

---

## Langkah 7: Restore Database (Opsional)

Jika Anda memiliki backup database dari server lama, ikuti langkah berikut:

### 7.1 Transfer file backup ke server

```bash
# Dari komputer lokal, transfer file backup ke server
scp /path/to/backup/servicedesk_backup.dump user@server_ip:/opt/servicedesk/backups/
```

### 7.2 Jalankan PostgreSQL container terlebih dahulu

```bash
cd /opt/servicedesk

# Jalankan hanya container database
docker compose -f docker-compose.linux-server.yml up -d postgres

# Tunggu sampai ready
sleep 10

# Verifikasi database berjalan
docker compose -f docker-compose.linux-server.yml logs postgres
```

### 7.3 Restore database

```bash
# Jika backup dalam format .dump (custom format)
docker exec -i servicedesk-db pg_restore -U servicedesk -d servicedesk_database -c < /opt/servicedesk/backups/servicedesk_backup.dump

# ATAU jika backup dalam format .sql (plain text)
docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database < /opt/servicedesk/backups/servicedesk_backup.sql

# ATAU jika backup dalam format .sql.gz (compressed)
gunzip -c /opt/servicedesk/backups/servicedesk_backup.sql.gz | docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database
```

### 7.4 Jalankan migrasi schema untuk update ke versi terbaru

```bash
# Copy script migrasi ke container
docker cp scripts/migrate-database.sql servicedesk-db:/tmp/

# Jalankan migrasi
docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database -f /tmp/migrate-database.sql
```

### 7.5 Verifikasi restore berhasil

```bash
# Cek jumlah tabel
docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database -c "\dt" | head -20

# Cek jumlah user
docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database -c "SELECT COUNT(*) FROM users;"

# Cek jumlah tiket
docker exec -i servicedesk-db psql -U servicedesk -d servicedesk_database -c "SELECT COUNT(*) FROM tickets;"
```

---

## Langkah 8: Setup SSL Certificate

### Opsi A: Menggunakan Sertifikat Bank SulutGo (Recommended)

```bash
# Buat direktori untuk sertifikat
mkdir -p /opt/servicedesk/nginx/ssl

# Copy sertifikat ke server
# Dari komputer lokal:
scp /path/to/banksulutgo.pem user@server:/opt/servicedesk/nginx/ssl/
scp /path/to/banksulutgo-key.pem user@server:/opt/servicedesk/nginx/ssl/

# Set permission
chmod 644 /opt/servicedesk/nginx/ssl/banksulutgo.pem
chmod 600 /opt/servicedesk/nginx/ssl/banksulutgo-key.pem
```

### Opsi B: Menggunakan Let's Encrypt (Free SSL)

```bash
# Jalankan certbot untuk mendapatkan sertifikat
docker compose -f docker-compose.linux-server.yml --profile ssl-setup up certbot

# Sertifikat akan disimpan di volume letsencrypt
```

### Buat konfigurasi Nginx

```bash
# Buat file konfigurasi Nginx
cat > /opt/servicedesk/nginx/conf.d/default.conf << 'EOF'
upstream servicedesk {
    server app:4000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name hd.bsg.id;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name hd.bsg.id;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/banksulutgo.pem;
    ssl_certificate_key /etc/nginx/ssl/banksulutgo-key.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Client body size for uploads
    client_max_body_size 50M;

    # Proxy settings
    location / {
        proxy_pass http://servicedesk;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://servicedesk;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
}
EOF
```

Buat file nginx.conf utama:

```bash
cat > /opt/servicedesk/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/conf.d/*.conf;
}
EOF
```

---

## Langkah 9: Build dan Jalankan

### 9.1 Build Docker image

```bash
cd /opt/servicedesk

# Build image (ini akan memakan waktu sekitar 5-10 menit)
docker compose -f docker-compose.linux-server.yml build --no-cache
```

### 9.2 Jalankan semua services

```bash
# Jalankan dalam mode detached (background)
docker compose -f docker-compose.linux-server.yml up -d

# Lihat status containers
docker compose -f docker-compose.linux-server.yml ps

# Lihat logs (untuk monitoring)
docker compose -f docker-compose.linux-server.yml logs -f
```

### 9.3 Verifikasi semua service berjalan

```bash
# Cek status semua container
docker ps

# Output yang diharapkan:
# CONTAINER ID   IMAGE                  STATUS          PORTS
# xxxx           servicedesk:latest     Up (healthy)    127.0.0.1:4000->4000/tcp
# xxxx           postgres:15-alpine     Up (healthy)    127.0.0.1:5432->5432/tcp
# xxxx           nginx:alpine           Up (healthy)    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# xxxx           redis:7-alpine         Up (healthy)    127.0.0.1:6379->6379/tcp
```

---

## Langkah 10: Inisialisasi Database

### Jika database baru (tidak restore):

```bash
# Jalankan Prisma push untuk membuat schema
docker exec -it servicedesk-app npx prisma db push

# Jalankan seed data
docker exec -it servicedesk-app npx prisma db seed
```

### Jika database di-restore:

```bash
# Generate Prisma client
docker exec -it servicedesk-app npx prisma generate

# Push schema untuk field yang mungkin baru
docker exec -it servicedesk-app npx prisma db push --accept-data-loss
```

---

## Perintah Berguna

### Container Management

```bash
# Lihat status semua container
docker compose -f docker-compose.linux-server.yml ps

# Restart semua services
docker compose -f docker-compose.linux-server.yml restart

# Restart service tertentu
docker compose -f docker-compose.linux-server.yml restart app

# Stop semua services
docker compose -f docker-compose.linux-server.yml down

# Stop dan hapus volumes (HATI-HATI! Data akan hilang)
docker compose -f docker-compose.linux-server.yml down -v
```

### Logs

```bash
# Lihat logs semua services
docker compose -f docker-compose.linux-server.yml logs -f

# Lihat logs service tertentu
docker compose -f docker-compose.linux-server.yml logs -f app
docker compose -f docker-compose.linux-server.yml logs -f postgres
docker compose -f docker-compose.linux-server.yml logs -f nginx

# Lihat 100 baris terakhir
docker compose -f docker-compose.linux-server.yml logs --tail 100 app
```

### Database Operations

```bash
# Masuk ke PostgreSQL shell
docker exec -it servicedesk-db psql -U servicedesk -d servicedesk_database

# Backup database
docker exec servicedesk-db pg_dump -U servicedesk servicedesk_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Prisma Studio (untuk browse database)
docker exec -it servicedesk-app npx prisma studio
```

### Update Aplikasi

```bash
cd /opt/servicedesk

# Pull update terbaru
git pull origin main

# Rebuild dan restart
docker compose -f docker-compose.linux-server.yml build --no-cache app
docker compose -f docker-compose.linux-server.yml up -d app

# Jalankan migrasi jika ada perubahan schema
docker exec -it servicedesk-app npx prisma db push
```

---

## Troubleshooting

### Container tidak bisa start

```bash
# Cek logs untuk error
docker compose -f docker-compose.linux-server.yml logs app

# Cek apakah port sudah digunakan
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :5432
```

### Database connection error

```bash
# Cek apakah postgres berjalan
docker compose -f docker-compose.linux-server.yml ps postgres

# Test koneksi
docker exec -it servicedesk-db psql -U servicedesk -d servicedesk_database -c "SELECT 1;"

# Cek environment variables
docker exec servicedesk-app env | grep DATABASE
```

### Permission denied pada volumes

```bash
# Fix permission untuk uploads
sudo chown -R 1001:1001 /var/lib/servicedesk/uploads

# Fix permission untuk postgres
sudo chown -R 999:999 /var/lib/servicedesk/postgres

# Fix permission untuk logs
sudo chown -R 1001:1001 /var/log/servicedesk
```

### SSL/HTTPS tidak berfungsi

```bash
# Cek sertifikat ada
ls -la /opt/servicedesk/nginx/ssl/

# Test konfigurasi nginx
docker exec servicedesk-nginx nginx -t

# Reload nginx
docker exec servicedesk-nginx nginx -s reload
```

### Out of memory

```bash
# Cek memory usage
docker stats

# Tambahkan swap jika diperlukan
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Backup & Restore

### Automated Backup

Backup otomatis sudah dikonfigurasi melalui container `backup`. Backup disimpan di `/opt/servicedesk/backups/`.

### Manual Backup

```bash
# Backup database
docker exec servicedesk-db pg_dump -U servicedesk -d servicedesk_database -F c -f /backups/manual_backup_$(date +%Y%m%d).dump

# Backup uploads
tar -czvf /opt/servicedesk/backups/uploads_$(date +%Y%m%d).tar.gz /var/lib/servicedesk/uploads/

# Backup full (database + uploads + config)
./scripts/full-backup.sh
```

### Restore dari Backup

```bash
# Stop aplikasi
docker compose -f docker-compose.linux-server.yml stop app

# Restore database
docker exec -i servicedesk-db pg_restore -U servicedesk -d servicedesk_database -c /backups/manual_backup_20241210.dump

# Restore uploads
tar -xzvf /opt/servicedesk/backups/uploads_20241210.tar.gz -C /

# Start aplikasi
docker compose -f docker-compose.linux-server.yml start app
```

---

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP dan HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verifikasi rules
sudo ufw status verbose
```

---

## Monitoring dengan Portainer (Opsional)

```bash
# Install Portainer untuk monitoring Docker via web
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart always \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Akses Portainer di: `http://IP_SERVER:9000`

---

## Quick Start (Copy-Paste)

Untuk instalasi cepat di server Ubuntu yang kosong:

```bash
# 1. Update sistem
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Clone repository
sudo mkdir -p /opt/servicedesk && cd /opt/servicedesk
sudo git clone https://github.com/Razboth/Servicedesk.git .
sudo chown -R $USER:$USER /opt/servicedesk

# 4. Setup direktori
sudo mkdir -p /var/lib/servicedesk/{postgres,uploads}
sudo mkdir -p /var/log/servicedesk
sudo chown -R 1001:1001 /var/lib/servicedesk/uploads
sudo chown -R 999:999 /var/lib/servicedesk/postgres

# 5. Copy dan edit .env
cp .env.example .env
nano .env  # Edit sesuai kebutuhan

# 6. Build dan jalankan
docker compose -f docker-compose.linux-server.yml build
docker compose -f docker-compose.linux-server.yml up -d

# 7. Inisialisasi database (jika fresh install)
docker exec -it servicedesk-app npx prisma db push
docker exec -it servicedesk-app npx prisma db seed

# 8. Selesai! Akses di https://hd.bsg.id
```

---

*Terakhir diperbarui: Desember 2024*
