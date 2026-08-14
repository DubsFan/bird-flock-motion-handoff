const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const name = process.argv[2];
const root = '/home/ubuntu/birds_exact_pixels';
const out = path.join(root, `${name}_flap_proof`);
const video = path.join(root, `${name}_transparent.webm`);
const times = [3.00, 3.25, 3.50, 3.75, 4.00, 4.25];
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args:['--allow-file-access-from-files']});
  const html = path.join(out, 'player.html');
  fs.writeFileSync(html, `<body style="margin:0;background:white"><video muted src="file://${video}" style="width:1672px;height:941px"></video></body>`);
  const page = await browser.newPage({viewport:{width:1672,height:941}});
  await page.goto(`file://${html}`); await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  for (const t of times) {
    await page.evaluate(async time=>{const v=document.querySelector('video'); await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time}); await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},t);
    await page.screenshot({path:path.join(out,`frame-${t.toFixed(2)}.png`)});
  }
  await browser.close();
})();
