import {
  HISTORY_KEY,
  MAX_CHECK_IN_LENGTH,
  MAX_HISTORY_ITEMS,
  THEME_KEY,
  formatCheckInDate,
  getDialogue,
  normalizeCheckIns,
  prependCheckIn,
} from './app-core.mjs';

const byId = (id) => document.getElementById(id);
const feelingSelect = byId('feeling-select');
const dialogue = byId('dialogue-content');
const copyButton = document.querySelector('.copy-btn');
const copyStatus = byId('copy-status');

function readStorage(key) {
  try {
    return { available: true, value: localStorage.getItem(key) };
  } catch {
    return { available: false, value: null };
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function renderDialogue(feeling) {
  const response = getDialogue(feeling);
  if (!response) {
    dialogue.hidden = true;
    copyButton.disabled = true;
    return;
  }
  dialogue.querySelector('.dialogue-trigger').textContent = response.trigger;
  dialogue.querySelector('.old-text').textContent = response.old;
  dialogue.querySelector('.wise-text').textContent = response.wise;
  dialogue.querySelector('.action-text').textContent = `One small thing: ${response.action}`;
  dialogue.hidden = false;
  copyButton.disabled = false;
  copyStatus.textContent = '';
}

feelingSelect.addEventListener('change', () => renderDialogue(feelingSelect.value));

copyButton.addEventListener('click', async () => {
  const response = `${dialogue.querySelector('.wise-text').textContent}\n\n${dialogue.querySelector('.action-text').textContent}`;
  if (!navigator.clipboard?.writeText) {
    copyStatus.textContent = 'Copy is not available here. You can select the response text to copy it.';
    return;
  }
  try {
    await navigator.clipboard.writeText(response);
    copyStatus.textContent = 'Response copied.';
    copyButton.textContent = 'Copied';
    window.setTimeout(() => { copyButton.textContent = 'Copy response'; }, 1800);
  } catch {
    copyStatus.textContent = 'The browser could not copy this response. You can select the text and copy it manually.';
  }
});

const themeButton = byId('theme-toggle');
const themeStored = readStorage(THEME_KEY);
const initialTheme = themeStored.value === 'dark'
  ? 'dark'
  : themeStored.value === 'light'
    ? 'light'
    : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function setTheme(theme, persist = true) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  themeButton.querySelector('span').textContent = isDark ? '☀' : '☾';
  if (persist) writeStorage(THEME_KEY, theme);
}

setTheme(initialTheme, false);
themeButton.addEventListener('click', () => {
  setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
});

const navToggle = byId('nav-toggle');
const navLinks = byId('site-navigation');
function closeNavigation(restoreFocus = false) {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.querySelector('.visually-hidden').textContent = 'Open navigation';
  if (restoreFocus) navToggle.focus();
}
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.querySelector('.visually-hidden').textContent = isOpen ? 'Close navigation' : 'Open navigation';
});
navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeNavigation()));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navLinks.classList.contains('open')) closeNavigation(true);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-nav')) closeNavigation();
});

const noteInput = byId('check-in-note');
const characterCount = byId('character-count');
const saveStatus = byId('save-status');
const historyList = byId('check-in-history');
const historyEmpty = byId('history-empty');
const clearHistoryButton = byId('clear-check-ins');
const historyStored = readStorage(HISTORY_KEY);
let history = [];
let persistenceAvailable = historyStored.available;
try {
  history = normalizeCheckIns(JSON.parse(historyStored.value || '[]'));
} catch {
  history = [];
  try { localStorage.removeItem(HISTORY_KEY); } catch { persistenceAvailable = false; }
}

function persistHistory() {
  if (!writeStorage(HISTORY_KEY, JSON.stringify(history))) {
    persistenceAvailable = false;
    return false;
  }
  persistenceAvailable = true;
  return true;
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = history.length > 0;
  clearHistoryButton.hidden = history.length === 0;
  history.forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = 'saved-note';
    const date = document.createElement('time');
    date.textContent = formatCheckInDate(entry.date);
    if (!Number.isNaN(new Date(entry.date).getTime())) date.dateTime = new Date(entry.date).toISOString();
    const note = document.createElement('p');
    note.textContent = entry.note;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove this note';
    remove.setAttribute('aria-label', `Remove reflection from ${date.textContent}`);
    remove.addEventListener('click', () => {
      history.splice(index, 1);
      persistHistory();
      renderHistory();
      saveStatus.textContent = persistenceAvailable ? 'Note removed from this browser.' : 'Note removed for this visit.';
    });
    item.append(date, note, remove);
    historyList.append(item);
  });
}

noteInput.addEventListener('input', () => {
  characterCount.textContent = `${noteInput.value.length} / ${MAX_CHECK_IN_LENGTH}`;
});

byId('save-check-in').addEventListener('click', () => {
  if (!noteInput.value.trim()) {
    saveStatus.textContent = 'Write a few words first, if you would like to save them.';
    noteInput.focus();
    return;
  }
  history = prependCheckIn(history, noteInput.value, new Date().toISOString());
  const stored = persistHistory();
  noteInput.value = '';
  characterCount.textContent = `0 / ${MAX_CHECK_IN_LENGTH}`;
  renderHistory();
  saveStatus.textContent = stored
    ? `Saved on this device. Up to ${MAX_HISTORY_ITEMS} notes are kept here.`
    : 'Saved for this visit only; browser storage is unavailable.';
});

clearHistoryButton.addEventListener('click', () => {
  if (!window.confirm('Clear all saved reflections from this browser?')) return;
  history = [];
  persistHistory();
  renderHistory();
  saveStatus.textContent = 'Saved reflections cleared.';
});

document.querySelectorAll('[data-need]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-need]').forEach((item) => item.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    byId('selected-need').textContent = `You might be needing: ${button.dataset.need}.`;
  });
});

renderHistory();

const breathingToggle = byId('breathing-toggle');
const breathingCircle = byId('breathing-circle');
const breathingInstruction = byId('breathing-instruction');
let breathingTimer = null;
let breathingInterval = null;
let breathingPhase = 0;

function stopBreathing(message = 'When you’re ready, begin with a slow inhale.') {
  if (breathingTimer !== null) window.clearTimeout(breathingTimer);
  if (breathingInterval !== null) window.clearInterval(breathingInterval);
  breathingTimer = null;
  breathingInterval = null;
  breathingCircle.classList.remove('active');
  breathingCircle.textContent = 'Ready';
  breathingInstruction.textContent = message;
  breathingToggle.textContent = 'Begin a breathing pause';
  breathingToggle.setAttribute('aria-pressed', 'false');
}

function updateBreathingCue() {
  const breathingIn = breathingPhase % 2 === 0;
  breathingCircle.textContent = breathingIn ? 'Breathe in' : 'Breathe out';
  breathingInstruction.textContent = breathingIn ? 'Slowly welcome the breath in.' : 'Let the breath leave without forcing it.';
  breathingPhase += 1;
}

breathingToggle.addEventListener('click', () => {
  if (breathingTimer !== null) {
    stopBreathing();
    return;
  }
  breathingPhase = 0;
  breathingCircle.classList.add('active');
  breathingToggle.textContent = 'Stop breathing pause';
  breathingToggle.setAttribute('aria-pressed', 'true');
  updateBreathingCue();
  breathingInterval = window.setInterval(updateBreathingCue, 4000);
  breathingTimer = window.setTimeout(() => stopBreathing('Pause complete. Take a moment before continuing.'), 60000);
});

window.addEventListener('pagehide', () => stopBreathing('When you’re ready, begin with a slow inhale.'), { once: true });

