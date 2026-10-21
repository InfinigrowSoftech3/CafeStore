const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'scratch', 'screenshots');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getWsUrl(port = 9222) {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const data = await res.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('Could not connect to Chrome debugging port');
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('Launching headless Chrome for screenshot verification...');
  const port = 9222;
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ]);

  try {
    const browserWs = await getWsUrl(port);
    const client = new CdpClient(browserWs);
    await client.ready;

    // Create a new target page
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const targetWs = `ws://127.0.0.1:${port}/devtools/page/${targetId}`;
    const pageClient = new CdpClient(targetWs);
    await pageClient.ready;

    await pageClient.send('Page.enable');
    await pageClient.send('Network.enable');

    const viewports = [
      { name: 'screen1-mobile-390', width: 390, height: 844, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      { name: 'screen1-mobile-360', width: 360, height: 780, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      { name: 'screen1-mobile-430', width: 430, height: 932, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      { name: 'screen1-tablet-768', width: 768, height: 1024, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      { name: 'screen1-desktop-1024', width: 1024, height: 800, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      { name: 'screen1-desktop-1440', width: 1440, height: 900, url: 'http://localhost:5173/menu?cafe=velvet-rosiee' },
      // Different cafe verifying multi-tenant dynamic branding:
      { name: 'screen1-cafe-sipstack-demo-390', width: 390, height: 844, url: 'http://localhost:5173/menu?cafe=sipstack-demo' },
    ];

    for (const vp of viewports) {
      console.log(`Navigating to ${vp.url} @ ${vp.width}x${vp.height} (${vp.name})...`);
      await pageClient.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 768,
      });

      await pageClient.send('Page.navigate', { url: vp.url });
      // Wait for network requests (menu data from backend)
      await sleep(4000);

      const { data } = await pageClient.send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(outputDir, `${vp.name}.png`);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      console.log(`✓ Saved screenshot: ${vp.name}.png (${(data.length / 1024).toFixed(1)} KB)`);
    }

    // Now test SCREEN 2 (Category view) on velvet-rosiee @ 390x844
    console.log('Testing Screen 2 (Category view on velvet-rosiee)...');
    await pageClient.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await pageClient.send('Page.navigate', { url: 'http://localhost:5173/menu?cafe=velvet-rosiee' });
    await sleep(4000);

    const clickResult = await pageClient.send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button[aria-label*="category"]'));
          const catBtn = buttons.find(b => !b.getAttribute('aria-label').toLowerCase().includes('all'));
          if (catBtn) {
            catBtn.click();
            return 'clicked category: ' + catBtn.getAttribute('aria-label');
          }
          return 'no specific category button found';
        })()
      `,
    });
    console.log('Click result:', clickResult.result?.value);
    await sleep(2000);

    const { data: catData } = await pageClient.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outputDir, 'screen2-category-390.png'), Buffer.from(catData, 'base64'));
    console.log('✓ Saved screenshot: screen2-category-390.png');

    pageClient.close();
    client.close();
  } finally {
    chrome.kill();
  }
  console.log('All screenshot captures completed successfully!');
}

run().catch((err) => {
  console.error('Error running screenshots:', err);
  process.exit(1);
});
