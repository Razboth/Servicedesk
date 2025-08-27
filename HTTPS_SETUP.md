# HTTPS Setup Guide

This guide explains how to run the Bank SulutGo ServiceDesk application with HTTPS.

## Quick Start

### 1. Generate SSL Certificates

First time setup - generate certificates:

```bash
npm run cert:generate
```

This will create self-signed certificates in the `certificates/` directory.

### 2. Run with HTTPS

#### Development Mode
```bash
npm run dev:https
```

#### Production Mode
```bash
npm run build
npm run start:https
```

The server will be available at: **https://localhost:3000**

## Certificate Options

### Option 1: Self-Signed Certificates (Development)

The `cert:generate` script will automatically generate self-signed certificates using either:
- **mkcert** (recommended) - Creates locally-trusted development certificates
- **OpenSSL** (fallback) - Creates self-signed certificates

#### Installing mkcert (Optional but Recommended)

**Windows:**
```bash
# Using Chocolatey
choco install mkcert

# Using Scoop
scoop bucket add extras
scoop install mkcert
```

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
# See https://github.com/FiloSottile/mkcert#installation
```

### Option 2: Custom Certificates (Production)

For production, place your certificates in the `certificates/` directory:
- `certificates/localhost.pem` - Certificate file
- `certificates/localhost-key.pem` - Private key file

You can rename them, but update the paths in `server.js` or `server.ts`.

### Option 3: Let's Encrypt (Production)

For production servers with a domain name:

1. Install Certbot
2. Generate certificates:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```
3. Copy certificates to the project:
```bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certificates/localhost.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certificates/localhost-key.pem
```

## Environment Variables

Update your `.env` file:

```env
# HTTPS Configuration
USE_HTTPS=true              # Enable HTTPS (set to false for HTTP only)
PORT=3000                   # Server port
HOSTNAME=localhost          # Server hostname
REDIRECT_HTTP=false         # Redirect HTTP to HTTPS (requires port 80 access)

# Update NextAuth URL to use HTTPS
NEXTAUTH_URL=https://localhost:3000
APP_URL=https://localhost:3000
```

## Browser Certificate Warnings

### Self-Signed Certificates
When using self-signed certificates, browsers will show a security warning.

**To proceed:**
1. Click "Advanced" or "Show Details"
2. Click "Proceed to localhost (unsafe)" or similar option

### Trusted Certificates (mkcert)
If you used mkcert, the certificates will be automatically trusted by your system.

## Deployment Options

### Option 1: Direct HTTPS
Run the application directly with HTTPS using the custom server:
```bash
NODE_ENV=production npm run start:https
```

### Option 2: Behind a Reverse Proxy (Recommended for Production)
Use Nginx or Apache as a reverse proxy with SSL termination:

**Nginx Example:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 3: Cloud Deployment
For cloud deployments (Vercel, AWS, Azure), use their built-in SSL/TLS solutions.

## Troubleshooting

### Certificate Not Found
```
Error: ENOENT: no such file or directory, open 'certificates/localhost-key.pem'
```
**Solution:** Run `npm run cert:generate` to create certificates.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change the PORT in your `.env` file or stop the other process.

### Permission Denied (Port 443)
```
Error: listen EACCES: permission denied 0.0.0.0:443
```
**Solution:** 
- Use a port above 1024 (like 3000)
- Or run with sudo (not recommended)
- Or use setcap (Linux): `sudo setcap 'cap_net_bind_service=+ep' $(which node)`

### Mixed Content Errors
Ensure all resources (API calls, images, etc.) use HTTPS URLs.

## Security Best Practices

1. **Never commit certificates to Git** - They're already in `.gitignore`
2. **Use strong certificates** - 2048-bit RSA minimum
3. **Keep certificates updated** - Renew before expiration
4. **Use HSTS headers** - Enforce HTTPS usage
5. **Implement CSP** - Content Security Policy headers
6. **Regular security audits** - Run `npm run security:audit`

## Additional Scripts

```bash
# Regular HTTP development
npm run dev

# HTTPS development
npm run dev:https

# Generate/regenerate certificates
npm run cert:generate

# Build for production
npm run build

# Start production (HTTP)
npm run start

# Start production (HTTPS)
npm run start:https
```

## Support

For issues or questions about HTTPS setup, check:
- The error logs in the console
- Certificate file permissions
- Firewall settings
- Environment variable configuration