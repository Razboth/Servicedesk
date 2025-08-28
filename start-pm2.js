const { exec } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.HOSTNAME = 'localhost';
process.env.NEXTAUTH_URL = 'http://localhost:5000';

// Change to project directory
process.chdir(path.join(__dirname));

// Start Next.js server
const nextServer = exec('npx next start -p 5000', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});

// Pipe output to console
nextServer.stdout.pipe(process.stdout);
nextServer.stderr.pipe(process.stderr);

// Handle process termination
process.on('SIGINT', () => {
  nextServer.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  nextServer.kill();
  process.exit();
});