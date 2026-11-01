// Gemeinsame Helfer für Seite und Dashboard-Widget.
//
// Zwei Quellen:
//  1. Gemeinsame Countdowns: Termine aus dem Yuvomi-Kalender, die "#countdown"
//     im Titel oder in der Beschreibung tragen.
//  2. Eigene Countdowns: im Browser gespeichert (localStorage), pro Person und Gerät.
//
// Kein innerHTML, keine Inline-Styles: alles per DOM-API, Klassen und textContent.

export const TAG = '#countdown';

const TEXTS = {
  de: {
    title: 'Countdowns',
    shared: 'Für alle (aus dem Kalender)',
    mine: 'Meine Countdowns',
    sharedHint: `Gemeinsame Countdowns entstehen im Kalender: „${TAG}“ in den Titel oder die Beschreibung eines Termins schreiben, optional mit Emoji, z. B. „${TAG}:🏖️“.`,
    mineHint: 'Eigene Countdowns sind nur in diesem Browser auf diesem Gerät gespeichert.',
    add: 'Eigener Countdown',
    name: 'Name',
    namePh: 'z. B. Geburtstag, Konzert, Ferienende',
    date: 'Datum',
    icon: 'Symbol',
    yearly: 'Jährlich wiederholen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    edit: 'Bearbeiten',
    remove: 'Löschen',
    confirmRemove: 'Diesen Countdown löschen?',
    today: 'Heute!',
    tomorrow: 'Morgen',
    inDays: 'Tage',
    oneDay: 'Tag',
    ago: 'vorbei seit',
    weeks: 'Wochen',
    week: 'Woche',
    running: 'läuft gerade',
    left: 'noch',
    sharedEmpty: 'Im Kalender ist noch kein Termin mit Countdown markiert.',
    mineEmpty: 'Noch keine eigenen Countdowns.',
    calError: 'Der Kalender konnte nicht geladen werden',
    storageError: 'Dieser Browser erlaubt keine lokale Speicherung.',
    none: 'Keine anstehenden Countdowns.',
    invalid: 'Bitte Name und Datum angeben.',
  },
  en: {
    title: 'Countdowns',
    shared: 'For everyone (from the calendar)',
    mine: 'My countdowns',
    sharedHint: `Shared countdowns come from the calendar: add "${TAG}" to an event's title or description, optionally with an emoji, e.g. "${TAG}:🏖️".`,
    mineHint: 'Your own countdowns are stored only in this browser on this device.',
    add: 'Own countdown',
    name: 'Name',
    namePh: 'e.g. birthday, concert, end of school holidays',
    date: 'Date',
    icon: 'Icon',
    yearly: 'Repeat every year',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Delete',
    confirmRemove: 'Delete this countdown?',
    today: 'Today!',
    tomorrow: 'Tomorrow',
    inDays: 'days',
    oneDay: 'day',
    ago: 'passed since',
    weeks: 'weeks',
    week: 'week',
    running: 'happening now',
    left: 'left',
    sharedEmpty: 'No calendar event is marked as a countdown yet.',
    mineEmpty: 'No own countdowns yet.',
    calError: 'The calendar could not be loaded',
    storageError: 'This browser does not allow local storage.',
    none: 'No upcoming countdowns.',
    invalid: 'Please enter a name and a date.',
  },
};

export function tr(key) {
  const lang = (document.documentElement.lang || navigator.language || 'en')
    .slice(0, 2)
    .toLowerCase();
  return (TEXTS[lang] || TEXTS.en)[key] ?? TEXTS.en[key] ?? key;
}

export function locale() {
  return document.documentElement.lang || navigator.language || 'en';
}

// ---------- Stylesheet auch im Dashboard laden ----------
// Auf der Modulseite lädt Yuvomi style.css selbst, im Dashboard-Widget nicht.
// Ein <link> auf dieselbe Herkunft ist mit einer strengen CSP vereinbar.

