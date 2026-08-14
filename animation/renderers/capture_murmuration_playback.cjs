const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const name = process.argv[2];
if (!name) throw new Error('Usage: node capture_murmuration_playback.cjs <video-base-name>');
const root = '/home/ubuntu/birds_exact_pixels';
const outputDir = path.join(root, `${name}_playback_frames`);
const videoFile = path.join(root, `${name}_transparent.webm`);
const videoURL = `file://${videoFile}`;
const timestamps = [0.0, 0.7, 1.5, 2.5, 3.7, 5.0, 6.3, 7.6, 8.7, 9.7];
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required']
  });
  const playerFile = path.join(outputDir, 'player.html');
  fs.writeFileSync(playerFile, `<!doctype html><html><head><style>
    html,body { margin:0; width:100%; height:100%; overflow:hidden; background:#FFFFFF; }
    video { display:block; width:1672px; height:941px; object-fit:fill; }
  </style></head><body><video muted playsinline src="${videoURL}"></video></body></html>`);
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
  await page.goto(`file://${playerFile}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2, null, { timeout: 15000 });
  for (const timestamp of timestamps) {
    await page.evaluate(async (t) => {
      const v = document.querySelector('video');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('seek timeout')), 8000);
        v.addEventListener('seeked', () => { clearTimeout(timeout); resolve(); }, { once: true });
        v.currentTime = t;
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, timestamp);
    const suffix = String(timestamp).replace('.', '_').padStart(4, '0');
    await page.screenshot({ path: path.join(outputDir, `frame-${suffix}s.png`) });
  }
  await browser.close();
  console.log(`Rendered ${timestamps.length} browser playback frames to ${outputDir}`);
})();
