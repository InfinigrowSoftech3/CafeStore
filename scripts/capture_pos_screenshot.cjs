const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const profileDir = path.join(process.env.TEMP, 'pos_shot_' + Date.now());
const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9235',
  '--window-size=1280,800',
  '--disable-gpu',
  '--user-data-dir=' + profileDir,
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9235/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

      // Take screenshot after 3 seconds
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 3000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 10) {
        const base64 = data.result?.data;
        const outPath = path.join('C:\\Users\\kyada\\.gemini\\antigravity\\brain\\98716e09-8e92-4668-8a53-3a8605d71a1e', 'live_pos_shot.png');
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log('SCREENSHOT SAVED TO:', outPath);
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