export function ensureStyles() {
  try {
    const href = new URL('./style.css', import.meta.url).href;
    const exists = [...document.querySelectorAll('link[rel="stylesheet"]')].some(
      (l) => l.href === href,
    );
    if (exists) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  } catch {
    /* ohne Stylesheet bleibt das Modul benutzbar, nur unschön */
  }
}

// ---------- Icons (eigene SVGs, kein Abhängigkeit von Yuvomis Icon-Satz) ----------

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  calendar: [
    ['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    ['path', { d: 'M16 2v4M8 2v4M3 10h18' }],
  ],
  hourglass: [
    ['path', { d: 'M5 22h14M5 2h14' }],
    ['path', { d: 'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22' }],
    ['path', { d: 'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2' }],
  ],
};

export function icon(name, size = 16) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'cd-icon');
  for (const [tag, attrs] of ICONS[name] || []) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    svg.append(node);
  }
  return svg;
}

// ---------- Datum ----------

const MS_DAY = 86400000;

function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

// Kalenderwert -> lokaler Tag (00:00).
// "YYYY-MM-DD" und "YYYY-MM-DDTHH:MM:SS" ohne Offset sind Haushalts-Ortszeit,
// Werte mit "Z" oder "+01:00" sind ein Zeitpunkt und werden in Ortszeit umgerechnet.
export function toDay(value) {
  if (typeof value !== 'string' || value.length < 10) return null;
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function diffDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / MS_DAY);
}

// Liefert { target, days, years, running, daysLeft } für einen normalisierten Eintrag.
export function resolve(item) {
  const today = startOfToday();
  let target = item.start;
  let years = null;

  if (item.yearly) {
    const base = item.start;
    let next = new Date(today.getFullYear(), base.getMonth(), base.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate());
    years = next.getFullYear() - base.getFullYear();
    target = next;
  }

  const days = diffDays(target, today);
  let running = false;
  let daysLeft = null;
  if (days < 0 && item.end && item.end >= today) {
    running = true;
    daysLeft = diffDays(item.end, today);
  }
  return { target, days, years, running, daysLeft };
}

export function sortItems(items) {
  const rank = (i) => (i.info.running ? 0 : i.info.days >= 0 ? 1 : 2);
  return items
    .map((item) => ({ item, info: resolve(item) }))
    .sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r) return r;
      if (a.info.days < 0 && !a.info.running) return b.info.days - a.info.days;
      return a.info.days - b.info.days;
    });
}

export function formatDate(date, short = false) {
  return new Intl.DateTimeFormat(locale(), {
    weekday: 'short',
    day: short ? 'numeric' : '2-digit',
    month: short ? 'short' : 'long',
    year: 'numeric',
  }).format(date);
}

// "≈ 7 Wochen, 3 Tage" für weiter entfernte Termine, sonst leer.
export function weeksLabel(info) {
  const abs = Math.abs(info.days);
  if (info.running || abs < 14) return '';
  const w = Math.floor(abs / 7);
  const r = abs % 7;
  const rest = r ? `, ${r} ${r === 1 ? tr('oneDay') : tr('inDays')}` : '';
  return `≈ ${w} ${w === 1 ? tr('week') : tr('weeks')}${rest}`;
}

// ---------- Zahlen-Kachel ----------

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

export function countBlock(info) {
  const box = document.createElement('div');
  box.className = 'cd-count';

  if (info.running) {
    box.classList.add('cd-count--live');
    box.append(span('cd-count__label', tr('running')));
    if (info.daysLeft > 0) {
      box.append(
        span('cd-count__big', String(info.daysLeft)),
        span('cd-count__unit', `${info.daysLeft === 1 ? tr('oneDay') : tr('inDays')} ${tr('left')}`),
      );
    }
    return box;
  }

  const { days } = info;
  if (days === 0) {
    box.classList.add('cd-count--today');
    box.append(span('cd-count__big cd-count__big--word', tr('today')));
    return box;
  }
  if (days === 1) {
    box.classList.add('cd-count--soon');
    box.append(span('cd-count__big cd-count__big--word', tr('tomorrow')));
    return box;
  }

  const abs = Math.abs(days);
  if (days < 0) {
    box.classList.add('cd-count--past');
    box.append(span('cd-count__label', tr('ago')));
  } else if (days <= 7) {
    box.classList.add('cd-count--soon');
  }
  box.append(
    span('cd-count__big', String(abs)),
    span('cd-count__unit', abs === 1 ? tr('oneDay') : tr('inDays')),
  );
  return box;
}

