export const SETTINGS_KEY = 'inner-sanctuary-settings';

export const DEFAULT_SETTINGS = Object.freeze({
  reduceMotion: false,
  staticMode: false,
  campfire: false,
  eyeCare: false,
  warmth: 40,
  sound: true,
  haptics: true,
});

export function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const flag = (key) => (typeof source[key] === 'boolean' ? source[key] : DEFAULT_SETTINGS[key]);
  const warmth = Number(source.warmth);
  return {
    reduceMotion: flag('reduceMotion'),
    staticMode: flag('staticMode'),
    campfire: flag('campfire'),
    eyeCare: flag('eyeCare'),
    warmth: Number.isFinite(warmth) ? Math.min(100, Math.max(0, Math.round(warmth))) : DEFAULT_SETTINGS.warmth,
    sound: flag('sound'),
    haptics: flag('haptics'),
  };
}

export function resolveMotion(settings, systemReduced = false) {
  if (settings.staticMode) return 'static';
  if (settings.reduceMotion || systemReduced) return 'reduced';
  return 'full';
}

export function warmthToOpacity(warmth) {
  return Number((0.06 + (Math.min(100, Math.max(0, warmth)) / 100) * 0.3).toFixed(3));
}

export function getMotion() {
  return document.documentElement.dataset.motion || 'full';
}

export function createSettings() {
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const listeners = new Set();
  let memory = null;
  let current = { ...DEFAULT_SETTINGS };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) current = normalizeSettings(JSON.parse(raw));
  } catch {
    memory = null;
  }

  function apply() {
    root.dataset.motion = resolveMotion(current, media?.matches ?? false);
    if (current.campfire) root.dataset.campfire = 'on';
    else delete root.dataset.campfire;
    if (current.eyeCare) root.dataset.eyecare = 'on';
    else delete root.dataset.eyecare;
    root.style.setProperty('--warm', String(warmthToOpacity(current.warmth)));
  }

  function persist() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch {
      memory = current;
    }
  }

  function set(patch) {
    current = normalizeSettings({ ...current, ...patch });
    apply();
    persist();
    listeners.forEach((listener) => listener(current));
  }

  media?.addEventListener?.('change', () => {
    apply();
    listeners.forEach((listener) => listener(current));
  });

  apply();
  return {
    get: () => current,
    set,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
