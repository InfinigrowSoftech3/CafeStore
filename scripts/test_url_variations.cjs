const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const urlsToTest = [
  'https://cafestore-pos.vercel.app/?sso=invalid_jwt_token',
  'https://cafestore-pos.vercel.app/?table=1',
  'https://cafestore-pos.vercel.app/?cafe=velvetrosiee',
  'https://cafestore-pos.vercel.app/?tenant=velvetrosiee',
  'https://cafestore-kds.vercel.app/?sso=invalid_jwt_token'
];

async function run() {
  for (const url of urlsToTest) {
    await new Promise((resolve) => {
      const child = execFile(chromePath, [
        '--headless=new',
        '--remote-debugging-port=9241',
        '--disable-gpu',
        '--user-data-dir=' + process.env.TEMP + '\\pos_url_' + Date.now(),
        url
      ]);

      setTimeout(async () => {
        try {
          const res = await fetch('http://127.0.0.1:9241/json');
          const targets = await res.json();
          const page = targets.find(t => t.type === 'page');
          const ws = new WebSocket(page.webSocketDebuggerUrl);

          ws.onopen = () => {
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
            setTimeout(() => {
              ws.send(JSON.stringify({
                id: 2,
                method: 'Runtime.evaluate',
                params: {
                  expression: `({
                    htmlLen: document.getElementById('root')?.innerHTML?.length || 0,
                    text: document.body.innerText?.slice(0, 100)
                  })`,
                  returnByValue: true
                }
              }));
            }, 3000);
          };

          ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.id === 2) {
              console.log('TEST URL:', url);
              console.log('RESULT:', data.result?.result?.value);
              child.kill();
              resolve();
            }
          };
        } catch (err) {
          console.error('ERR on', url, err.message);
          child.kill();
          resolve();
        }
      }, 2000);
    });
  }
}
run();
