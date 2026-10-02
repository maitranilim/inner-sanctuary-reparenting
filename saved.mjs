import { SAVED_KEY, addFeeling, addPlant, clearSaved, formatCheckInDate, normalizeSaved, removeSaved } from './app-core.mjs';

export function createSavedStore() {
  const listeners = new Set();
  let data = normalizeSaved(null);
  let persistent = true;
  try {
    data = normalizeSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || 'null'));
  } catch {
    data = normalizeSaved(null);
  }

  function commit(next) {
    data = next;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(data));
      persistent = true;
    } catch {
      persistent = false;
    }
    listeners.forEach((listener) => listener(data));
  }

  return {
    get: () => data,
    isPersistent: () => persistent,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addFeeling(entry) {
      commit(addFeeling(data, entry, new Date().toISOString()));
    },
    addPlant(plant) {
      const before = data.plants;
      commit(addPlant(data, plant, new Date().toISOString()));
      return data.plants.find((item) => !before.some((old) => old.id === item.id));
    },
    remove(kind, id) {
      commit(removeSaved(data, kind, id));
    },
    clear(kind) {
      commit(clearSaved(data, kind));
    },
  };
}

function emptyItem(text) {
  const item = document.createElement('li');
  item.className = 'saved-empty';
  item.textContent = text;
  return item;
}

function removeButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button';
  button.textContent = 'Remove';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

export function initSavedDrawer({ store, getNotes, onOpen }) {
  const byId = (id) => document.getElementById(id);
  const drawer = byId('saved-drawer');
  const backdrop = byId('saved-backdrop');
  const openers = [...document.querySelectorAll('[data-open-saved]')];
  const feelingList = byId('saved-feelings');
  const plantSummary = byId('saved-plants-summary');
  const plantClear = byId('saved-plants-clear');
  const feelingSummary = byId('saved-feelings-summary');
  const noteList = byId('saved-notes');
  const count = byId('saved-count');
  const status = byId('saved-status');
  let opener = null;
  let closeTimer = null;

  function render() {
    const data = store.get();
    feelingList.replaceChildren();
    noteList.replaceChildren();
    if (!data.feelings.length) feelingList.append(emptyItem('Feelings you save from the practice will appear here.'));
    data.feelings.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'saved-card';
      const meta = document.createElement('time');
      meta.textContent = formatCheckInDate(entry.date);
      const trigger = document.createElement('p');
      trigger.className = 'saved-trigger';
      trigger.textContent = entry.trigger;
      const wise = document.createElement('p');
      wise.className = 'saved-wise';
      wise.textContent = entry.wise;
      const action = document.createElement('p');
      action.className = 'saved-action';
      action.textContent = entry.action;
      item.append(meta, trigger, wise, action, removeButton('Remove saved feeling', () => store.remove('feeling', entry.id)));
      feelingList.append(item);
    });
    plantSummary.textContent = `Planted ${data.plants.length} ${data.plants.length === 1 ? 'flower' : 'flowers'}`;
    plantClear.hidden = data.plants.length === 0;
    feelingSummary.textContent = `Saved feelings (${data.feelings.length})`;
    const notes = getNotes();
    if (!notes.length) noteList.append(emptyItem('Notes you save in the check-in will appear here.'));
    notes.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'saved-card';
      const meta = document.createElement('time');
      meta.textContent = formatCheckInDate(entry.date);
      const body = document.createElement('p');
      body.className = 'saved-wise';
      body.textContent = entry.note;
      item.append(meta, body);
      noteList.append(item);
    });
    const total = data.feelings.length + data.plants.length;
    count.textContent = String(total);
    count.hidden = total === 0;
    status.textContent = store.isPersistent() ? '' : 'Saved for this visit only; browser storage is unavailable.';
  }

  function focusables() {
    return [...drawer.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled && element.getClientRects().length);
  }

  function open(trigger) {
    window.clearTimeout(closeTimer);
    opener = trigger || document.activeElement;
    render();
    onOpen?.();
    drawer.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('drawer-open');
    window.requestAnimationFrame(() => {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      byId('saved-close').focus();
    });
    openers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
  }

  function close(restore = true) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('drawer-open');
    openers.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    closeTimer = window.setTimeout(() => {
      drawer.hidden = true;
      backdrop.hidden = true;
    }, 380);
    if (restore) opener?.focus?.();
  }

  openers.forEach((button) => button.addEventListener('click', () => (drawer.hidden ? open(button) : close())));
  byId('saved-close').addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());
  plantClear.addEventListener('click', () => store.clear('plants'));
  byId('saved-clear').addEventListener('click', () => {
    if (!window.confirm('Clear all saved feelings and garden plants from this browser?')) return;
    store.clear('all');
  });
  drawer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) close();
  });
  store.subscribe(() => {
    if (!drawer.hidden) render();
    else {
      const data = store.get();
      const total = data.feelings.length + data.plants.length;
      count.textContent = String(total);
      count.hidden = total === 0;
    }
  });
  render();
  return { open, close, render };
}
