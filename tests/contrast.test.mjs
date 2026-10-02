import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const types = new Map([['.html', 'text/html'], ['.css', 'text/css'], ['.js', 'text/javascript'], ['.mjs', 'text/javascript']]);
const themes = {
  light: { theme: 'light', settings: {} },
  dark: { theme: 'dark', settings: {} },
  campfire: { theme: 'dark', settings: { campfire: true } },
};
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
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

function auditInPage() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const parse = (value) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000';
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, bottom) => {
    const alpha = top[3];
    return [top[0] * alpha + bottom[0] * (1 - alpha), top[1] * alpha + bottom[1] * (1 - alpha), top[2] * alpha + bottom[2] * (1 - alpha), 1];
  };
  const luminance = ([r, g, b]) => {
    const channel = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const cache = new Map();
  const backgrounds = (element) => {
    if (!element) return [[255, 255, 255, 1]];
    if (cache.has(element)) return cache.get(element);
    const below = backgrounds(element.parentElement);
    const style = getComputedStyle(element);
    const color = parse(style.backgroundColor);
    const stops = style.backgroundImage.includes('gradient')
      ? (style.backgroundImage.match(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}/gi) || []).map(parse).filter((stop) => stop[3] > 0)
      : [];
    let result = below;
    if (color[3] > 0) result = below.map((candidate) => over(color, candidate));
    if (stops.length) result = stops.flatMap((stop) => result.map((candidate) => over(stop, candidate)));
    const unique = new Map(result.map((candidate) => [candidate.map(Math.round).join(','), candidate]));
    const list = [...unique.values()].slice(0, 12);
    cache.set(element, list);
    return list;
  };
  const opacityOf = (element) => {
    let value = 1;
    for (let node = element; node; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
    return value;
  };
  const visible = (element) => {
    if (!element.getClientRects().length) return false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (node.classList.contains('visually-hidden') || node.classList.contains('skip-link')) return false;
    }
    return true;
  };
  const failures = [];
  const check = (element, foreground, label, large, backdrop = element) => {
    const opacity = opacityOf(element);
    if (opacity < 0.05) return;
    const required = large ? 3 : 4.5;
    let worst = Infinity;
    let worstColors = null;
    backgrounds(backdrop).forEach((background) => {
      const fg = over([foreground[0], foreground[1], foreground[2], foreground[3] * opacity], background);
      const value = ratio(fg, background);
      if (value < worst) {
        worst = value;
        worstColors = [fg, background];
      }
    });
    if (worst < required) {
      failures.push(`${label} ratio ${worst.toFixed(2)} < ${required} fg=${worstColors[0].map(Math.round)} bg=${worstColors[1].map(Math.round)}`);
    }
  };
  const describe = (element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${String(element.className).split(' ')[0]} "${(element.textContent || '').trim().slice(0, 28)}"`;
  document.querySelectorAll('body *').forEach((element) => {
    if (!visible(element)) return;
    if (element.matches(':disabled, [aria-disabled="true"]')) return;
    const hasText = [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
    if (hasText) {
      const style = getComputedStyle(element);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const decorative = Boolean(element.closest('[aria-hidden="true"]'));
      const large = decorative || size >= 24 || (size >= 18.66 && bold);
      check(element, parse(style.color), describe(element), large);
    }
    if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && element.placeholder) {
      check(element, parse(getComputedStyle(element, '::placeholder').color), `placeholder ${describe(element)}`, false);
    }
    if (element.classList.contains('switch')) {
      const style = getComputedStyle(element);
      check(element, parse(style.borderTopColor), `switch ${element.id}`, true, element.parentElement);
    }
  });
  return [...new Set(failures)];
}

async function prepare(name, viewport) {
  const config = themes[name];
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport, colorScheme: config.theme });
  await context.addInitScript(([theme, settings]) => {
    try {
      localStorage.setItem('inner-sanctuary-theme', theme);
      localStorage.setItem('inner-sanctuary-settings', JSON.stringify(settings));
    } catch {}
  }, [config.theme, config.settings]);
  await context.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base);
  return { context, page };
}

for (const name of Object.keys(themes)) {
  for (const viewport of viewports) {
    test(`text and controls keep readable contrast in ${name} at ${viewport.width}px`, async () => {
      const { context, page } = await prepare(name, viewport);
      const failures = [];
      const run = async (state) => {
        (await page.evaluate(auditInPage)).forEach((failure) => failures.push(`[${state}] ${failure}`));
      };
      await page.locator('[data-mood="overwhelmed"]').click();
      await page.locator('[data-feeling="overwhelmed"]').click();
      await page.locator('#save-feeling').click();
      await page.locator('#check-in-note').fill('A note');
      await page.locator('#save-check-in').click();
      await page.locator('[data-need="Rest"]').click();
      await page.locator('#breathing-toggle').click();
      await run('page');
      await page.locator('#breathing-toggle').click();
      await page.locator('[data-game="pond"]').click();
      await run('pond');
      await page.locator('[data-game="garden"]').click();
      await page.locator('#garden-word').fill('warm tea');
      await page.locator('#garden-plant').click();
      await run('garden');
      await page.locator('[data-game="mandala"]').click();
      await run('mandala');
      await page.locator('#menu-toggle').click();
      await page.locator('#set-eye').check();
      await page.locator('#settings-menu').waitFor({ state: 'visible' });
      await run('menu');
      await page.locator('#menu-toggle').click();
      await page.locator('[data-open-saved]').click();
      await page.locator('#saved-drawer').waitFor({ state: 'visible' });
      await page.locator('#saved-feelings-menu summary').click();
      await run('drawer');
      await context.close();
      assert.deepEqual(failures, []);
    });
  }
}
