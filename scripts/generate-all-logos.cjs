const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const srcImage = 'C:/Users/kyada/.gemini/antigravity/brain/05708527-4a7f-4c33-a849-9d9cf709578d/.user_uploaded/media_1792586190684_e585cc14.jpg';

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const entries = [];
  const datas = [];

  for (const img of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    entries.push(entry);
    datas.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

async function generateAll() {
  console.log('--- Generating new logo assets from user upload ---');
  console.log('Source:', srcImage);

  // 1. Process image to transparent RGBA
  const img = sharp(srcImage);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }

  // Flood fill from outer borders
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;

  function isWhite(x, y) {
    const idx = (y * width + x) * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    return r >= 242 && g >= 242 && b >= 242;
  }

  for (let x = 0; x < width; x++) {
    if (isWhite(x, 0)) { visited[x] = 1; queue[tail++] = x; }
    const bIdx = (height - 1) * width + x;
    if (isWhite(x, height - 1)) { visited[bIdx] = 1; queue[tail++] = bIdx; }
  }
  for (let y = 0; y < height; y++) {
    const lIdx = y * width;
    if (!visited[lIdx] && isWhite(0, y)) { visited[lIdx] = 1; queue[tail++] = lIdx; }
    const rIdx = y * width + (width - 1);
    if (!visited[rIdx] && isWhite(width - 1, y)) { visited[rIdx] = 1; queue[tail++] = rIdx; }
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    rgba[curr * 4 + 3] = 0;

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && isWhite(nx, ny)) {
          visited[nIdx] = 1;
          queue[tail++] = nIdx;
        }
      }
    }
  }

  // Smooth feathering
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (rgba[idx + 3] !== 0) {
        const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
        if (r > 220 && g > 220 && b > 220) {
          const hasTransNeighbor = 
            rgba[((y-1)*width + x)*4 + 3] === 0 ||
            rgba[((y+1)*width + x)*4 + 3] === 0 ||
            rgba[(y*width + x - 1)*4 + 3] === 0 ||
            rgba[(y*width + x + 1)*4 + 3] === 0;
          if (hasTransNeighbor) {
            const brightness = (r + g + b) / 3;
            rgba[idx + 3] = Math.max(0, Math.min(255, Math.round((255 - brightness) * 4)));
          }
        }
      }
    }
  }

  // Base sharp instance from transparent RGBA
  const baseSharp = sharp(rgba, { raw: { width, height, channels: 4 } });

  // Generate memory buffers
  const logo1024Buf = await baseSharp.clone().png().toBuffer();
  const logo512Buf = await baseSharp.clone().resize(512, 512).png().toBuffer();
  const icon192Buf = await baseSharp.clone().resize(192, 192).png().toBuffer();
  const icon180Buf = await baseSharp.clone().resize(180, 180).png().toBuffer();
  const fav32Buf = await baseSharp.clone().resize(32, 32).png().toBuffer();
  const fav16Buf = await baseSharp.clone().resize(16, 16).png().toBuffer();
  const fav48Buf = await baseSharp.clone().resize(48, 48).png().toBuffer();

  // Create ICO
  const icoBuf = createIco([
    { width: 16, height: 16, buffer: fav16Buf },
    { width: 32, height: 32, buffer: fav32Buf },
    { width: 48, height: 48, buffer: fav48Buf }
  ]);

  // Create SVG with base64 embedded PNG
  const logo512Base64 = logo512Buf.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${logo512Base64}" x="0" y="0" width="512" height="512" />
</svg>
`;

  // Targets to write to
  const appDirs = [
    path.join(rootDir, 'apps', 'customer', 'public'),
    path.join(rootDir, 'apps', 'admin', 'public'),
    path.join(rootDir, 'apps', 'pos', 'public'),
    path.join(rootDir, 'apps', 'kds', 'public'),
    path.join(rootDir, 'apps', 'super-admin', 'public'),
  ];

  for (const dir of appDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'logo.png'), logo1024Buf);
    fs.writeFileSync(path.join(dir, 'app-icon.svg'), svgContent);
    fs.writeFileSync(path.join(dir, 'favicon.svg'), svgContent);
    fs.writeFileSync(path.join(dir, 'favicon.ico'), icoBuf);
    fs.writeFileSync(path.join(dir, 'favicon-16x16.png'), fav16Buf);
    fs.writeFileSync(path.join(dir, 'favicon-32x32.png'), fav32Buf);
    fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), icon180Buf);
    fs.writeFileSync(path.join(dir, 'icon-192.png'), icon192Buf);
    fs.writeFileSync(path.join(dir, 'icon-512.png'), logo512Buf);

    console.log(`✓ Updated public assets in: ${path.relative(rootDir, dir)}`);
  }

  // Root directory
  fs.writeFileSync(path.join(rootDir, 'logo.png'), logo1024Buf);
  fs.writeFileSync(path.join(rootDir, 'app-icon.svg'), svgContent);
  fs.writeFileSync(path.join(rootDir, 'favicon.ico'), icoBuf);
  console.log('✓ Updated root logo and icons');

  // Server uploads directory
  const serverUploads = path.join(rootDir, 'server', 'uploads');
  if (fs.existsSync(serverUploads)) {
    fs.writeFileSync(path.join(serverUploads, 'logo.png'), logo1024Buf);
    console.log('✓ Updated server/uploads/logo.png');
  }

  // Also root uploads directory
  const rootUploads = path.join(rootDir, 'uploads');
  if (fs.existsSync(rootUploads)) {
    fs.writeFileSync(path.join(rootUploads, 'logo.png'), logo1024Buf);
    console.log('✓ Updated uploads/logo.png');
  }

  console.log('All logo and icon assets successfully generated!');
}

generateAll().catch(err => {
  console.error('Failed to generate logos:', err);
  process.exit(1);
});
