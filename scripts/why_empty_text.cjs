const { execFile } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = execFile(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9242',
  '--disable-gpu',
  '--user-data-dir=' + process.env.TEMP + '\\pos_why_empty_' + Date.now(),
  'https://cafestore-pos.vercel.app/'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9242/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page' && t.url.includes('cafestore-pos'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const elements = Array.from(document.querySelectorAll('*'));
              const details = elements.map(el => {
                const style = window.getComputedStyle(el);
                return {
                  tag: el.tagName,
                  class: el.className,
                  display: style.display,
                  visibility: style.visibility,
                  opacity: style.opacity,
                  width: el.offsetWidth,
                  height: el.offsetHeight,
                  text: el.innerText ? el.innerText.slice(0, 30) : ''
                };
              });
              // Filter to elements with non-empty text or top-level containers
              return details.filter(d => ['BODY', 'DIV', 'H1', 'BUTTON', 'FORM'].includes(d.tag)).slice(0, 20);
            })()`,
            returnByValue: true
          }
        }));
      }, 3000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        console.log('ELEMENT STYLES:', JSON.stringify(data.result?.result?.value, null, 2));
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
