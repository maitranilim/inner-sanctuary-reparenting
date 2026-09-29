import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogueData, formatCheckInDate, getDialogue, normalizeCheckIns, prependCheckIn } from '../app-core.mjs';

test('each supported feeling has a complete response and unknown values are ignored', () => {
  assert.deepEqual(Object.keys(dialogueData), ['unworthy', 'invisible', 'overwhelmed', 'guilty']);
  for (const feeling of Object.keys(dialogueData)) {
    const response = getDialogue(feeling);
    assert.ok(response.trigger && response.old && response.wise && response.action);
  }
  assert.equal(getDialogue('unexpected'), null);
});

test('legacy check-ins stay readable and malformed records are discarded safely', () => {
  assert.deepEqual(normalizeCheckIns([
    { date: 'Sep 28, 2026', note: '  A note  ' },
    null,
    { date: 3, note: '' },
    { date: 'yesterday', note: '<b>text</b>' },
  ]), [
    { date: 'Sep 28, 2026', note: 'A note' },
    { date: 'yesterday', note: '<b>text</b>' },
  ]);
  assert.deepEqual(normalizeCheckIns({ note: 'not a list' }), []);
});

test('new reflections are trimmed, capped, and limited to five records', () => {
  const prior = Array.from({ length: 7 }, (_, index) => ({ date: `day-${index}`, note: `note-${index}` }));
  const next = prependCheckIn(prior, '  today  ', 'now');
  assert.equal(next.length, 5);
  assert.deepEqual(next[0], { date: 'now', note: 'today' });
  assert.deepEqual(next.at(-1), { date: 'day-3', note: 'note-3' });
  assert.equal(prependCheckIn(prior, '   ', 'now').length, 5);
  assert.equal(prependCheckIn([], 'x'.repeat(700), 'now')[0].note.length, 500);
});

test('dates with no usable value get a gentle fallback label', () => {
  assert.equal(formatCheckInDate('not a date'), 'Saved reflection');
  assert.ok(formatCheckInDate('2026-09-30T00:00:00.000Z'));
});

