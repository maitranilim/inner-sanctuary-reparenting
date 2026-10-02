export const PATTERNS = [
  {
    id: '478',
    name: '4-7-8',
    description: 'Breathe in for 4, hold for 7, breathe out for 8. A slow, settling rhythm that helps when your mind is racing or sleep feels far away.',
    phases: [
      { key: 'in', label: 'Breathe in', seconds: 4, from: 0.55, to: 1, hint: 'Slowly welcome the breath in through your nose.' },
      { key: 'hold', label: 'Hold', seconds: 7, from: 1, to: 1, hint: 'Rest here. Let your body be still.' },
      { key: 'out', label: 'Breathe out', seconds: 8, from: 1, to: 0.55, hint: 'Let the breath leave through your mouth, without forcing it.' },
    ],
  },
  {
    id: 'box',
    name: 'Box breathing',
    description: 'In, hold, out, hold, each for 4. An even, steady count that brings focus when you feel scattered or tense.',
    phases: [
      { key: 'in', label: 'Breathe in', seconds: 4, from: 0.55, to: 1, hint: 'Draw the breath in, one side of the box.' },
      { key: 'hold', label: 'Hold', seconds: 4, from: 1, to: 1, hint: 'Stay easy and still.' },
      { key: 'out', label: 'Breathe out', seconds: 4, from: 1, to: 0.55, hint: 'Release the breath evenly.' },
      { key: 'rest', label: 'Rest', seconds: 4, from: 0.55, to: 0.55, hint: 'Pause with empty lungs, softly.' },
    ],
  },
  {
    id: 'coherent',
    name: 'Coherent breathing',
    description: 'About 5 seconds in and 5 out, around six breaths a minute. A gentle, even wave that eases stress and low energy.',
    phases: [
      { key: 'in', label: 'Breathe in', seconds: 5.5, from: 0.55, to: 1, hint: 'Let the breath rise like a slow wave.' },
      { key: 'out', label: 'Breathe out', seconds: 5.5, from: 1, to: 0.55, hint: 'Let it fall back, just as slowly.' },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological sigh',
    description: 'Two short breaths in, one long breath out. One of the quickest ways to let go of tension when you feel overwhelmed.',
    phases: [
      { key: 'in', label: 'Breathe in', seconds: 2, from: 0.55, to: 0.85, hint: 'A first breath in through your nose.' },
      { key: 'in2', label: 'Sip in more', seconds: 1, from: 0.85, to: 1, hint: 'A second small sip on top, filling up.' },
      { key: 'out', label: 'Long breath out', seconds: 6, from: 1, to: 0.55, hint: 'Sigh it all out, slow and unhurried.' },
    ],
  },
];

export const DURATIONS = [1, 2, 5];

export const MOODS = [
  { id: 'anxious', label: 'Anxious or tense', pattern: '478', text: 'When the mind is racing, a long exhale helps most. 4-7-8 breathing is a good place to begin.' },
  { id: 'scattered', label: 'Scattered or restless', pattern: 'box', text: 'An even count can gather your attention. Try a few rounds of box breathing.' },
  { id: 'low', label: 'Low or tired', pattern: 'coherent', text: 'Slow, even breaths are gentle on a tired body. Coherent breathing asks very little of you.' },
  { id: 'overwhelmed', label: 'Overwhelmed', pattern: 'sigh', text: 'Two small sips in and one long sigh out can loosen things quickly. Try the physiological sigh.' },
  { id: 'playful', label: 'Light and curious', target: 'play', text: 'Let the lightness lead. Pop a few bubbles or draw ripples across the pond.' },
];

export function getPattern(id) {
  return PATTERNS.find((pattern) => pattern.id === id) || null;
}

export function getMoodSuggestion(id) {
  const mood = MOODS.find((item) => item.id === id);
  if (!mood) return null;
  if (mood.target === 'play') return { ...mood, href: '#play', cta: 'Open the play space' };
  const pattern = getPattern(mood.pattern);
  return { ...mood, href: '#breathe', cta: `Try ${pattern.name}` };
}

export function cycleSeconds(pattern) {
  return pattern.phases.reduce((total, phase) => total + phase.seconds, 0);
}

function ease(t) {
  return t * t * (3 - 2 * t);
}

export function getPhaseState(pattern, elapsedSeconds) {
  const length = cycleSeconds(pattern);
  const elapsed = Math.max(0, elapsedSeconds);
  const cycle = Math.floor(elapsed / length);
  let within = elapsed - cycle * length;
  for (let index = 0; index < pattern.phases.length; index += 1) {
    const phase = pattern.phases[index];
    if (within < phase.seconds || index === pattern.phases.length - 1) {
      const progress = Math.min(1, within / phase.seconds);
      return {
        index,
        phase,
        cycle: cycle + 1,
        remaining: Math.max(0, phase.seconds - within),
        scale: phase.from + (phase.to - phase.from) * ease(progress),
      };
    }
    within -= phase.seconds;
  }
  return null;
}

export function initBreathing() {
  const byId = (id) => document.getElementById(id);
  const toggle = byId('breathing-toggle');
  const circle = byId('breathing-circle');
  const ring = byId('breathing-ring');
  const instruction = byId('breathing-instruction');
  const count = byId('breathing-count');
  const cycles = byId('breathing-cycles');
  const description = byId('pattern-description');
  const soundToggle = byId('breathing-sound');
  const patternButtons = [...document.querySelectorAll('[data-pattern]')];
  const durationButtons = [...document.querySelectorAll('[data-minutes]')];
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const idleMessage = 'When you’re ready, begin with a slow inhale.';

  let pattern = PATTERNS[0];
  let minutes = 2;
  let running = false;
  let frame = null;
  let startedAt = 0;
  let lastIndex = -1;
  let audio = null;

  function chime(key) {
    if (!soundToggle.checked || key === 'hold' || key === 'rest') return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = key === 'out' ? 262 : 330;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, audio.currentTime + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.6);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 1.7);
    } catch {
      soundToggle.checked = false;
    }
    try { navigator.vibrate?.(key === 'out' ? 40 : 20); } catch {}
  }

  function setScale(scale) {
    if (!reducedMotion) ring.style.transform = `scale(${scale.toFixed(3)})`;
  }

  function reset(message = idleMessage) {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    running = false;
    lastIndex = -1;
    circle.textContent = 'Ready';
    instruction.textContent = message;
    count.textContent = '';
    cycles.textContent = '';
    ring.style.transform = '';
    toggle.textContent = 'Begin breathing';
    toggle.setAttribute('aria-pressed', 'false');
    ring.classList.remove('active');
  }

  function tick(now) {
    const elapsed = (now - startedAt) / 1000;
    if (elapsed >= minutes * 60) {
      reset('Well done. Take a moment before you continue.');
      return;
    }
    const state = getPhaseState(pattern, elapsed);
    if (state.index !== lastIndex) {
      lastIndex = state.index;
      circle.textContent = state.phase.label;
      instruction.textContent = state.phase.hint;
      chime(state.phase.key);
    }
    count.textContent = String(Math.ceil(state.remaining));
    cycles.textContent = `Round ${state.cycle}`;
    setScale(state.scale);
    frame = window.requestAnimationFrame(tick);
  }

  function start() {
    reset();
    running = true;
    startedAt = performance.now();
    ring.classList.add('active');
    toggle.textContent = 'Stop';
    toggle.setAttribute('aria-pressed', 'true');
    tick(startedAt);
  }

  function select(id) {
    const next = getPattern(id);
    if (!next) return;
    pattern = next;
    patternButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pattern === id)));
    description.textContent = next.description;
    if (running) start();
  }

  toggle.addEventListener('click', () => (running ? reset() : start()));
  patternButtons.forEach((button) => button.addEventListener('click', () => select(button.dataset.pattern)));
  durationButtons.forEach((button) => button.addEventListener('click', () => {
    minutes = Number(button.dataset.minutes);
    durationButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  }));
  window.addEventListener('pagehide', () => reset());

  select(pattern.id);
  return { select, stop: reset };
}
