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
import { getMoodSuggestion, initBreathing } from './breathing.mjs';
import { initGames } from './games.mjs';
import { initAmbient } from './ambient.mjs';
import { initCampfire } from './campfire.mjs';
import { createSettings, getMotion } from './settings.mjs';
import { configureHaptics, initWelcomeHaptic, play as haptic } from './haptics.mjs';
import { setSoundEnabled } from './sound.mjs';
import { createSavedStore, initSavedDrawer } from './saved.mjs';

const byId = (id) => document.getElementById(id);
const feelingSelect = byId('feeling-select');
const feelingOptions = [...document.querySelectorAll('.feeling-option')];
const dialogue = byId('dialogue-content');
const copyButton = document.querySelector('.action-buttons .copy-btn');
const saveFeelingButton = byId('save-feeling');
const copyStatus = byId('copy-status');
const settings = createSettings();
const saved = createSavedStore();

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

configureHaptics(() => settings.get().haptics && getMotion() !== 'static');
setSoundEnabled(settings.get().sound);
initWelcomeHaptic();

let currentFeeling = '';

function syncFeelingOptions(value) {
  feelingOptions.forEach((option, index) => {
    const selected = option.dataset.feeling === value;
    option.setAttribute('aria-checked', String(selected));
    option.tabIndex = selected || (!value && index === 0) ? 0 : -1;
  });
}

function renderDialogue(feeling) {
  const response = getDialogue(feeling);
  currentFeeling = response ? feeling : '';
  syncFeelingOptions(currentFeeling);
  if (!response) {
    dialogue.hidden = true;
    copyButton.disabled = true;
    saveFeelingButton.disabled = true;
    return;
  }
  dialogue.querySelector('.dialogue-trigger').textContent = response.trigger;
  dialogue.querySelector('.old-text').textContent = response.old;
  dialogue.querySelector('.wise-text').textContent = response.wise;
  dialogue.querySelector('.action-text').textContent = `One small thing: ${response.action}`;
  dialogue.hidden = false;
  copyButton.disabled = false;
  saveFeelingButton.disabled = false;
  copyStatus.textContent = '';
}

feelingSelect.addEventListener('change', () => renderDialogue(feelingSelect.value));

feelingOptions.forEach((option, index) => {
  option.addEventListener('click', () => {
    haptic('tap');
    feelingSelect.value = option.dataset.feeling;
    feelingSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });
  option.addEventListener('keydown', (event) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let target = null;
    if (event.key in keys) target = feelingOptions[(index + keys[event.key] + feelingOptions.length) % feelingOptions.length];
    if (event.key === 'Home') target = feelingOptions[0];
    if (event.key === 'End') target = feelingOptions[feelingOptions.length - 1];
    if (!target) return;
    event.preventDefault();
    target.focus();
    target.click();
  });
});
syncFeelingOptions('');

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

saveFeelingButton.addEventListener('click', () => {
  const response = getDialogue(currentFeeling);
  if (!response) return;
  saved.addFeeling({ key: currentFeeling, trigger: response.trigger, wise: response.wise, action: response.action });
  haptic('tap');
  copyStatus.textContent = saved.isPersistent() ? 'Feeling saved.' : 'Feeling saved for this visit only; browser storage is unavailable.';
  saveFeelingButton.textContent = 'Saved ✓';
  window.setTimeout(() => { saveFeelingButton.textContent = 'Save feeling'; }, 1800);
});

const themeButton = byId('theme-toggle');
const themeStored = readStorage(THEME_KEY);
let userTheme = themeStored.value === 'dark'
  ? 'dark'
  : themeStored.value === 'light'
    ? 'light'
    : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function applyTheme() {
  const campfire = settings.get().campfire;
  const isDark = campfire || userTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  themeButton.setAttribute('aria-pressed', String(isDark));
  themeButton.setAttribute('aria-disabled', String(campfire));
  themeButton.setAttribute('aria-label', campfire ? 'Campfire mode keeps the dark theme on' : isDark ? 'Switch to light mode' : 'Switch to dark mode');
  themeButton.querySelector('span').textContent = isDark ? '☀' : '☾';
}

applyTheme();
themeButton.addEventListener('click', () => {
  if (settings.get().campfire) return;
  userTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  writeStorage(THEME_KEY, userTheme);
  applyTheme();
});

const menuToggle = byId('menu-toggle');
const menuPanel = byId('settings-menu');
const switches = {
  reduceMotion: byId('set-reduce'),
  staticMode: byId('set-static'),
  campfire: byId('set-campfire'),
  eyeCare: byId('set-eye'),
  sound: byId('set-sound'),
  haptics: byId('set-haptics'),
};
const warmthSlider = byId('set-warmth');
const warmthOutput = byId('warmth-value');

function syncSettings() {
  const current = settings.get();
  Object.entries(switches).forEach(([key, input]) => { input.checked = current[key]; });
  warmthSlider.value = String(current.warmth);
  warmthSlider.disabled = !current.eyeCare;
  warmthOutput.textContent = `${current.warmth}%`;
  setSoundEnabled(current.sound);
  applyTheme();
}

Object.entries(switches).forEach(([key, input]) => {
  input.addEventListener('change', () => settings.set({ [key]: input.checked }));
});
warmthSlider.addEventListener('input', () => settings.set({ warmth: Number(warmthSlider.value) }));
settings.subscribe(syncSettings);
syncSettings();

function closeMenu(restoreFocus = false) {
  menuPanel.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.querySelector('.visually-hidden').textContent = 'Open comfort settings';
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const isOpen = menuPanel.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.querySelector('.visually-hidden').textContent = isOpen ? 'Close comfort settings' : 'Open comfort settings';
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuPanel.classList.contains('open')) closeMenu(true);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.settings-menu, .menu-toggle')) closeMenu();
});
document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => closeMenu()));

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

const breathing = initBreathing({ settings });
initGames({ saved });
initAmbient();
initCampfire();
initSavedDrawer({ store: saved, getNotes: () => history, onOpen: () => closeMenu() });

const moodButtons = [...document.querySelectorAll('[data-mood]')];
const moodBox = byId('mood-suggestion');
const moodText = byId('mood-text');
const moodGo = byId('mood-go');
let moodPattern = null;
moodButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const suggestion = getMoodSuggestion(button.dataset.mood);
    if (!suggestion) return;
    moodButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    moodText.textContent = suggestion.text;
    moodGo.textContent = suggestion.cta;
    moodGo.setAttribute('href', suggestion.href);
    moodPattern = suggestion.pattern || null;
    moodBox.hidden = false;
  });
});
moodGo.addEventListener('click', () => {
  if (moodPattern) breathing.select(moodPattern);
});
