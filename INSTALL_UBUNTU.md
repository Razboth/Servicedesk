# Panduan Instalasi Ubuntu CLI

Panduan sederhana untuk menginstall Bank SulutGo ServiceDesk di Ubuntu Server.

---

## Persyaratan Sistem

- Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS
- RAM minimal 2GB (rekomendasi 4GB)
- Disk minimal 20GB
- Akses root atau sudo

---

## Langkah 1: Update Sistem

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Langkah 2: Install Node.js 20

```bash
# Install curl jika belum ada
sudo apt install -y curl

# Tambahkan repository NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verifikasi instalasi
node --version    # Harus v20.x.x
npm --version     # Harus 10.x.x
```

---

## Langkah 3: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start dan enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Buat database dan user
sudo -u postgres psql << EOF
CREATE USER servicedesk WITH PASSWORD 'password_anda';
CREATE DATABASE servicedesk OWNER servicedesk;
GRANT ALL PRIVILEGES ON DATABASE servicedesk TO servicedesk;
EOF
```

> **Catatan**: Ganti `password_anda` dengan password yang kuat!

---

## Langkah 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Langkah 5: Clone Repository

```bash
# Pindah ke direktori aplikasi
cd /var/www

# Clone repository (ganti dengan URL repository Anda)
sudo git clone https://github.com/Razboth/Servicedesk.git servicedesk

# Set kepemilikan
sudo chown -R $USER:$USER /var/www/servicedesk

# Masuk ke direktori
cd servicedesk
```

---

## Langkah 6: Install Dependencies

```bash
npm install
```

---

## Langkah 7: Konfigurasi Environment

```bash
# Copy file contoh
cp .env.example .env

# Edit file .env
nano .env
```

Edit nilai berikut di file `.env`:

```env
# Database
DATABASE_URL="postgresql://servicedesk:password_anda@localhost:5432/servicedesk"

# Auth (generate secret dengan: openssl rand -base64 32)
NEXTAUTH_URL="http://IP_SERVER_ANDA:3000"
NEXTAUTH_SECRET="ganti_dengan_secret_acak_yang_panjang"

# Security (generate dengan: openssl rand -base64 32)
ENCRYPTION_KEY="32_karakter_encryption_key_anda"
JWT_SECRET="secret_jwt_anda"
```

Simpan dengan `Ctrl+X`, lalu `Y`, lalu `Enter`.

---

## Langkah 8: Setup Database

Ada dua opsi setup database:

### Opsi A: Database Baru (Fresh Install)

```bash
# Generate Prisma client
npx prisma generate

# Push schema ke database
npx prisma db push

# Seed data awal
npx prisma db seed
```

### Opsi B: Restore dari Database Existing

Jika Anda memiliki backup database dari server lama, ikuti langkah berikut:

#### 1. Transfer file backup ke server baru

```bash
# Dari server lama, export database:
pg_dump -h localhost -U postgres -d servicedesk_database -F c -f servicedesk_backup.dump

# Transfer ke server baru menggunakan scp:
scp servicedesk_backup.dump user@server_baru:/tmp/
```

#### 2. Restore database

```bash
# Buat database baru jika belum ada
sudo -u postgres psql << EOF
CREATE DATABASE servicedesk_database OWNER postgres;
EOF

# Restore dari backup (format custom .dump)
pg_restore -h localhost -U postgres -d servicedesk_database -c /tmp/servicedesk_backup.dump

# ATAU jika backup dalam format SQL (.sql)
psql -h localhost -U postgres -d servicedesk_database < /tmp/servicedesk_backup.sql
```

#### 3. Jalankan script migrasi untuk upgrade schema

Script ini akan menambahkan tabel, kolom, dan enum baru yang mungkin belum ada di database lama:

```bash
# Pindah ke direktori aplikasi
cd /var/www/servicedesk

# Jalankan script migrasi dengan backup otomatis
./scripts/migrate-database.sh -d servicedesk_database -u postgres -b

# ATAU jalankan SQL langsung (jika sudah yakin)
psql -h localhost -U postgres -d servicedesk_database -f scripts/migrate-database.sql
```

**Opsi script migrasi:**

```bash
# Lihat bantuan
./scripts/migrate-database.sh --help

# Dry run (preview tanpa eksekusi)
./scripts/migrate-database.sh --dry-run

# Tanpa backup (tidak disarankan)
./scripts/migrate-database.sh --skip-backup

# Custom host dan database
./scripts/migrate-database.sh -h 192.168.1.100 -p 5432 -d my_database -u my_user
```

#### 4. Sync Prisma dengan database

```bash
# Generate Prisma client
npx prisma generate

# Push schema (untuk field/index yang mungkin terlewat)
npx prisma db push --accept-data-loss

# Verifikasi dengan Prisma Studio
npx prisma studio
```

#### 5. Seed data template baru (opsional)

Jika database lama belum memiliki template untuk fitur baru:

```bash
# Seed template shift checklist
npx tsx scripts/seed-shift-checklist-templates.ts

# Seed template backup database
npx tsx scripts/seed-shift-backup-templates.ts

# Atau jalankan semua seed
npx prisma db seed
```

---

## Langkah 9: Build Aplikasi

```bash
npm run build
```

---

## Langkah 10: Jalankan dengan PM2

```bash
# Start aplikasi
pm2 start ecosystem.config.js

# Simpan proses PM2
pm2 save

# Setup startup otomatis saat boot
pm2 startup
# Jalankan perintah yang diberikan oleh output di atas
```

---

## Langkah 11: Verifikasi

```bash
# Cek status
pm2 status

# Lihat logs
pm2 logs servicedesk

# Akses aplikasi
curl http://localhost:3000
```

Buka browser dan akses: `http://IP_SERVER_ANDA:3000`

