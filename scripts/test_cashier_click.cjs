const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_debug_click_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9224/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

      // Click Cashier button after 1s
      setTimeout(() => {
        console.log('Sending click event...');
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const cashierBtn = btns.find(b => b.textContent.includes('Cashier Terminal'));
              if (cashierBtn) {
                cashierBtn.click();
                return 'Clicked Cashier Button';
              }
              return 'Btn not found';
            })()`
          }
        }));
      }, 1500);

      // Check root innerHTML after click
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.evaluate',
          params: { expression: 'document.getElementById("root").innerHTML' }
        }));
      }, 3500);
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
        console.log('CLICK RESULT:', data.result?.result?.value);
      }
      if (data.id === 4) {
        console.log('ROOT HTML AFTER CLICK LENGTH:', data.result?.result?.value?.length);
        console.log('ROOT HTML AFTER CLICK SNIPPET:', data.result?.result?.value?.slice(0, 300));
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
