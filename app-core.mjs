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

