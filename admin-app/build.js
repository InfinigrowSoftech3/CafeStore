const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

try {
  console.log('--- Admin Compatibility Build ---');
  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('Installing root workspace dependencies...');
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
  }

  console.log('Building admin app (@cafe/admin)...');
  execSync('npm run build:admin', { cwd: rootDir, stdio: 'inherit' });

  const srcDist = path.join(rootDir, 'apps', 'admin', 'dist');
  const targetDist = path.join(__dirname, 'dist');

  fs.mkdirSync(targetDist, { recursive: true });
  fs.cpSync(srcDist, targetDist, { recursive: true });
  console.log('✓ Successfully populated admin-app/dist for Vercel deployment');
} catch (err) {
  console.error('Admin build error:', err);
  process.exit(1);
}