// ---------- Quelle 1: Kalender ----------

// Markierung: "#countdown" oder "#countdown:🏖️" (Doppelpunkt optional). Das Emoji
// erscheint nur im Countdown, nicht im Kalender, wenn es in der Beschreibung steht.
const EMOJI = '\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*';
const TAG_RE = new RegExp(`#countdown(?::?(${EMOJI})|:)?`, 'iu');
const TAG_RE_ALL = new RegExp(TAG_RE.source, 'giu');

function stripTag(text) {
  return text.replace(TAG_RE_ALL, '').replace(/\s{2,}/g, ' ').trim();
}

function hasTag(text) {
  return typeof text === 'string' && /#countdown(?![\p{L}\p{N}_])/iu.test(text);
}

// Erstes Emoji hinter einer Markierung, in Titel, Beschreibung oder Ort.
function tagEmoji(ev) {
  for (const text of [ev.title, ev.description, ev.location]) {
    if (typeof text !== 'string') continue;
    const m = text.match(TAG_RE);
    if (m && m[1]) return m[1];
  }
  return '';
}

async function fetchShared(signal) {
  const res = await fetch(`/api/v1/calendar/search?q=${encodeURIComponent(TAG.slice(1))}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const events = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];

  const seen = new Set();
  const out = [];
  for (const ev of events) {
    // Die Suche findet auch Termine, in denen nur das Wort "Countdown" vorkommt.
    // Nur echte Markierungen übernehmen.
    if (!hasTag(ev.title) && !hasTag(ev.description) && !hasTag(ev.location)) continue;
    const start = toDay(ev.start_datetime ?? ev.start ?? ev.start_at);
    if (!start) continue;
    const key = ev.series_id ?? ev.id;
    if (seen.has(key)) continue; // pro Serie nur das nächste Vorkommen
    seen.add(key);
    out.push({
      id: `cal-${ev.id}`,
      source: 'calendar',
      title: stripTag(ev.title || '') || '—',
      // Das Symbol-Feld von Yuvomi-Terminen ist ein Icon-Name, kein Emoji: bewusst nicht verwenden.
      // Das Emoji kommt stattdessen aus der Markierung ("#countdown:🏖️").
      icon: tagEmoji(ev),
      start,
      end: toDay(ev.end_datetime ?? ev.end ?? ev.end_at),
      yearly: false,
    });
  }
  return out;
}

// Bei einem Fehler einmal nach kurzer Pause erneut versuchen (z. B. direkt nach dem Seitenaufbau).
export async function loadShared(signal) {
  try {
    return await fetchShared(signal);
  } catch (err) {
    if (signal?.aborted || err?.name === 'AbortError') throw err;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
    if (signal?.aborted) throw err;
    return fetchShared(signal);
  }
}

// ---------- Quelle 2: eigener Browser ----------

function storageKey(user) {
  return `yuvomi.ext.countdown.v1.${user?.id ?? 'anon'}`;
}

export const local = {
  read(user) {
    try {
      const raw = window.localStorage.getItem(storageKey(user));
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },
  write(user, list) {
    window.localStorage.setItem(storageKey(user), JSON.stringify(list)); // wirft bei Sperre
  },
  available() {
    try {
      const k = '__cd_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  },
};

export function normalizeLocal(raw) {
  const start = toDay(raw.date);
  if (!start) return null;
  return { ...raw, source: 'local', start, end: null, yearly: Boolean(raw.yearly) };
}

export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
