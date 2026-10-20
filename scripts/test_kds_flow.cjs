const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9231',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\kds_flow_' + Date.now(),
  'https://cafestore-kds.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9231/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-kds'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

      // Wait 2.5s for initial render, then log buttons
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              return btns.map(b => b.textContent.trim());
            })()`,
            returnByValue: true
          }
        }));
      }, 2500);

      // Click Kitchen button at 3.5s
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const btn = btns.find(b => b.textContent.includes('Kitchen'));
              if (btn) {
                btn.click();
                return 'CLICKED_KITCHEN: ' + btn.textContent.trim();
              }
              return 'NO_KITCHEN_BTN';
            })()`,
            returnByValue: true
          }
        }));
      }, 3500);

      // Inspect KDS board after 6s
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const root = document.getElementById('root');
              return {
                htmlLength: root ? root.innerHTML.length : 0,
                headerTitle: document.querySelector('header span')?.textContent,
                buttonsCount: document.querySelectorAll('button').length,
                ticketCount: document.querySelectorAll('.rounded-2xl').length
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
        console.log('CONSOLE:', data.params.type, JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.id === 3) {
        console.log('KDS STEP 1 - Initial Buttons:', data.result?.result?.value);
      }
      if (data.id === 4) {
        console.log('KDS STEP 2 - Click Result:', data.result?.result?.value);
      }
      if (data.id === 5) {
        console.log('KDS STEP 3 - Final Inspection:', data.result?.result?.value);
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
