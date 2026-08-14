import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';

const appUrl = 'http://localhost:3000';
const targetUrl = 'https://practical-portfolio-management-necgu1dcq-ggs-projects-4525ede8.vercel.app/ppm-bakeoff/briefing';
const downloadDir = '/home/ubuntu/bird-motion-mapper/.test-downloads';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const page = await context.newPage();

try {
  await mkdir(downloadDir, { recursive: true });
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.mapping-stage iframe');
  await page.waitForTimeout(900);

  const stage = page.locator('.mapping-stage');
  await page.getByRole('button', { name: 'Add anchor' }).click();
  await stage.click({ position: { x: 550, y: 360 } });
  const anchorCount = await page.locator('.anchor-stamp').count();
  assert(anchorCount === 4, `Expected 4 stage anchors after click, got ${anchorCount}`);

  await page.getByRole('button', { name: 'Draw flight' }).click();
  const box = await stage.boundingBox();
  assert(box, 'Mapping stage was not measurable');
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.22);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.40, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.50, box.y + box.height * 0.70, { steps: 6 });
  await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const routeCount = await page.locator('.route-item').count();
  assert(routeCount === 2, `Expected 2 routes after drawing, got ${routeCount}`);

  await page.getByRole('button', { name: 'Preview motion' }).click();
  await page.waitForTimeout(300);
  const birdCount = await page.locator('.preview-bird').count();
  assert(birdCount === 13, `Expected 13 preview birds, got ${birdCount}`);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export brief' }).click(),
  ]);
  const outputPath = `${downloadDir}/ppm-bird-motion-brief.json`;
  await download.saveAs(outputPath);
  const brief = JSON.parse(await readFile(outputPath, 'utf8'));
  assert(brief.anchors.length === 4, 'Exported JSON did not retain anchors');
  assert(brief.paths.length === 2, 'Exported JSON did not retain drawn route');

  const overlayPage = await context.newPage();
  await overlayPage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await overlayPage.addScriptTag({ path: '/home/ubuntu/bird-motion-mapper/client/public/bird-motion-mapper-overlay.js' });
  await overlayPage.waitForSelector('#bmm-root');
  await overlayPage.getByRole('button', { name: 'Anchor' }).click();
  await overlayPage.locator('#bmm-canvas').click({ position: { x: 760, y: 430 } });
  assert(await overlayPage.locator('.bmm-anchor').count() === 1, 'Live PPM overlay did not record a page anchor');
  await overlayPage.getByRole('button', { name: 'Draw' }).click();
  const canvas = overlayPage.locator('#bmm-canvas');
  const overlayBox = await canvas.boundingBox();
  assert(overlayBox, 'Live overlay canvas was not measurable');
  await overlayPage.mouse.move(overlayBox.x + 1180, overlayBox.y + 180);
  await overlayPage.mouse.down();
  await overlayPage.mouse.move(overlayBox.x + 920, overlayBox.y + 420, { steps: 6 });
  await overlayPage.mouse.move(overlayBox.x + 650, overlayBox.y + 600, { steps: 6 });
  await overlayPage.mouse.up();
  assert(await overlayPage.locator('.bmm-route').count() === 1, 'Live PPM overlay did not retain the drawn route');
  await overlayPage.keyboard.press('Escape');
  await overlayPage.waitForTimeout(100);
  assert(await overlayPage.locator('#bmm-root').count() === 0, 'Escape did not close live overlay');

  console.log(JSON.stringify({ pass: true, anchorCount, routeCount, birdCount, exportedAnchors: brief.anchors.length, exportedPaths: brief.paths.length, overlayTest: 'passed' }, null, 2));
} finally {
  await browser.close();
}
