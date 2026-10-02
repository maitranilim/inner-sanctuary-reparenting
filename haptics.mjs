export const PATTERNS = {
  welcome: [20, 50, 30, 50, 45, 70, 30],
  hold: [10],
  complete: [40, 140, 40, 140, 70],
  bubble: [12],
  ripple: [10, 60, 18],
  bloom: [12, 45, 20, 45, 30, 45, 46],
  mandala: [6],
  tap: [8],
};

export function breathPattern(seconds, direction) {
  const pulses = Math.max(1, Math.min(16, Math.floor(seconds / 0.5)));
  const spacing = (seconds * 1000) / pulses;
  const pattern = [];
  for (let index = 0; index < pulses; index += 1) {
    const progress = pulses === 1 ? 1 : index / (pulses - 1);
    const strength = direction === 'in' ? progress : 1 - progress;
    const duration = Math.round(10 + strength * 50);
    pattern.push(duration);
    if (index < pulses - 1) pattern.push(Math.max(20, Math.round(spacing - duration)));
  }
  return pattern;
}

const MIN_GAP = { mandala: 140, bubble: 40, ripple: 160 };

let enabled = () => true;
let lastPlayed = {};

export function configureHaptics(isEnabled) {
  enabled = isEnabled;
}

export function hapticsSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function vibrate(pattern) {
  if (!hapticsSupported() || !enabled()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function play(name) {
  const pattern = PATTERNS[name];
  if (!pattern) return false;
  const now = Date.now();
  if (MIN_GAP[name] && now - (lastPlayed[name] || 0) < MIN_GAP[name]) return false;
  lastPlayed[name] = now;
  return vibrate(pattern);
}

export function playBreath(seconds, direction) {
  return vibrate(breathPattern(seconds, direction));
}

export function cancel() {
  if (hapticsSupported()) {
    try { navigator.vibrate(0); } catch {}
  }
}

export function initWelcomeHaptic() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (!coarse || !hapticsSupported()) return;
  const welcome = (event) => {
    if (event.pointerType && event.pointerType !== 'touch') return;
    window.removeEventListener('pointerdown', welcome, true);
    play('welcome');
  };
  window.addEventListener('pointerdown', welcome, true);
}
