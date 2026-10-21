const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'scratch', 'screenshots');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const port = 9233;
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank',
  ]);

  try {
    let wsUrl = '';
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) {
          const data = await res.json();
          wsUrl = data.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await sleep(250);
    }

    const ws = new WebSocket(wsUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 1;
    const send = (m, p = {}) =>
      new Promise((resolve) => {
        const curId = id++;
        const handler = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method: m, params: p }));
      });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const pageWs = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${targetId}`);
    await new Promise((r) => (pageWs.onopen = r));
    const pageSend = (m, p = {}) =>
      new Promise((resolve) => {
        const curId = id++;
        const handler = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === curId) {
            pageWs.removeEventListener('message', handler);
            resolve(d.result);
          }
        };
        pageWs.addEventListener('message', handler);
        pageWs.send(JSON.stringify({ id: curId, method: m, params: p }));
      });

    await pageSend('Page.enable');
    await pageSend('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    console.log('Navigating to http://localhost:5173/menu?cafe=velvet-rosiee...');
    await pageSend('Page.navigate', { url: 'http://localhost:5173/menu?cafe=velvet-rosiee' });
    await sleep(4000);

    console.log('Clicking Hot Brews category...');
    const clickRes = await pageSend('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => (b.getAttribute('aria-label') || '').includes('Hot Brews'));
        if (btn) {
          btn.click();
          return 'Clicked: ' + btn.getAttribute('aria-label');
        }
        return 'Not found';
      })()`,
    });
    console.log('Click result:', clickRes.result?.value);
    await sleep(2000);

    const evalRes = await pageSend('Runtime.evaluate', { expression: 'document.body.innerText' });
    console.log('SCREEN 2 TEXT:\n', evalRes.result?.value?.slice(0, 1000));

    const { data } = await pageSend('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outputDir, 'screen2-category-390.png'), Buffer.from(data, 'base64'));
    console.log('Saved screen2-category-390.png, size:', data.length);

    pageWs.close();
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
