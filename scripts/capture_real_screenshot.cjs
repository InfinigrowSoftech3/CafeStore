const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profileDir = path.join(process.env.TEMP, 'pos_shot2_' + Date.now());
const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9238',
  '--disable-gpu',
  '--user-data-dir=' + profileDir,
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9238/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page' && t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({
        id: 2,
        method: 'Emulation.setDeviceMetricsOverride',
        params: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }
      }));

      // Wait 3s
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.captureScreenshot',
          params: { format: 'png', captureBeyondViewport: false }
        }));
      }, 3000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 3) {
        const base64 = data.result?.data;
        const outPath = path.join('C:\\Users\\kyada\\.gemini\\antigravity\\brain\\98716e09-8e92-4668-8a53-3a8605d71a1e', 'live_pos_real_shot.png');
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log('REAL SCREENSHOT SAVED TO:', outPath);
        child.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error(err);
    child.kill();
    process.exit(1);
  }
}, 2000);
