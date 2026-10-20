const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const customerDist = path.join(rootDir, 'apps', 'customer', 'dist');
const rootDist = path.join(rootDir, 'dist');
const clientDist = path.join(rootDir, 'client', 'dist');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

try {
  if (fs.existsSync(customerDist)) {
    console.log('Syncing apps/customer/dist to root dist and client/dist for Vercel...');
    copyFolderSync(customerDist, rootDist);
    copyFolderSync(customerDist, clientDist);
    console.log('✓ Successfully populated root dist/ and client/dist/');
  } else {
    console.warn('Warning: apps/customer/dist not found.');
  }
} catch (err) {
  console.error('Error syncing dist folders:', err);
  process.exit(1);
}
