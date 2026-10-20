const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9230',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_full_flow_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9230/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
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

      // Click Cashier button at 3.5s
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const btn = btns.find(b => b.textContent.includes('Cashier'));
              if (btn) {
                btn.click();
                return 'CLICKED_CASHIER: ' + btn.textContent.trim();
              }
              return 'NO_CASHIER_BTN';
            })()`,
            returnByValue: true
          }
        }));
      }, 3500);

      // Inspect POS Station after 6s
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
                hasCategoryRail: !!document.querySelector('.custom-sidebar-scroll'),
                tableOptions: Array.from(document.querySelectorAll('option')).map(o => o.textContent.trim())
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
        console.log('STEP 1 - Initial Buttons:', data.result?.result?.value);
      }
      if (data.id === 4) {
        console.log('STEP 2 - Click Result:', data.result?.result?.value);
      }
      if (data.id === 5) {
        console.log('STEP 3 - Final Terminal Inspection:', data.result?.result?.value);
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
