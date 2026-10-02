export const PENTATONIC = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99, 880];

export const PAD_CHORDS = [
  [146.83, 220, 329.63, 369.99],
  [123.47, 185, 220, 293.66],
  [110, 164.81, 246.94, 369.99],
  [146.83, 185, 293.66, 440],
];

export function noteForIndex(index) {
  const length = PENTATONIC.length;
  return PENTATONIC[((Math.floor(index) % length) + length) % length];
}

export function padChord(cycle) {
  return PAD_CHORDS[Math.max(0, cycle - 1) % PAD_CHORDS.length];
}

let audio = null;
let master = null;
let reverb = null;
let enabled = true;
let trackPromise = null;

function context() {
  if (audio) return audio;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  try {
    audio = new Context();
    master = audio.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(audio.destination);
    reverb = audio.createConvolver();
    reverb.buffer = impulse(audio, 2.4);
    const wet = audio.createGain();
    wet.gain.value = 0.38;
    reverb.connect(wet).connect(master);
  } catch {
    audio = null;
  }
  return audio;
}

function impulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 2.6);
    }
  }
  return buffer;
}

export function unlock() {
  const ctx = context();
  if (ctx && ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
  return ctx;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  if (master && audio) master.gain.setTargetAtTime(enabled ? 0.8 : 0, audio.currentTime, 0.05);
}

export function soundEnabled() {
  return enabled;
}

function ready() {
  if (!enabled) return null;
  return unlock();
}

function send(node, amount = 0.5) {
  node.connect(master);
  const gain = audio.createGain();
  gain.gain.value = amount;
  node.connect(gain).connect(reverb);
}

function tone({ freq, type = 'sine', start = 0, attack = 0.01, decay = 0.6, peak = 0.2, cutoff = 4000, reverbAmount = 0.5, glideTo = null }) {
  const ctx = audio;
  const now = ctx.currentTime + start;
  const oscillator = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + decay);
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  oscillator.connect(filter).connect(gain);
  send(gain, reverbAmount);
  oscillator.start(now);
  oscillator.stop(now + attack + decay + 0.1);
}

function noiseBurst({ duration = 0.09, peak = 0.12, cutoff = 2400 }) {
  const ctx = audio;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.value = peak;
  source.connect(filter).connect(gain);
  send(gain, 0.3);
  source.start();
}

export const sounds = {
  bubble() {
    if (!ready()) return;
    const note = noteForIndex(3 + Math.floor(Math.random() * 6));
    noiseBurst({ duration: 0.08, peak: 0.1, cutoff: 1800 + Math.random() * 1200 });
    tone({ freq: note, glideTo: note * 1.5, decay: 0.28, peak: 0.12, reverbAmount: 0.6 });
  },
  ripple(strong = false) {
    if (!ready()) return;
    const note = noteForIndex(strong ? 0 : 1 + Math.floor(Math.random() * 4));
    tone({ freq: note / 2, glideTo: note / 2.6, decay: strong ? 1.6 : 1.1, attack: 0.02, peak: strong ? 0.22 : 0.1, cutoff: 900, reverbAmount: 0.9 });
    tone({ freq: note, decay: 0.8, attack: 0.03, peak: strong ? 0.06 : 0.03, cutoff: 1600, reverbAmount: 1, start: 0.12 });
  },
  bloom() {
    if (!ready()) return;
    const base = 1 + Math.floor(Math.random() * 3);
    [0, 2, 4].forEach((step, index) => {
      tone({ freq: noteForIndex(base + step), type: 'triangle', start: index * 0.11, attack: 0.012, decay: 0.9, peak: 0.1, cutoff: 3200, reverbAmount: 0.8 });
    });
  },
  mandala(index = 0) {
    if (!ready()) return;
    const note = noteForIndex(index);
    tone({ freq: note, type: 'sine', decay: 1.2, attack: 0.008, peak: 0.09, cutoff: 5000, reverbAmount: 0.9 });
    tone({ freq: note * 2.76, type: 'sine', decay: 0.5, attack: 0.008, peak: 0.018, cutoff: 6000, reverbAmount: 0.9 });
  },
};

