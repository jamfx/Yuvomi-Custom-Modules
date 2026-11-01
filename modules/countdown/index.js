import {
  tr,
  ensureStyles,
  icon,
  sortItems,
  countBlock,
  formatDate,
  weeksLabel,
  loadShared,
  local,
  normalizeLocal,
  newId,
} from './shared.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(labelText, input) {
  const wrap = el('label', 'cd-field');
  wrap.append(el('span', 'cd-field__label', labelText), input);
  return wrap;
}

function buildForm(initial, onSubmit, onCancel) {
  const form = el('form', 'cd-form');

  const name = el('input', 'cd-input');
  name.type = 'text';
  name.maxLength = 100;
  name.required = true;
  name.placeholder = tr('namePh');
  name.value = initial?.title ?? '';

  const date = el('input', 'cd-input');
  date.type = 'date';
  date.required = true;
  date.value = initial?.date ?? '';

  const emoji = el('input', 'cd-input');
  emoji.type = 'text';
  emoji.maxLength = 8;
  emoji.placeholder = '🎉';
  emoji.value = initial?.icon ?? '';

  const yearly = el('input');
  yearly.type = 'checkbox';
  yearly.checked = Boolean(initial?.yearly);
  const yearlyLabel = el('label', 'cd-check');
  yearlyLabel.append(yearly, el('span', '', tr('yearly')));

  const row = el('div', 'cd-form__row');
  row.append(field(tr('icon'), emoji), field(tr('date'), date));

  const actions = el('div', 'cd-form__actions');
  const save = el('button', 'cd-btn cd-btn--primary', tr('save'));
  save.type = 'submit';
  const cancel = el('button', 'cd-btn', tr('cancel'));
  cancel.type = 'button';
  cancel.addEventListener('click', onCancel);
  actions.append(save, cancel);

  const msg = el('p', 'cd-msg');
  msg.hidden = true;

  form.append(field(tr('name'), name), row, yearlyLabel, msg, actions);

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!name.value.trim() || !date.value) {
      msg.textContent = tr('invalid');
      msg.hidden = false;
      return;
    }
    try {
      onSubmit({
        title: name.value.trim(),
        date: date.value,
        icon: emoji.value.trim(),
        yearly: yearly.checked,
      });
    } catch {
      msg.textContent = tr('storageError');
      msg.hidden = false;
    }
  });

  return form;
}

export async function render(container, context) {
  ensureStyles();
  const signal = context?.signal;
  const user = context?.user;

  const root = el('section', 'cd-root');
  root.append(el('h1', 'cd-title', tr('title')));

  // Bereich: gemeinsam
  const sharedSec = el('section', 'cd-section');
  const sharedHead = el('div', 'cd-head');
  sharedHead.append(el('h2', 'cd-section__title', tr('shared')));
  const sharedList = el('div', 'cd-list');
  sharedSec.append(sharedHead, el('p', 'cd-hint', tr('sharedHint')), sharedList);

  // Bereich: eigene
  const mineSec = el('section', 'cd-section');
  const mineHead = el('div', 'cd-head');
  mineHead.append(el('h2', 'cd-section__title', tr('mine')));
  const addBtn = el('button', 'cd-btn cd-btn--primary', `+ ${tr('add')}`);
  addBtn.type = 'button';
  mineHead.append(addBtn);
  const mineHint = el('p', 'cd-hint', tr('mineHint'));
  const formSlot = el('div', 'cd-formslot');
  const mineList = el('div', 'cd-list');
  mineSec.append(mineHead, mineHint, formSlot, mineList);

  root.append(sharedSec, mineSec);
  container.replaceChildren(root);

  const storageOk = local.available();
  if (!storageOk) {
    addBtn.hidden = true;
    mineHint.textContent = tr('storageError');
  }

  let shared = [];
  let sharedError = null;
  let mineRaw = local.read(user);

  function card({ item, info }, editable) {
    const c = el('article', 'cd-card');
    if (info.days < 0 && !info.running) c.classList.add('cd-card--past');

    const body = el('div', 'cd-card__body');
    const title = el('h3', 'cd-card__title');
    if (item.icon) title.append(el('span', 'cd-emoji', item.icon));
    title.append(document.createTextNode(item.title));
    body.append(title);

    const meta = el('p', 'cd-card__meta');
    if (item.source === 'calendar') meta.append(icon('calendar', 15));
    let dateText = formatDate(info.target);
    if (item.yearly && info.years > 0) dateText += ` · ${info.years}.`;
    meta.append(el('span', '', dateText));
    body.append(meta);

    const weeks = weeksLabel(info);
    if (weeks) body.append(el('p', 'cd-card__weeks', weeks));

    c.append(countBlock(info), body);

    if (editable) {
      const tools = el('div', 'cd-card__tools');
      const edit = el('button', 'cd-btn cd-btn--small', tr('edit'));
      edit.type = 'button';
      edit.addEventListener('click', () => openForm(item));
      const del = el('button', 'cd-btn cd-btn--small cd-btn--danger', tr('remove'));
      del.type = 'button';
      del.addEventListener('click', () => {
        if (!window.confirm(tr('confirmRemove'))) return;
        mineRaw = mineRaw.filter((r) => r.id !== item.id);
        try {
          local.write(user, mineRaw);
        } catch {
          /* bleibt bis zum Neuladen entfernt */
        }
        drawMine();
      });
      tools.append(edit, del);
      c.append(tools);
    }
    return c;
  }

  function drawShared() {
    if (sharedError) {
      sharedList.replaceChildren(el('p', 'cd-msg', `${tr('calError')} (${sharedError}).`));
      return;
    }
    // Vergangene gemeinsame Termine nicht anzeigen, laufende schon.
    const visible = sortItems(shared).filter(({ info }) => info.days >= 0 || info.running);
    sharedList.replaceChildren(
      ...(visible.length ? visible.map((x) => card(x, false)) : [el('p', 'cd-empty', tr('sharedEmpty'))]),
    );
  }

  function drawMine() {
    const items = mineRaw.map(normalizeLocal).filter(Boolean);
    mineList.replaceChildren(
      ...(items.length ? sortItems(items).map((x) => card(x, true)) : [el('p', 'cd-empty', tr('mineEmpty'))]),
    );
  }

  function closeForm() {
    formSlot.replaceChildren();
    addBtn.hidden = !storageOk;
  }

  function openForm(existing) {
    addBtn.hidden = true;
    const form = buildForm(
      existing,
      (data) => {
        const next = existing
          ? mineRaw.map((r) => (r.id === existing.id ? { ...r, ...data } : r))
          : [...mineRaw, { id: newId(), ...data }];
        local.write(user, next); // wirft, wenn Speichern nicht möglich ist
        mineRaw = next;
        closeForm();
        drawMine();
      },
      closeForm,
    );
    formSlot.replaceChildren(form);
    form.querySelector('input')?.focus();
  }

  addBtn.addEventListener('click', () => openForm(null));

  drawMine();
  sharedList.replaceChildren(el('p', 'cd-empty', '…'));

  // Anzeige stündlich auffrischen (Tageswechsel), ohne neu zu laden.
  const tick = setInterval(() => {
    if (signal?.aborted) return;
    drawShared();
    drawMine();
  }, 60 * 60 * 1000);
  signal?.addEventListener('abort', () => clearInterval(tick));

  try {
    shared = await loadShared(signal);
  } catch (err) {
    if (signal?.aborted) return;
    sharedError = err?.message || 'unbekannt';
  }
  if (signal?.aborted) return;
  drawShared();
}
