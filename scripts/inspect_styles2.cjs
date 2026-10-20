const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9240',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_styles2_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9240/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page' && t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `try {
              const root = document.getElementById('root');
              const firstChild = root ? root.firstElementChild : null;
              JSON.stringify({
                bodyBg: window.getComputedStyle(document.body).backgroundColor,
                bodyWidth: document.body.offsetWidth,
                bodyHeight: document.body.offsetHeight,
                rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
                firstChildTag: firstChild ? firstChild.tagName : null,
                firstChildBg: firstChild ? window.getComputedStyle(firstChild).backgroundColor : null,
                firstChildRect: firstChild ? {
                  top: firstChild.getBoundingClientRect().top,
                  left: firstChild.getBoundingClientRect().left,
                  width: firstChild.getBoundingClientRect().width,
                  height: firstChild.getBoundingClientRect().height
                } : null,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
              });
            } catch (e) {
              'ERROR: ' + e.message + ' STACK: ' + e.stack;
            }`
          }
        }));
      }, 2500);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log('RESULT:', data.result?.result?.value || data.result);
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
