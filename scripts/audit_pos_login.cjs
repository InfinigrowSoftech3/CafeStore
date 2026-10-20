const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_audit_login_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9226/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Network.enable' }));

      // Click "Cashier Terminal" demo login
      setTimeout(() => {
        console.log('Action: Clicking Cashier Terminal button...');
        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const btn = btns.find(b => b.textContent.includes('Cashier Terminal'));
              if (btn) {
                btn.click();
                return 'Clicked';
              }
              return 'Not found';
            })()`
          }
        }));
      }, 1500);

      // Check root 2 seconds after login
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: 'document.getElementById("root") ? document.getElementById("root").innerHTML : "NO ROOT"' }
        }));
      }, 3500);

      // Check root 5 seconds after login (after async catalog loads)
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 20,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const root = document.getElementById("root");
              return {
                length: root ? root.innerHTML.length : 0,
                hasHeader: !!document.querySelector('header'),
                hasProducts: document.querySelectorAll('button').length,
                bodyClass: document.body.className
              };
            })()`,
            returnByValue: true
          }
        }));
      }, 6000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE [' + data.params.type + ']:', JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.id === 5) {
        console.log('Click result:', data.result?.result?.value);
      }
      if (data.id === 10) {
        console.log('HTML length at 3.5s:', data.result?.result?.value?.length);
      }
      if (data.id === 20) {
        console.log('Stats at 6s:', data.result?.result?.value);
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
