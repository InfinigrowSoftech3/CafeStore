const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9228',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_test_velvet_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9228/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

      // Wait 1.5s, then click Store Manager
      setTimeout(() => {
        console.log('Clicking Store Manager button...');
        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const btn = btns.find(b => b.textContent.includes('Store Manager'));
              if (btn) {
                btn.click();
                return 'Clicked Store Manager';
              }
              return 'Btn not found';
            })()`
          }
        }));
      }, 1500);

      // Inspect POSPage
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const root = document.getElementById("root");
              return {
                htmlLength: root ? root.innerHTML.length : 0,
                hasHeader: !!document.querySelector('header'),
                hasTables: document.querySelectorAll('option').length,
                optionsText: Array.from(document.querySelectorAll('option')).map(o => o.textContent),
                errors: window.__errors || []
              };
            })()`,
            returnByValue: true
          }
        }));
      }, 5000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.id === 5) {
        console.log('Click result:', data.result?.result?.value);
      }
      if (data.id === 10) {
        console.log('RESULT FOR MANAGER:', data.result?.result?.value);
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
