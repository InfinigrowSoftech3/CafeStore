async function checkAssets(appUrl) {
  const html = await (await fetch(appUrl)).text();
  const scriptMatch = html.match(/src="([^"]+)"/);
  const cssMatch = html.match(/href="([^"]+\.css)"/);
  console.log(appUrl, 'Script:', scriptMatch ? scriptMatch[1] : 'NONE', 'CSS:', cssMatch ? cssMatch[1] : 'NONE');
  if (scriptMatch) {
    const s = await fetch(new URL(scriptMatch[1], appUrl).href);
    console.log('Script Status:', s.status, 'Type:', s.headers.get('content-type'), 'Length:', s.headers.get('content-length'));
  }
  if (cssMatch) {
    const c = await fetch(new URL(cssMatch[1], appUrl).href);
    console.log('CSS Status:', c.status, 'Type:', c.headers.get('content-type'), 'Length:', c.headers.get('content-length'));
  }
}

async function run() {
  console.log('--- POS ---');
  await checkAssets('https://cafestore-pos.vercel.app/');
  console.log('--- KDS ---');
  await checkAssets('https://cafestore-kds.vercel.app/');
}
run();
