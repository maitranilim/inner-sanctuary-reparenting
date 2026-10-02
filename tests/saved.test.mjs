import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SAVED_FEELINGS, MAX_SAVED_PLANTS, addFeeling, addPlant, clearSaved, normalizeSaved, removeSaved } from '../app-core.mjs';
import { DEFAULT_SETTINGS, normalizeSettings, resolveMotion, warmthToOpacity } from '../settings.mjs';
import { PATTERNS, breathPattern, configureHaptics, play, playBreath } from '../haptics.mjs';
import { PAD_CHORDS, PENTATONIC, noteForIndex, padChord } from '../sound.mjs';
import { easeToward } from '../ambient.mjs';

const feeling = { key: 'guilty', trigger: 'When a boundary brings guilt', wise: 'Setting a boundary can be an act of care.', action: 'Place a hand on your heart.' };

test('saved data is normalized, capped, and unsafe records are dropped', () => {
  assert.deepEqual(normalizeSaved(null), { feelings: [], plants: [] });
  assert.deepEqual(normalizeSaved({ feelings: [{ wise: '' }, 'x'], plants: 5 }), { feelings: [], plants: [] });
  let saved = normalizeSaved(null);
  for (let index = 0; index < MAX_SAVED_FEELINGS + 5; index += 1) {
    saved = addFeeling(saved, { ...feeling, wise: `${feeling.wise} ${index}` }, '2026-10-02T00:00:00Z');
  }
  assert.equal(saved.feelings.length, MAX_SAVED_FEELINGS);
  assert.match(saved.feelings[0].wise, /24$/);
  for (let index = 0; index < MAX_SAVED_PLANTS + 4; index += 1) {
    saved = addPlant(saved, { word: `w${index}`, symbol: '✿', tone: 1, x: 500, y: -4 }, '2026-10-02T00:00:00Z');
  }
  assert.equal(saved.plants.length, MAX_SAVED_PLANTS);
  assert.equal(saved.plants.at(-1).word, `w${MAX_SAVED_PLANTS + 3}`);
  assert.equal(saved.plants[0].x, 100);
  assert.equal(saved.plants[0].y, 0);
});

test('saving the same feeling twice keeps one copy, and items can be removed or cleared', () => {
  let saved = addFeeling(null, feeling, '2026-10-02T00:00:00Z');
  saved = addFeeling(saved, feeling, '2026-10-03T00:00:00Z');
  assert.equal(saved.feelings.length, 1);
  saved = addPlant(saved, { word: 'tea' }, '2026-10-02T00:00:00Z');
  const plantId = saved.plants[0].id;
  assert.equal(removeSaved(saved, 'plant', plantId).plants.length, 0);
  assert.equal(removeSaved(saved, 'feeling', saved.feelings[0].id).feelings.length, 0);
  assert.equal(clearSaved(saved, 'plants').feelings.length, 1);
  assert.deepEqual(clearSaved(saved, 'all'), { feelings: [], plants: [] });
});

test('settings are normalized and resolve to the right motion level', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.equal(normalizeSettings({ warmth: 400 }).warmth, 100);
  assert.equal(normalizeSettings({ warmth: 'x' }).warmth, DEFAULT_SETTINGS.warmth);
  assert.equal(normalizeSettings({ campfire: 'yes' }).campfire, false);
  assert.equal(resolveMotion(normalizeSettings({}), false), 'full');
  assert.equal(resolveMotion(normalizeSettings({}), true), 'reduced');
  assert.equal(resolveMotion(normalizeSettings({ reduceMotion: true }), false), 'reduced');
  assert.equal(resolveMotion(normalizeSettings({ staticMode: true, reduceMotion: true }), false), 'static');
  assert.ok(warmthToOpacity(100) > warmthToOpacity(0));
});

test('breath haptics rise on inhale, fall on exhale, and fit the phase length', () => {
  const inhale = breathPattern(4, 'in');
  const exhale = breathPattern(8, 'out');
  const pulses = (pattern) => pattern.filter((_, index) => index % 2 === 0);
  assert.ok(pulses(inhale)[0] < pulses(inhale).at(-1));
  assert.ok(pulses(exhale)[0] > pulses(exhale).at(-1));
  const total = (pattern) => pattern.reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total(inhale) - 4000) < 600);
  assert.ok(Math.abs(total(exhale) - 8000) < 900);
  assert.equal(breathPattern(0.2, 'in').length, 1);
});

test('haptics only vibrate when enabled and supported, and throttle noisy patterns', () => {
  const calls = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
  setNavigator({ vibrate: (pattern) => { calls.push(pattern); return true; } });
  let on = true;
  configureHaptics(() => on);
  assert.equal(play('bloom'), true);
  assert.deepEqual(calls[0], PATTERNS.bloom);
  assert.equal(play('mandala'), true);
  assert.equal(play('mandala'), false);
  assert.equal(play('nope'), false);
  on = false;
  assert.equal(playBreath(4, 'in'), false);
  assert.equal(calls.length, 2);
  on = true;
  setNavigator({});
  assert.equal(play('bloom'), false);
  if (original) Object.defineProperty(globalThis, 'navigator', original);
  else delete globalThis.navigator;
});

test('calming sound tables stay in the warm pentatonic family', () => {
  assert.equal(noteForIndex(0), PENTATONIC[0]);
  assert.equal(noteForIndex(PENTATONIC.length), PENTATONIC[0]);
  assert.equal(noteForIndex(-1), PENTATONIC.at(-1));
  assert.equal(padChord(1), PAD_CHORDS[0]);
  assert.equal(padChord(PAD_CHORDS.length + 1), PAD_CHORDS[0]);
  PAD_CHORDS.forEach((chord) => assert.equal(chord.length, PAD_CHORDS[0].length));
});

test('the orb eases slowly toward the cursor without overshooting', () => {
  let position = 0;
  for (let frame = 0; frame < 6; frame += 1) position = easeToward(position, 100, 1 / 60);
  assert.ok(position > 0 && position < 25);
  let settled = 0;
  for (let frame = 0; frame < 60 * 4; frame += 1) {
    const next = easeToward(settled, 100, 1 / 60);
    assert.ok(next >= settled && next <= 100);
    settled = next;
  }
  assert.ok(settled > 99);
});
