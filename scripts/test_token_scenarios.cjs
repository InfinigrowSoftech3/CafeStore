const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_test_token_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9227/json');
    const targets = await res.json();
    const page = targets.find(t => t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

      // Set an expired or malformed token in localStorage, then reload!
      setTimeout(() => {
        console.log('Injecting expired token and reloading...');
        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              // Create an expired JWT token
              const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
              const payload = btoa(JSON.stringify({ id: '123', exp: Math.floor(Date.now() / 1000) - 3600 }));
              const fakeToken = header + '.' + payload + '.signature';
              localStorage.setItem('accessToken', fakeToken);
              localStorage.setItem('token', fakeToken);
              location.reload();
            })()`
          }
        }));
      }, 1500);

      // Check after reload
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const root = document.getElementById("root");
              return {
                htmlLength: root ? root.innerHTML.length : 0,
                htmlSnippet: root ? root.innerHTML.slice(0, 150) : '',
                tokenInStorage: localStorage.getItem('accessToken')
              };
            })()`,
            returnByValue: true
          }
        }));
      }, 4500);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, JSON.stringify(data.params.args.map(a => a.value || a.description)));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
      }
      if (data.id === 10) {
        console.log('RESULT AFTER EXPIRED TOKEN RELOAD:', data.result?.result?.value);
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
