/**
 * Visual + console-error smoke test.
 * Requires: npm install --no-save playwright && npx playwright install chromium
 * Usage: node scripts/visual-qa.mjs [baseUrl] [outDir]
 */
import playwright from 'playwright';

const { chromium } = playwright;
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:4300';
const out = process.argv[3] ?? '/tmp/emodulo-shots';
fs.mkdirSync(out, { recursive: true });

const routes = [
  ['dashboard', '/'],
  ['modules', '/modules'],
  ['lesson', '/modules/inheritance-output'],
  ['activities', '/activities'],
  ['activity', '/activities/easy/inheritance'],
  ['quizzes', '/quizzes'],
  ['assessment', '/assessment/pretest/easy'],
  ['difficulties', '/difficulties'],
  ['badges', '/badges'],
  ['progress', '/progress'],
  ['certificate', '/certificate'],
  ['notifications', '/notifications'],
  ['messages', '/messages'],
  ['settings', '/settings'],
  ['profile', '/profile'],
  ['help', '/help'],
];

const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${out}/00-login.png`, fullPage: true });
await page.getByRole('button', { name: 'Fill credentials' }).click();
await page.getByRole('button', { name: /^Log in/ }).click();
await page.waitForURL(`${base}/`);
await page.waitForSelector('.hero');

for (const [name, path] of routes) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}

// Interaction: activity player (a resumed attempt may already be on the editor)
await page.goto(`${base}/activities/easy/inheritance`, { waitUntil: 'networkidle' });
const startActivity = page.getByRole('button', { name: /Proceed to activity/ });
if (await startActivity.count()) await startActivity.click();
await page.waitForSelector('.editor');
const blanks = await page.locator('.blank').count();
if (blanks > 0) {
  await page.locator('.block').first().click();
  if (blanks > 1) {
    await page.locator('.blank').nth(1).click();
    await page.locator('.block').nth(2).click();
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/activity-playing.png`, fullPage: true });
  const submit = page.getByRole('button', { name: /Submit activity/ });
  if (await submit.count()) {
    await submit.click();
    await page.waitForTimeout(900);
  }
}
await page.screenshot({ path: `${out}/activity-result.png`, fullPage: true });

// Interaction: assessment question
await page.goto(`${base}/assessment/pretest/easy`, { waitUntil: 'networkidle' });
const startTest = page.getByRole('button', { name: /Proceed to the test|Resume the test|Review results/ });
if (await startTest.count()) await startTest.click();
await page.waitForSelector('.question-card, .result-card');
if (await page.locator('.choice').count()) {
  if ((await page.locator('.choice.selected').count()) === 0) {
    await page.locator('.choice').nth(1).click();
    const next = page.locator('.question-foot .btn-primary');
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(700);
    }
  }
}
await page.screenshot({ path: `${out}/assessment-question.png`, fullPage: true });

// Dark mode
await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Learning preferences' }).click();
await page.getByRole('button', { name: 'Dark', exact: true }).click();
await page.waitForTimeout(500);
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/dashboard-dark.png`, fullPage: true });

// Mobile pass (reuse the signed-in session so authenticated layouts are captured)
const storageState = await context.storageState();
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  storageState,
});
const mp = await mobile.newPage();
mp.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[mobile console] ${msg.text()}`);
});
mp.on('pageerror', (err) => errors.push(`[mobile pageerror] ${err.message}`));
for (const [name, path] of [
  ['m-dashboard', '/'],
  ['m-modules', '/modules'],
  ['m-lesson', '/modules/what-is-inheritance'],
  ['m-activity', '/activities/easy/inheritance'],
  ['m-badges', '/badges'],
  ['m-messages', '/messages'],
  ['m-settings', '/settings'],
  ['m-difficulties', '/difficulties'],
]) {
  await mp.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(400);
  // Viewport capture keeps fixed bottom navigation where a phone actually shows it.
  await mp.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

// Horizontal overflow check per route
const overflows = [];
for (const [name, path] of routes) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) overflows.push(`${name}: ${overflow}px`);
}

await browser.close();

console.log(`Screenshots written to ${out}`);
if (overflows.length) console.log(`Horizontal overflow: ${overflows.join(', ')}`);
else console.log('No horizontal overflow on desktop.');
if (errors.length) {
  console.log(`Console errors (${errors.length}):`);
  for (const e of [...new Set(errors)]) console.log(' - ' + e);
  process.exitCode = 1;
} else {
  console.log('No console or page errors.');
}
