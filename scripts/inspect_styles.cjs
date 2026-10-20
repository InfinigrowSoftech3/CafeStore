const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9239',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_styles_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9239/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page' && t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const root = document.getElementById('root');
              const firstChild = root ? root.firstElementChild : null;
              const card = document.querySelector('.bg-slate-900\\/95') || document.querySelector('form');
              return {
                bodyBg: window.getComputedStyle(document.body).backgroundColor,
                bodyWidth: document.body.offsetWidth,
                bodyHeight: document.body.offsetHeight,
                rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
                rootWidth: root ? root.offsetWidth : null,
                rootHeight: root ? root.offsetHeight : null,
                firstChildTag: firstChild ? firstChild.tagName : null,
                firstChildClass: firstChild ? firstChild.className : null,
                firstChildBg: firstChild ? window.getComputedStyle(firstChild).backgroundColor : null,
                firstChildRect: firstChild ? firstChild.getBoundingClientRect() : null,
                cardRect: card ? card.getBoundingClientRect() : null,
                windowInnerWidth: window.innerWidth,
                windowInnerHeight: window.innerHeight,
                documentVisibility: document.visibilityState
              };
            })()`,
            returnByValue: true
          }
        }));
      }, 2500);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log('COMPUTED METRICS:', JSON.stringify(data.result?.result?.value, null, 2));
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
