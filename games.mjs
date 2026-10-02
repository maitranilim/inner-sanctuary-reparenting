import { getMotion } from './settings.mjs';
import { play as haptic } from './haptics.mjs';
import { sounds } from './sound.mjs';

export const AFFIRMATIONS = [
  'You are doing better than you think.',
  'It is okay to go slowly.',
  'You deserve gentleness, too.',
  'This moment is enough.',
  'Rest is a form of care.',
  'You are allowed to take up space.',
  'Small steps still count.',
  'You have gotten through hard days before.',
  'Breathe. You are here.',
  'Be as kind to yourself as you are to others.',
];

export const GARDEN_LIMIT = 30;
export const FLOWERS = ['✿', '❀', '✾', '❁', '✽'];
export const FLOWER_COLORS = ['var(--flower-1)', 'var(--flower-2)', 'var(--flower-3)', 'var(--flower-4)', 'var(--flower-5)'];
export const MANDALA_COLORS = ['#526d58', '#a85d48', '#c69c59', '#d69b76', '#324f41'];

export function pick(list, random = Math.random) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function trimGardenWord(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

const reduced = () => getMotion() !== 'full';

function fitCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: rect.width, height: rect.height };
}

function createBubbles() {
  const field = document.getElementById('bubble-field');
  const message = document.getElementById('bubble-message');
  let timer = null;
  let visible = false;
  let active = true;

  function spawn() {
    if (field.querySelectorAll('.bubble').length >= 9) return;
    const bubble = document.createElement('button');
    const size = 54 + Math.random() * 60;
    bubble.type = 'button';
    bubble.className = 'bubble';
    bubble.setAttribute('aria-label', 'Pop bubble');
    bubble.style.setProperty('--size', `${size}px`);
    bubble.style.setProperty('--x', `${4 + Math.random() * 84}%`);
    bubble.style.setProperty('--dur', `${9 + Math.random() * 6}s`);
    bubble.style.setProperty('--sway', `${(Math.random() - 0.5) * 70}px`);
    bubble.style.setProperty('--rest', `${10 + Math.random() * 60}%`);
    bubble.addEventListener('click', () => {
      message.textContent = pick(AFFIRMATIONS);
      sounds.bubble();
      haptic('bubble');
      bubble.classList.add('popped');
      window.setTimeout(() => bubble.remove(), 450);
    });
    field.append(bubble);
    window.setTimeout(() => bubble.remove(), 16000);
  }

  function sync() {
    const shouldRun = visible && active && !document.hidden;
    if (shouldRun && timer === null) {
      spawn();
      timer = window.setInterval(spawn, reduced() ? 2600 : 1500);
    } else if (!shouldRun && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(field);
  } else {
    visible = true;
  }
  document.addEventListener('visibilitychange', sync);
  return { show() { active = true; sync(); }, hide() { active = false; sync(); } };
}

function createPond() {
  const canvas = document.getElementById('pond-canvas');
  const context = canvas.getContext('2d');
  const ripples = [];
  let frame = null;
  let last = 0;
  let size = null;
  let lastRipple = 0;

  let lastSound = 0;

  function addRipple(x, y, strong = false) {
    const now = performance.now();
    if (strong || now - lastSound > 420) {
      lastSound = now;
      sounds.ripple(strong);
    }
    if (strong) haptic('ripple');
    ripples.push({ x, y, radius: strong ? 6 : 3, alpha: strong ? 0.7 : 0.45, speed: strong ? 70 : 52 });
    if (ripples.length > 40) ripples.shift();
    if (frame === null) {
      last = performance.now();
      frame = window.requestAnimationFrame(draw);
    }
  }

  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    size = fitCanvas(canvas, context) || size;
    if (size) {
      context.clearRect(0, 0, size.width, size.height);
      const color = getComputedStyle(canvas).getPropertyValue('--ripple').trim() || '82 109 88';
      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        const ripple = ripples[index];
        ripple.radius += reduced() ? 0 : ripple.speed * dt;
        ripple.alpha -= dt * (reduced() ? 0.8 : 0.28);
        if (ripple.alpha <= 0) {
          ripples.splice(index, 1);
          continue;
        }
        context.lineWidth = 2;
        context.strokeStyle = `rgb(${color} / ${ripple.alpha.toFixed(3)})`;
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(ripple.x, ripple.y, ripple.radius * 0.62, 0, Math.PI * 2);
        context.strokeStyle = `rgb(${color} / ${(ripple.alpha * 0.55).toFixed(3)})`;
        context.stroke();
      }
    }
    frame = ripples.length ? window.requestAnimationFrame(draw) : null;
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = point(event);
    addRipple(x, y, true);
  });
  canvas.addEventListener('pointermove', (event) => {
    const now = performance.now();
    if (now - lastRipple < 130) return;
    lastRipple = now;
    const { x, y } = point(event);
    addRipple(x, y);
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    addRipple(rect.width * (0.2 + Math.random() * 0.6), rect.height * (0.2 + Math.random() * 0.6), true);
  });
  return { show() { size = null; } };
}

