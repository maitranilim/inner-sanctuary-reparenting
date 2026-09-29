import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
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
      response.writeHead(200, { 'Content-Type': types.get(extname(file)) || 'application/octet-stream' });
      response.end(await readFile(file));
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
  await page.goto(base);
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
  await page.getByLabel('I’m feeling…').selectOption('overwhelmed');
  assert.equal(await page.locator('#dialogue-content').isVisible(), true);
  assert.match(await page.locator('.wise-text').textContent(), /break this down into tiny, manageable pieces/);
  assert.equal(await page.getByRole('button', { name: 'Copy response' }).isEnabled(), true);
  await page.getByLabel('I’m feeling…').selectOption('');
  assert.equal(await page.locator('#dialogue-content').isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the check-in saves locally, renders text safely, and can be removed', async () => {
  const { context, page, errors } = await open();
  await page.getByLabel('Write a little, or leave it blank.').fill('<b>playtest note</b>');
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

test('the breathing pause starts, alternates cues, and stops on request', async () => {
  const { context, page, errors } = await open();
  const start = page.getByRole('button', { name: 'Begin a breathing pause' });
  await start.click();
  assert.equal(await page.locator('#breathing-circle').textContent(), 'Breathe in');
  assert.equal(await page.getByRole('button', { name: 'Stop breathing pause' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Stop breathing pause' }).click();
  assert.equal(await page.locator('#breathing-circle').textContent(), 'Ready');
  assert.equal(await page.getByRole('button', { name: 'Begin a breathing pause' }).getAttribute('aria-pressed'), 'false');
  assert.deepEqual(errors, []);
  await context.close();
});

test('mobile navigation and theme remain keyboard reachable', async () => {
  const { context, page, errors } = await open();
  await page.setViewportSize({ width: 375, height: 812 });
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  assert.equal(await page.getByRole('link', { name: 'Four pillars' }).isVisible(), true);
  assert.equal(await page.getByRole('button', { name: 'Close navigation' }).getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: 'Close navigation' }).press('Escape');
  assert.equal(await page.getByRole('link', { name: 'Four pillars' }).isVisible(), false);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
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
  await page.getByLabel('Write a little, or leave it blank.').fill('Temporary note');
  await page.getByRole('button', { name: 'Save this note' }).click();
  assert.match(await page.locator('#save-status').textContent(), /Saved for this visit only/);
  assert.equal(await page.locator('#check-in-history p').textContent(), 'Temporary note');
  assert.deepEqual(errors, []);
  await context.close();
});

