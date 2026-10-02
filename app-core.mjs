export const HISTORY_KEY = 'inner-sanctuary-check-ins';
export const THEME_KEY = 'inner-sanctuary-theme';
export const MAX_CHECK_IN_LENGTH = 500;
export const MAX_HISTORY_ITEMS = 5;

export const dialogueData = Object.freeze({
  unworthy: Object.freeze({
    trigger: 'When criticism or failure brings up the fear that you are not enough',
    old: "This is too much. You can't handle this. You're going to fail.",
    wise: "It makes sense that this feels big right now. We don't have to do it all at once. I am right here with you, one step at a time.",
    action: 'Wrap yourself in a blanket or hug yourself tight.',
  }),
  invisible: Object.freeze({
    trigger: 'When being spoken over leaves you feeling unseen',
    old: "No one sees you. You don't matter. Your voice doesn't count.",
    wise: "Your voice matters, and I hear you. Even if others don't see you right now, I do. Let's speak your truth together.",
    action: 'Write down what you wanted to say. Your words are valid.',
  }),
  overwhelmed: Object.freeze({
    trigger: 'When chaos or a new task feels like too much',
    old: "You're drowning. This is too much. You should give up.",
    wise: "I see that you're scared right now. That's okay. We can break this down into tiny, manageable pieces. You're stronger than you think.",
    action: 'Take five slow breaths. Then name five things you can see.',
  }),
  guilty: Object.freeze({
    trigger: 'When setting a boundary brings up guilt',
    old: "You're selfish. You're hurting others. You don't deserve to rest.",
    wise: 'Setting a boundary can be an act of care. You are allowed to protect your peace and take the time you need.',
    action: 'Place a hand on your heart and say: I deserve to take care of myself.',
  }),
});

export function getDialogue(feeling) {
  return Object.hasOwn(dialogueData, feeling) ? dialogueData[feeling] : null;
}

export function normalizeCheckIns(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && typeof item.note === 'string' && item.note.trim())
    .map((item) => ({
      date: typeof item.date === 'string' ? item.date : '',
      note: item.note.trim().slice(0, MAX_CHECK_IN_LENGTH),
    }))
    .filter((item) => item.note)
    .slice(0, MAX_HISTORY_ITEMS);
}

export function prependCheckIn(history, note, date) {
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_CHECK_IN_LENGTH) : '';
  if (!cleanNote) return normalizeCheckIns(history);
  return [{ date: String(date), note: cleanNote }, ...normalizeCheckIns(history)].slice(0, MAX_HISTORY_ITEMS);
}

export function formatCheckInDate(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Saved reflection';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
}


export const SAVED_KEY = 'inner-sanctuary-saved';
export const MAX_SAVED_FEELINGS = 20;
export const MAX_SAVED_PLANTS = 30;

const text = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
const number = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeSaved(value) {
  const source = value && typeof value === 'object' ? value : {};
  const feelings = (Array.isArray(source.feelings) ? source.feelings : [])
    .filter((item) => item && typeof item === 'object' && text(item.wise, 400))
    .map((item) => ({
      id: text(item.id, 40) || makeId(),
      key: text(item.key, 40),
      trigger: text(item.trigger, 240),
      wise: text(item.wise, 400),
      action: text(item.action, 240),
      date: text(item.date, 40),
    }))
    .slice(0, MAX_SAVED_FEELINGS);
  const plants = (Array.isArray(source.plants) ? source.plants : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: text(item.id, 40) || makeId(),
      word: text(item.word, 24),
      symbol: text(item.symbol, 4) || '✿',
      tone: Math.max(0, Math.floor(number(item.tone, 0))),
      x: Math.min(100, Math.max(0, number(item.x, 50))),
      y: Math.min(100, Math.max(0, number(item.y, 50))),
      date: text(item.date, 40),
    }))
    .slice(-MAX_SAVED_PLANTS);
  return { feelings, plants };
}

export function addFeeling(saved, entry, date) {
  const current = normalizeSaved(saved);
  const next = normalizeSaved({ feelings: [{ ...entry, id: makeId(), date: String(date) }] });
  if (!next.feelings.length) return current;
  const rest = current.feelings.filter((item) => item.key !== next.feelings[0].key || item.wise !== next.feelings[0].wise);
  return { ...current, feelings: [next.feelings[0], ...rest].slice(0, MAX_SAVED_FEELINGS) };
}

export function addPlant(saved, plant, date) {
  const current = normalizeSaved(saved);
  const next = normalizeSaved({ plants: [{ ...plant, id: makeId(), date: String(date) }] });
  return { ...current, plants: [...current.plants, ...next.plants].slice(-MAX_SAVED_PLANTS) };
}

export function removeSaved(saved, kind, id) {
  const current = normalizeSaved(saved);
  if (kind === 'feeling') return { ...current, feelings: current.feelings.filter((item) => item.id !== id) };
  if (kind === 'plant') return { ...current, plants: current.plants.filter((item) => item.id !== id) };
  return current;
}

export function clearSaved(saved, kind) {
  const current = normalizeSaved(saved);
  if (kind === 'feelings') return { ...current, feelings: [] };
  if (kind === 'plants') return { ...current, plants: [] };
  return { feelings: [], plants: [] };
}
