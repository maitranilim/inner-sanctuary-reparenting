import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const types = new Map([['.html', 'text/html'], ['.css', 'text/css'], ['.js', 'text/javascript'], ['.mjs', 'text/javascript']]);
let server;
let browser;
let base;

before(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': types.get(extname(file)) || 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
});

after(async () => {
  await browser?.close();
  await new Promise((resolveClose) => server?.close(resolveClose));
});

async function open() {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  const thirdPartyRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith(base)) thirdPartyRequests.push(request.url());
  });
  const response = await page.goto(`${base}/`);
  assert.equal(response?.status(), 200);
  return { context, page, errors, thirdPartyRequests };
}

test('the reflection page loads without third-party requests', async () => {
  const { context, page, thirdPartyRequests } = await open();
  assert.equal(await page.title(), 'Inner Sanctuary — A practice in coming home');
  assert.deepEqual(thirdPartyRequests, []);
  await context.close();
});

test('the practice creates a response and resets when the feeling is cleared', async () => {
  const { context, page, errors } = await open();
  await page.locator('#feeling-select').selectOption('overwhelmed');
  assert.equal(await page.locator('#dialogue-content').isVisible(), true);
  assert.match(await page.locator('.wise-text').textContent(), /break this down into tiny, manageable pieces/);
  assert.equal(await page.getByRole('button', { name: 'Copy response' }).isEnabled(), true);
  await page.locator('#feeling-select').selectOption('');
  assert.equal(await page.locator('#dialogue-content').isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the check-in saves locally, renders text safely, and can be removed', async () => {
  const { context, page, errors } = await open();
  await page.locator('#check-in-note').fill('<b>playtest note</b>');
  assert.equal(await page.locator('#character-count').textContent(), '20 / 500');
  await page.getByRole('button', { name: 'Save this note' }).click();
  assert.match(await page.locator('#save-status').textContent(), /Saved on this device/);
  assert.equal(await page.locator('#check-in-history strong').count(), 0);
  assert.equal(await page.locator('#check-in-history p').textContent(), '<b>playtest note</b>');
  assert.equal(await page.locator('#clear-check-ins').isVisible(), true);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove reflection from' }).click();
  assert.equal(await page.locator('#history-empty').isVisible(), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test('breathing starts, follows the chosen technique, and stops on request', async () => {
  const { context, page, errors } = await open();
  const start = page.locator('#breathing-toggle');
  await start.click();
  assert.equal(await page.locator('#breathing-circle').textContent(), 'Breathe in');
  assert.equal(await start.getAttribute('aria-pressed'), 'true');
  await page.locator('[data-pattern="box"]').click();
  assert.equal(await page.locator('[data-pattern="box"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#pattern-description').textContent(), /each for 4/);
  assert.equal(await page.locator('#breathing-circle').textContent(), 'Breathe in');
  await start.click();
  assert.equal(await page.locator('#breathing-circle').textContent(), 'Ready');
  assert.equal(await start.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the mood check-in suggests a technique and selects it', async () => {
  const { context, page, errors } = await open();
  assert.equal(await page.locator('#mood-suggestion').isVisible(), false);
  await page.locator('[data-mood="overwhelmed"]').click();
  assert.equal(await page.locator('#mood-suggestion').isVisible(), true);
  await page.locator('#mood-go').click();
  assert.equal(await page.locator('[data-pattern="sigh"]').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the games respond and can be switched', async () => {
  const { context, page, errors } = await open();
  await page.locator('#bubble-field').scrollIntoViewIfNeeded();
  await page.locator('#bubble-field .bubble').first().waitFor();
  await page.locator('#bubble-field .bubble').first().click({ force: true });
  assert.notEqual((await page.locator('#bubble-message').textContent()).trim(), 'Take your time.');
  await page.locator('[data-game="garden"]').click();
  await page.locator('#garden-word').fill('morning light');
  await page.locator('#garden-plant').click();
  assert.equal(await page.locator('#garden-field .flower').count(), 1);
  assert.equal(await page.locator('#garden-field .flower-label').textContent(), 'morning light');
  await page.locator('#garden-clear').click();
  assert.equal(await page.locator('#garden-field .flower').count(), 0);
  await page.locator('[data-game="pond"]').click();
  assert.equal(await page.locator('#pond-canvas').isVisible(), true);
  await page.locator('#pond-canvas').press('Enter');
  await page.locator('[data-game="mandala"]').click();
  assert.equal(await page.locator('#mandala-canvas').isVisible(), true);
  await page.locator('#mandala-canvas').press('Enter');
  assert.equal(await page.locator('#bubble-field').isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the page has no page numbers and no tiny text', async () => {
  const { context, page } = await open();
  const body = await page.locator('body').innerText();
  assert.doesNotMatch(body, /\b0[1-5] \/ 0[1-5]\b/);
  const small = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((element) => element.childNodes.length && [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()))
    .filter((element) => getComputedStyle(element).display !== 'none' && element.getClientRects().length)
    .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 13)
    .map((element) => `${element.tagName}.${element.className}`));
  assert.deepEqual(small, []);
  await context.close();
});

test('mobile navigation and theme remain keyboard reachable', async () => {
  const { context, page, errors } = await open();
  await page.setViewportSize({ width: 375, height: 812 });
  const menu = page.locator('#nav-toggle');
  const pillars = page.getByRole('link', { name: 'Four pillars' });
  await menu.click();
  await pillars.waitFor({ state: 'visible' });
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await menu.press('Escape');
  await pillars.waitFor({ state: 'hidden' });
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('body').getAttribute('class'), 'dark-mode');
  await page.reload();
  assert.equal(await page.locator('body').getAttribute('class'), 'dark-mode');
  assert.deepEqual(errors, []);
  await context.close();
});

test('storage denial does not prevent the site or temporary check-ins from working', async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await context.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('#check-in-note').fill('Temporary note');
  await page.locator('#save-check-in').click();
  assert.match(await page.locator('#save-status').textContent(), /Saved for this visit only/);
  assert.equal(await page.locator('#check-in-history p').textContent(), 'Temporary note');
  assert.deepEqual(errors, []);
  await context.close();
});