---

## Perintah Berguna

```bash
# Status aplikasi
pm2 status

# Restart aplikasi
pm2 restart servicedesk

# Stop aplikasi
pm2 stop servicedesk

# Lihat logs real-time
pm2 logs servicedesk --lines 100

# Monitor resource
pm2 monit

# Database GUI
npx prisma studio
```

---

## Troubleshooting

### Error: EACCES permission denied

```bash
sudo chown -R $USER:$USER /var/www/servicedesk
```

### Error: Database connection refused

```bash
# Pastikan PostgreSQL berjalan
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Error: Port 3000 already in use

```bash
# Cari proses yang menggunakan port 3000
sudo lsof -i :3000

# Kill proses tersebut
sudo kill -9 <PID>
```

### Aplikasi tidak bisa diakses dari luar

```bash
# Buka firewall untuk port 3000
sudo ufw allow 3000

# Atau gunakan Nginx sebagai reverse proxy (rekomendasi)
```

---

## Setup SSL Certificate (HTTPS Port 443)

Untuk menjalankan aplikasi dengan HTTPS di port 443 menggunakan sertifikat Bank SulutGo:

### Langkah 1: Siapkan Sertifikat

```bash
# Buat folder certificates jika belum ada
mkdir -p /var/www/servicedesk/certificates

# Copy sertifikat Bank SulutGo ke folder certificates
# Format yang didukung: .crt/.key atau .pem
sudo cp /path/to/your/banksulutgo.crt /var/www/servicedesk/certificates/
sudo cp /path/to/your/banksulutgo.key /var/www/servicedesk/certificates/

# Set permission yang benar
sudo chmod 644 /var/www/servicedesk/certificates/banksulutgo.crt
sudo chmod 600 /var/www/servicedesk/certificates/banksulutgo.key
sudo chown -R $USER:$USER /var/www/servicedesk/certificates/
```

> **Catatan Format Sertifikat:**
> - `.crt` / `.cer` - File sertifikat (public)
> - `.key` - File private key
> - `.pem` - Bisa berisi sertifikat atau key (format Base64)
> - Semua format di atas kompatibel dengan Node.js

### Langkah 2: Konfigurasi Environment Variables

Edit file `ecosystem.config.js` atau `.env`:

```bash
nano ecosystem.config.js
```

Pastikan konfigurasi berikut sudah benar:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 443,
  HOSTNAME: '0.0.0.0',
  USE_HTTPS: 'true',
  // SSL Certificate configuration (.crt dan .key)
  SSL_CERT_DIR: './certificates',
  SSL_CERT_FILE: 'banksulutgo.crt',       // File sertifikat (.crt atau .pem)
  SSL_KEY_FILE: 'banksulutgo.key',        // File private key (.key atau .pem)
  NEXTAUTH_URL: 'https://hd.bsg.id',
  NEXT_PUBLIC_APP_URL: 'https://hd.bsg.id',
  // ... konfigurasi lainnya
}
```

Atau melalui file `.env`:

```env
USE_HTTPS=true
PORT=443
SSL_CERT_DIR=./certificates
SSL_CERT_FILE=banksulutgo.crt
SSL_KEY_FILE=banksulutgo.key
NEXTAUTH_URL=https://hd.bsg.id
```

### Langkah 3: Jalankan dengan Sudo (Port 443 memerlukan root)

```bash
# Stop PM2 jika sudah berjalan
pm2 stop all

# Jalankan dengan sudo untuk akses port 443
sudo pm2 start ecosystem.config.js

# Simpan konfigurasi PM2
sudo pm2 save

# Setup startup otomatis
sudo pm2 startup
```

### Langkah 4: Verifikasi

```bash
# Cek status
sudo pm2 status

# Lihat logs
sudo pm2 logs bsg-servicedesk

# Test HTTPS
curl -k https://localhost:443
```

Buka browser dan akses: `https://hd.bsg.id`

### Format Sertifikat yang Didukung

- **PEM Format** (.pem, .crt, .cer): Format paling umum
- **Certificate Chain**: Gabungkan certificate + intermediate + root CA dalam satu file

Contoh menggabungkan certificate chain:

```bash
cat your-certificate.crt intermediate.crt root.crt > banksulutgo.pem
```

### Troubleshooting SSL

**Error: EACCES permission denied (port 443)**
```bash
# Gunakan sudo atau berikan capability
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

**Error: SSL certificate not found**
```bash
# Periksa file sertifikat
ls -la /var/www/servicedesk/certificates/
```

**Error: SSL certificate invalid**
```bash
# Verifikasi sertifikat
openssl x509 -in certificates/banksulutgo.pem -text -noout

# Verifikasi key match dengan certificate
openssl x509 -noout -modulus -in certificates/banksulutgo.pem | openssl md5
openssl rsa -noout -modulus -in certificates/banksulutgo-key.pem | openssl md5
# Output MD5 harus sama
```

---

## Setup Nginx (Opsional - Rekomendasi untuk Production)

```bash
# Install Nginx
sudo apt install -y nginx

# Buat konfigurasi
sudo nano /etc/nginx/sites-available/servicedesk
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name domain_anda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:

```bash
# Buat symlink
sudo ln -s /etc/nginx/sites-available/servicedesk /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Quick Install (Satu Perintah)

Untuk instalasi cepat, jalankan:

```bash
# Download dan jalankan script instalasi
curl -fsSL https://raw.githubusercontent.com/Razboth/Servicedesk/main/scripts/install-ubuntu.sh | sudo bash
```

> **Catatan**: Periksa isi script sebelum menjalankan untuk keamanan.

---

## Bantuan

Jika ada masalah, hubungi tim IT atau buat issue di repository.

---

*Terakhir diperbarui: Desember 2024*
