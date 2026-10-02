import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, PATTERNS, cycleSeconds, getMoodSuggestion, getPattern, getPhaseState } from '../breathing.mjs';
import { pick, trimGardenWord } from '../games.mjs';

test('4-7-8 runs 4 in, 7 hold, 8 out', () => {
  const pattern = getPattern('478');
  assert.equal(cycleSeconds(pattern), 19);
  assert.equal(getPhaseState(pattern, 0).phase.key, 'in');
  assert.equal(getPhaseState(pattern, 3.9).phase.key, 'in');
  assert.equal(getPhaseState(pattern, 4).phase.key, 'hold');
  assert.equal(getPhaseState(pattern, 10.9).phase.key, 'hold');
  assert.equal(getPhaseState(pattern, 11).phase.key, 'out');
  assert.equal(getPhaseState(pattern, 19).phase.key, 'in');
  assert.equal(getPhaseState(pattern, 19).cycle, 2);
});

test('box breathing has four equal phases', () => {
  const pattern = getPattern('box');
  assert.equal(cycleSeconds(pattern), 16);
  assert.deepEqual(pattern.phases.map((phase) => phase.key), ['in', 'hold', 'out', 'rest']);
});

test('the circle grows on inhale, holds, and shrinks on exhale', () => {
  const pattern = getPattern('478');
  const start = getPhaseState(pattern, 0).scale;
  const full = getPhaseState(pattern, 4).scale;
  const held = getPhaseState(pattern, 8).scale;
  const end = getPhaseState(pattern, 18.99).scale;
  assert.ok(start < full);
  assert.equal(full, held);
  assert.ok(end < full);
  assert.ok(Math.abs(end - start) < 0.01);
});

test('every pattern is well formed and covers a full cycle without gaps', () => {
  for (const pattern of PATTERNS) {
    assert.ok(pattern.description.length > 20);
    const length = cycleSeconds(pattern);
    for (let time = 0; time < length * 2; time += 0.25) {
      const state = getPhaseState(pattern, time);
      assert.ok(state.scale >= 0.5 && state.scale <= 1);
      assert.ok(state.remaining >= 0);
    }
  }
});

test('moods suggest a real pattern or the play space', () => {
  for (const mood of MOODS) {
    const suggestion = getMoodSuggestion(mood.id);
    assert.ok(suggestion.text && suggestion.cta);
    if (mood.pattern) {
      assert.ok(getPattern(mood.pattern));
      assert.equal(suggestion.href, '#breathe');
    } else {
      assert.equal(suggestion.href, '#play');
    }
  }
  assert.equal(getMoodSuggestion('nope'), null);
});

test('garden words are trimmed and capped, and pick stays in range', () => {
  assert.equal(trimGardenWord('  warm   tea  '), 'warm tea');
  assert.equal(trimGardenWord('x'.repeat(40)).length, 24);
  assert.equal(trimGardenWord(null), '');
  assert.equal(pick(['a', 'b'], () => 0.999), 'b');
});