function createGarden(saved) {
  const field = document.getElementById('garden-field');
  const input = document.getElementById('garden-word');
  const status = document.getElementById('garden-status');

  function render(plant, animate) {
    const flower = document.createElement('span');
    flower.className = 'flower';
    flower.dataset.id = plant.id;
    flower.style.left = `${plant.x}%`;
    flower.style.top = `${plant.y}%`;
    flower.style.setProperty('--tone', FLOWER_COLORS[plant.tone % FLOWER_COLORS.length]);
    const bloom = document.createElement('span');
    bloom.className = 'bloom';
    if (!animate) bloom.style.animation = 'none';
    bloom.textContent = plant.symbol;
    flower.append(bloom);
    if (plant.word) {
      const label = document.createElement('span');
      label.className = 'flower-label';
      label.textContent = plant.word;
      flower.append(label);
    }
    field.append(flower);
  }

  function sync(animate = false) {
    const plants = saved.get().plants;
    const known = new Set(plants.map((plant) => plant.id));
    field.querySelectorAll('.flower').forEach((flower) => {
      if (!known.has(flower.dataset.id)) flower.remove();
    });
    const present = new Set([...field.querySelectorAll('.flower')].map((flower) => flower.dataset.id));
    plants.forEach((plant) => {
      if (!present.has(plant.id)) render(plant, animate);
    });
  }

  function plant(xPercent, yPercent) {
    const word = trimGardenWord(input.value);
    const created = saved.addPlant({
      word,
      symbol: pick(FLOWERS),
      tone: Math.floor(Math.random() * FLOWER_COLORS.length),
      x: xPercent,
      y: yPercent,
    });
    input.value = '';
    sync(true);
    sounds.bloom();
    haptic('bloom');
    const kept = saved.isPersistent() ? '' : ' It will stay for this visit only.';
    status.textContent = (created?.word ? `You planted “${created.word}”.` : 'A flower has bloomed.') + kept;
  }

  field.addEventListener('click', (event) => {
    const rect = field.getBoundingClientRect();
    plant(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  });
  document.getElementById('garden-plant').addEventListener('click', () => {
    plant(8 + Math.random() * 84, 18 + Math.random() * 68);
  });
  document.getElementById('garden-form').addEventListener('submit', (event) => {
    event.preventDefault();
    plant(8 + Math.random() * 84, 18 + Math.random() * 68);
  });
  document.getElementById('garden-clear').addEventListener('click', () => {
    saved.clear('plants');
    status.textContent = 'The garden is clear and ready for new seeds.';
  });
  saved.subscribe(() => sync(false));
  sync(false);
  return { show() {} };
}

function createMandala() {
  const canvas = document.getElementById('mandala-canvas');
  const context = canvas.getContext('2d');
  const segments = 8;
  let size = null;
  let drawing = false;
  let lastNote = 0;

  function ensure() {
    size = fitCanvas(canvas, context) || size;
    return size;
  }

  function dot(x, y) {
    if (!ensure()) return;
    const cx = size.width / 2;
    const cy = size.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const now = performance.now();
    if (now - lastNote > 90) {
      lastNote = now;
      sounds.mandala(Math.floor(distance / 28));
      haptic('mandala');
    }
    context.fillStyle = MANDALA_COLORS[Math.floor(distance / 28) % MANDALA_COLORS.length];
    context.globalAlpha = 0.85;
    for (let index = 0; index < segments; index += 1) {
      const rotated = angle + (index * Math.PI * 2) / segments;
      for (const flip of [1, -1]) {
        const a = flip === 1 ? rotated : -rotated;
        context.beginPath();
        context.arc(cx + Math.cos(a) * distance, cy + Math.sin(a) * distance, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    canvas.setPointerCapture?.(event.pointerId);
    const { x, y } = point(event);
    dot(x, y);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const { x, y } = point(event);
    dot(x, y);
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!ensure()) return;
    for (let index = 0; index < 6; index += 1) {
      dot(size.width / 2 + (Math.random() - 0.5) * size.width * 0.7, size.height / 2 + (Math.random() - 0.5) * size.height * 0.7);
    }
  });
  document.getElementById('mandala-clear').addEventListener('click', () => {
    if (ensure()) context.clearRect(0, 0, size.width, size.height);
  });
  return { show() { size = null; } };
}

export function initGames({ saved }) {
  const tabs = [...document.querySelectorAll('[data-game]')];
  const panels = [...document.querySelectorAll('[data-game-panel]')];
  const games = {
    bubbles: createBubbles(),
    pond: createPond(),
    garden: createGarden(saved),
    mandala: createMandala(),
  };

  function show(name) {
    tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.game === name)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.gamePanel !== name; });
    Object.entries(games).forEach(([key, game]) => {
      if (key === name) game.show?.();
      else game.hide?.();
    });
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.game)));
  show('bubbles');
  return { show };
}
