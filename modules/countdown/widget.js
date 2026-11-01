import {
  tr,
  ensureStyles,
  icon,
  sortItems,
  countBlock,
  formatDate,
  loadShared,
  local,
  normalizeLocal,
} from './shared.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Zeigt die nächsten Countdowns: gemeinsame aus dem Kalender und eigene aus dem Browser.
export async function renderWidget(container, { options, user } = {}) {
  ensureStyles(); // Im Dashboard lädt Yuvomi style.css nicht von selbst.
  const limit = Math.min(Math.max(Number(options?.limit) || 3, 1), 10);

  const root = el('div', 'cd-widget');
  const head = el('div', 'cd-widget__head');
  const badge = el('span', 'cd-widget__badge');
  badge.append(icon('hourglass', 18));
  head.append(badge, el('h3', 'cd-widget__title', tr('title')));
  const grid = el('div', 'cd-widget__grid');
  root.append(head, grid);
  container.replaceChildren(root);

  let shared = [];
  let error = null;
  try {
    shared = await loadShared();
  } catch (err) {
    error = err?.message || 'unbekannt';
  }
  const mine = local.read(user).map(normalizeLocal).filter(Boolean);

  const upcoming = sortItems([...shared, ...mine])
    .filter(({ info }) => info.days >= 0 || info.running)
    .slice(0, limit);

  if (!upcoming.length) {
    grid.replaceChildren(
      error
        ? el('p', 'cd-msg', `${tr('calError')} (${error}).`)
        : el('p', 'cd-empty', tr('none')),
    );
    return;
  }

  grid.replaceChildren(
    ...upcoming.map(({ item, info }) => {
      const row = el('div', 'cd-widget__item');
      const text = el('div', 'cd-widget__text');
      const name = el('p', 'cd-widget__name');
      if (item.icon) name.append(el('span', 'cd-emoji', item.icon));
      name.append(document.createTextNode(item.title));
      text.append(name, el('p', 'cd-widget__date', formatDate(info.target, true)));
      row.append(countBlock(info), text);
      return row;
    }),
  );
  if (error) root.append(el('p', 'cd-msg', `${tr('calError')} (${error}).`));
}
