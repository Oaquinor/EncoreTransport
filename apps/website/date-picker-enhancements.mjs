const datePickers = new WeakMap();
let datePickerId = 0;

const locale = () => document.documentElement.lang === 'es' ? 'es-DO' : 'en-US';
const copy = (english, spanish) => document.documentElement.lang === 'es' ? spanish : english;
const pad = (value) => String(value).padStart(2, '0');

function parseIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatDate(value) {
  const date = parseIso(value);
  if (!date) return copy('Select a date', 'Selecciona una fecha');
  return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(date);
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function enhanceDateInput(input) {
  if (!input || datePickers.has(input) || input.dataset.nativeOnly === 'true') return;

  const parent = input.parentElement;
  if (!parent) return;
  const shell = document.createElement('span');
  shell.className = 'website-date-picker';
  shell.dataset.datePicker = 'true';
  const popoverId = `website-date-picker-${++datePickerId}`;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'website-date-picker__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', popoverId);
  trigger.setAttribute('aria-label', copy('Choose date', 'Elegir fecha'));
  const value = document.createElement('span');
  value.className = 'website-date-picker__value';
  const icon = document.createElement('span');
  icon.className = 'website-date-picker__icon';
  icon.setAttribute('aria-hidden', 'true');
  trigger.append(value, icon);

  const popover = document.createElement('div');
  popover.id = popoverId;
  popover.className = 'website-date-picker__popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');
  popover.setAttribute('aria-hidden', 'true');
  popover.setAttribute('aria-label', copy('Choose a travel date', 'Elige una fecha de viaje'));
  document.body.append(popover);

  input.classList.add('website-date-picker__native');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.replaceWith(shell);
  shell.append(input, trigger);

  let viewDate = parseIso(input.value) || parseIso(input.min) || new Date();
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  let closeTimer = null;

  const limits = () => ({
    min: parseIso(input.min),
    max: parseIso(input.max),
  });

  const isAllowed = (date) => {
    const { min, max } = limits();
    return (!min || date >= min) && (!max || date <= max);
  };

  const positionPopover = () => {
    if (popover.getAttribute('aria-hidden') !== 'false') return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 10;
    const width = Math.min(320, window.innerWidth - viewportPadding * 2);
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < 340 && availableAbove > availableBelow;
    const left = clamp(rect.left, viewportPadding, window.innerWidth - width - viewportPadding);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - popover.offsetHeight - 8)
      : Math.min(window.innerHeight - popover.offsetHeight - viewportPadding, rect.bottom + 8);
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(viewportPadding, top)}px`;
    popover.dataset.placement = openAbove ? 'top' : 'bottom';
  };

  const sync = () => {
    value.textContent = formatDate(input.value);
    value.classList.toggle('is-placeholder', !parseIso(input.value));
    trigger.disabled = Boolean(input.disabled);
    shell.classList.toggle('is-disabled', Boolean(input.disabled));
    trigger.setAttribute('aria-disabled', String(Boolean(input.disabled)));
    if (parseIso(input.value)) viewDate = new Date(input.value.slice(0, 7) + '-01T00:00:00');
    if (popover.getAttribute('aria-hidden') === 'false') render();
  };

  const choose = (date) => {
    if (!isAllowed(date)) return;
    input.value = toIso(date);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    close(true);
  };

  const render = () => {
    const selected = parseIso(input.value);
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayMonday = (monthStart.getDay() + 6) % 7;
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const previousMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    const weekdays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2024, 0, 1 + index);
      return new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(day).slice(0, 2);
    });
    const dayButtons = [];
    for (let index = 0; index < firstDayMonday; index += 1) dayButtons.push('<span class="website-date-picker__empty" aria-hidden="true"></span>');
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);
      const iso = toIso(date);
      const selectedClass = selected && iso === toIso(selected) ? ' is-selected' : '';
      const disabled = isAllowed(date) ? '' : ' disabled';
      const today = iso === toIso(new Date()) ? ' aria-current="date"' : '';
      dayButtons.push(`<button class="website-date-picker__day${selectedClass}" type="button" data-date="${iso}" aria-label="${new Intl.DateTimeFormat(locale(), { dateStyle: 'full' }).format(date)}" aria-pressed="${selectedClass ? 'true' : 'false'}"${today}${disabled}>${dayNumber}</button>`);
    }
    while (dayButtons.length < 35 || dayButtons.length % 7 !== 0) dayButtons.push('<span class="website-date-picker__empty" aria-hidden="true"></span>');
    popover.innerHTML = `<div class="website-date-picker__header"><button class="website-date-picker__nav" type="button" data-month="previous" aria-label="${copy('Previous month', 'Mes anterior')}">‹</button><strong>${formatMonth(monthStart)}</strong><button class="website-date-picker__nav" type="button" data-month="next" aria-label="${copy('Next month', 'Mes siguiente')}">›</button></div><div class="website-date-picker__weekdays" aria-hidden="true">${weekdays.map((day) => `<span>${day}</span>`).join('')}</div><div class="website-date-picker__grid" role="grid" aria-label="${formatMonth(monthStart)}">${dayButtons.join('')}</div>`;
    popover.querySelector('[data-month="previous"]')?.addEventListener('click', () => { viewDate = previousMonth; render(); positionPopover(); });
    popover.querySelector('[data-month="next"]')?.addEventListener('click', () => { viewDate = nextMonth; render(); positionPopover(); });
    popover.querySelectorAll('[data-date]').forEach((button) => button.addEventListener('click', () => choose(parseIso(button.dataset.date))));
  };

  const close = (restoreFocus = false) => {
    if (closeTimer) window.clearTimeout(closeTimer);
    if (popover.getAttribute('aria-hidden') !== 'false') return;
    popover.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    shell.classList.remove('is-open');
    closeTimer = window.setTimeout(() => { popover.hidden = true; }, 160);
    if (restoreFocus) trigger.focus();
  };

  const open = () => {
    if (input.disabled) return;
    if (closeTimer) window.clearTimeout(closeTimer);
    viewDate = parseIso(input.value) || parseIso(input.min) || new Date();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    render();
    popover.hidden = false;
    popover.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    shell.classList.add('is-open');
    positionPopover();
    popover.querySelector('.website-date-picker__day.is-selected:not(:disabled), .website-date-picker__day:not(:disabled)')?.focus();
  };

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    shell.classList.contains('is-open') ? close(true) : open();
  });
  trigger.addEventListener('keydown', (event) => {
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      open();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  });
  popover.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  });
  input.addEventListener('input', sync);
  input.addEventListener('change', sync);
  new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['min', 'max', 'disabled', 'aria-label'] });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.website-date-picker') && !event.target.closest('.website-date-picker__popover')) close(false);
  });
  window.addEventListener('resize', positionPopover, { passive: true });
  window.addEventListener('scroll', positionPopover, { passive: true, capture: true });
  datePickers.set(input, { close, sync });
  sync();
}

document.querySelectorAll('input[type="date"]').forEach(enhanceDateInput);
const dateObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches?.('input[type="date"]')) enhanceDateInput(node);
      node.querySelectorAll?.('input[type="date"]').forEach(enhanceDateInput);
    }
  }
});
dateObserver.observe(document.body, { childList: true, subtree: true });
