const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9225',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_audit_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9225/json');
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
          params: { expression: 'document.getElementById("root") ? document.getElementById("root").innerHTML : "NO ROOT"' }
        }));
      }, 3000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE [' + data.params.type + ']:', JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.method === 'Network.responseReceived') {
        const r = data.params.response;
        if (r.status >= 400) {
          console.log('FAILED NET:', r.status, r.url);
        }
      }
      if (data.id === 10) {
        console.log('ROOT HTML LENGTH:', data.result?.result?.value?.length);
        console.log('ROOT HTML SNIPPET:', data.result?.result?.value?.slice(0, 200));
        child.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error('ERR:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);
