const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9236',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_inspect_full_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9236/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `({
              rootInnerHTML: document.getElementById('root')?.innerHTML,
              bodyClass: document.body.className,
              scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML),
              styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href),
              headInnerHTML: document.head.innerHTML
            })`,
            returnByValue: true
          }
        }));
      }, 3000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.method === 'Network.responseReceived') {
        const r = data.params.response;
        console.log('NET:', r.status, r.url);
      }
      if (data.id === 10) {
        console.log('DOM DUMP:', JSON.stringify(data.result?.result?.value, null, 2));
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