function loadTrack() {
  if (trackPromise) return trackPromise;
  trackPromise = (async () => {
    const urls = (document.getElementById('breathe')?.dataset.track || '').split(',').map((item) => item.trim()).filter(Boolean);
    const probe = document.createElement('audio');
    for (const url of urls) {
      const type = url.endsWith('.ogg') ? 'audio/ogg; codecs=vorbis' : url.endsWith('.mp3') ? 'audio/mpeg' : '';
      if (type && !probe.canPlayType(type)) continue;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) return url;
      } catch {}
    }
    return null;
  })();
  return trackPromise;
}

export function createBreathingSound() {
  let nodes = null;
  let element = null;
  let chordCycle = 0;
  let stopped = false;

  function start() {
    stopped = false;
    const ctx = ready();
    if (!ctx) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.4;
    const level = ctx.createGain();
    level.gain.value = 0.0001;
    const tremolo = ctx.createOscillator();
    const tremoloDepth = ctx.createGain();
    tremolo.frequency.value = 0.18;
    tremoloDepth.gain.value = 0.012;
    tremolo.connect(tremoloDepth).connect(level.gain);
    tremolo.start();
    const voices = [];
    PAD_CHORDS[0].forEach((freq, index) => {
      ['sine', 'triangle'].forEach((type, layer) => {
        const oscillator = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        oscillator.detune.value = (layer ? 1 : -1) * (3 + index);
        voiceGain.gain.value = layer ? 0.045 : 0.1;
        oscillator.connect(voiceGain).connect(filter);
        oscillator.start();
        voices.push({ oscillator, index });
      });
    });
    filter.connect(level);
    send(level, 0.9);
    nodes = { filter, level, tremolo, voices };
    loadTrack().then(async (url) => {
      if (!url || stopped || !nodes) return;
      const track = new Audio(url);
      track.loop = true;
      track.volume = 0;
      try {
        await track.play();
      } catch {
        return;
      }
      if (stopped) {
        track.pause();
        return;
      }
      element = track;
      nodes.level.gain.cancelScheduledValues(audio.currentTime);
      nodes.level.gain.setTargetAtTime(0.0001, audio.currentTime, 0.6);
      fadeElement(track, 0.5, 2000);
    });
  }

  function fadeElement(target, to, ms) {
    const from = target.volume;
    const begin = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - begin) / ms);
      try { target.volume = Math.max(0, Math.min(1, from + (to - from) * progress)); } catch {}
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function phase(key, seconds, cycle) {
    if (element) return;
    if (!nodes || !audio) return;
    const now = audio.currentTime;
    if (cycle !== chordCycle) {
      chordCycle = cycle;
      const chord = padChord(cycle);
      nodes.voices.forEach(({ oscillator, index }) => oscillator.frequency.setTargetAtTime(chord[index], now, 0.9));
    }
    nodes.level.gain.cancelScheduledValues(now);
    nodes.filter.frequency.cancelScheduledValues(now);
    nodes.level.gain.setValueAtTime(Math.max(0.0001, nodes.level.gain.value), now);
    nodes.filter.frequency.setValueAtTime(nodes.filter.frequency.value, now);
    if (key === 'in' || key === 'in2') {
      nodes.level.gain.exponentialRampToValueAtTime(0.5, now + seconds * 0.95);
      nodes.filter.frequency.exponentialRampToValueAtTime(1500, now + seconds);
    } else if (key === 'out') {
      nodes.level.gain.exponentialRampToValueAtTime(0.1, now + seconds * 0.95);
      nodes.filter.frequency.exponentialRampToValueAtTime(380, now + seconds);
    }
  }

  function stop() {
    stopped = true;
    if (element) {
      const old = element;
      element = null;
      fadeElement(old, 0, 800);
      window.setTimeout(() => old.pause(), 900);
    }
    if (nodes && audio) {
      const { level, voices, tremolo } = nodes;
      const now = audio.currentTime;
      level.gain.cancelScheduledValues(now);
      level.gain.setTargetAtTime(0.0001, now, 0.25);
      window.setTimeout(() => {
        voices.forEach(({ oscillator }) => { try { oscillator.stop(); } catch {} });
        try { tremolo.stop(); } catch {}
      }, 1400);
      nodes = null;
    }
    chordCycle = 0;
  }

  return { start, phase, stop };
}
