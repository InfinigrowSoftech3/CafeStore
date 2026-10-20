const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

try {
  console.log('--- Client Compatibility Build ---');
  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('Installing root workspace dependencies...');
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('Building customer app (@cafe/customer)...');
  execSync('npm run build:customer', { cwd: rootDir, stdio: 'inherit' });

  const srcDist = path.join(rootDir, 'apps', 'customer', 'dist');
  const targetDist = path.join(__dirname, 'dist');

  fs.mkdirSync(targetDist, { recursive: true });
  fs.cpSync(srcDist, targetDist, { recursive: true });
  console.log('✓ Successfully populated client/dist for Vercel deployment');
} catch (err) {
  console.error('Client build error:', err);
  process.exit(1);
}
