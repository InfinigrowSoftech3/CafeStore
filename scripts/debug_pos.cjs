const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_debug_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9223/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    console.log('Page target URL:', page.url);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: { expression: 'document.getElementById("root").innerHTML' }
        }));
      }, 2000);
    };
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, JSON.stringify(data.params.args));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION THROWN:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.id === 3) {
        console.log('ROOT HTML LENGTH:', data.result?.result?.value?.length);
        console.log('ROOT HTML PREVIEW:', data.result?.result?.value?.slice(0, 300));
        child.kill();
        process.exit(0);
      }
    };
  } catch (e) {
    console.error('ERR:', e.message);
    child.kill();
    process.exit(1);
  }
}, 3000);
