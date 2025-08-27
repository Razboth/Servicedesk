import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const certsDir = path.join(process.cwd(), 'certificates');

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log('📁 Created certificates directory');
}

// Check if certificates already exist
const certPath = path.join(certsDir, 'localhost.pem');
const keyPath = path.join(certsDir, 'localhost-key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist in certificates/ directory');
  console.log('   - Certificate: certificates/localhost.pem');
  console.log('   - Key: certificates/localhost-key.pem');
  process.exit(0);
}

console.log('🔐 Generating self-signed certificates for HTTPS...\n');

try {
  // Check if mkcert is installed
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ mkcert is not installed.');
    console.log('\nTo install mkcert:');
    console.log('  Windows (Chocolatey): choco install mkcert');
    console.log('  Windows (Scoop): scoop bucket add extras && scoop install mkcert');
    console.log('  macOS: brew install mkcert');
    console.log('  Linux: See https://github.com/FiloSottile/mkcert#installation\n');
    
    console.log('Alternatively, we can use OpenSSL (fallback method)...\n');
    
    // Try OpenSSL as fallback
    try {
      execSync('openssl version', { stdio: 'ignore' });
      console.log('📦 Using OpenSSL to generate certificates...');
      
      // Generate certificates using OpenSSL
      const opensslConfig = `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=ID
ST=North Sulawesi
L=Manado
O=Bank SulutGo
OU=IT Department
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;
      
      const configPath = path.join(certsDir, 'openssl.cnf');
      fs.writeFileSync(configPath, opensslConfig);
      
      // Generate private key and certificate
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 ` +
        `-keyout "${keyPath}" -out "${certPath}" -config "${configPath}"`,
        { stdio: 'inherit' }
      );
      
      // Clean up config file
      fs.unlinkSync(configPath);
      
      console.log('\n✅ Self-signed certificates generated successfully!');
      console.log('   - Certificate: certificates/localhost.pem');
      console.log('   - Key: certificates/localhost-key.pem');
      console.log('\n⚠️  Note: These are self-signed certificates.');
      console.log('   Your browser will show a security warning.');
      console.log('   You can proceed by clicking "Advanced" → "Proceed to localhost"');
      
    } catch (opensslError) {
      console.error('❌ Neither mkcert nor OpenSSL is available.');
      console.log('Please install one of them to generate certificates.');
      process.exit(1);
    }
    
    process.exit(0);
  }
  
  // Use mkcert if available
  console.log('📦 Using mkcert to generate trusted certificates...');
  
  // Install local CA (first time only)
  console.log('Installing local CA...');
  execSync('mkcert -install', { stdio: 'inherit' });
  
  // Generate certificates
  process.chdir(certsDir);
  execSync('mkcert localhost 127.0.0.1 ::1', { stdio: 'inherit' });
  
  // Rename files to match our expected names
  if (fs.existsSync('localhost+2.pem')) {
    fs.renameSync('localhost+2.pem', 'localhost.pem');
  }
  if (fs.existsSync('localhost+2-key.pem')) {
    fs.renameSync('localhost+2-key.pem', 'localhost-key.pem');
  }
  
  console.log('\n✅ Trusted certificates generated successfully!');
  console.log('   - Certificate: certificates/localhost.pem');
  console.log('   - Key: certificates/localhost-key.pem');
  console.log('\n🔒 Your browser will trust these certificates automatically.');
  
} catch (error) {
  console.error('❌ Error generating certificates:', error);
  process.exit(1);
}