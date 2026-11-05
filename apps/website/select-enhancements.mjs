const enhancedSelects = new WeakMap();
let selectId = 0;

function optionLabel(option) {
  return String(option?.textContent ?? option?.label ?? option?.value ?? '').trim();
}

function visibleOptionLabel(option) {
  const label = optionLabel(option);
  if (/^loading\b/i.test(label)) return 'Loading…';
  if (/^cargando\b/i.test(label)) return 'Cargando…';
  return label;
}

function getLabel(select) {
  if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
  const label = select.closest('label');
  return label?.querySelector('.booking-label')?.textContent?.trim()
    || label?.textContent?.replace(/\s+/g, ' ').trim()
    || 'Select an option';
}

function selectedOption(select) {
  return select.options[select.selectedIndex] ?? select.options[0] ?? null;
}

function selectableOptions(select) {
  return [...select.options].filter((option) => !option.disabled);
}

function closeOtherSelects(current) {
  document.querySelectorAll('.website-select.is-open').forEach((shell) => {
    if (shell !== current) enhancedSelects.get(shell.querySelector('select'))?.close(false);
  });
}

function moveFocus(options, current, direction) {
  if (!options.length) return;
  const index = Math.max(0, options.indexOf(current));
  const next = options[(index + direction + options.length) % options.length];
  next?.focus();
}

function enhanceSelect(select) {
  if (!select || enhancedSelects.has(select) || select.dataset.nativeOnly === 'true') return;

  const shell = document.createElement('span');
  shell.className = 'website-select';
  shell.dataset.selectEnhanced = 'true';
  const menuId = `website-select-menu-${++selectId}`;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'website-select__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', getLabel(select));
  trigger.setAttribute('aria-controls', menuId);
  const value = document.createElement('span');
  value.className = 'website-select__value';
  const chevron = document.createElement('span');
  chevron.className = 'website-select__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  trigger.append(value, chevron);

  const menu = document.createElement('div');
  menu.id = menuId;
  menu.className = 'website-select__menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', getLabel(select));
  menu.hidden = true;

  select.classList.add('website-select__native');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;
  select.replaceWith(shell);
  shell.append(select, trigger, menu);

  let closeTimer = null;
  let optionButtons = [];

  const positionMenu = () => {
    if (!shell.classList.contains('is-open')) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const openAbove = availableBelow < 220 && availableAbove > availableBelow;
    const width = Math.max(rect.width, 190);
    const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    menu.style.minWidth = `${width}px`;
    menu.style.maxHeight = `${Math.max(140, Math.min(320, (openAbove ? availableAbove : availableBelow) - 4))}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${openAbove ? Math.max(viewportPadding, rect.top - menu.offsetHeight - 6) : rect.bottom + 6}px`;
  };

  const sync = () => {
    const selected = selectedOption(select);
    const selectedLabel = optionLabel(selected);
    const isLoading = select.disabled && /^(loading|cargando)\b/i.test(selectedLabel);
    value.textContent = visibleOptionLabel(selected) || 'Select an option';
    value.classList.toggle('is-loading', isLoading);
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-disabled', String(select.disabled));
    trigger.setAttribute('aria-label', getLabel(select));
    menu.setAttribute('aria-label', getLabel(select));
    shell.classList.toggle('is-disabled', select.disabled);
    menu.innerHTML = '';
    optionButtons = [...select.options].map((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'website-select__option';
      button.id = `${menuId}-option-${index}`;
      button.setAttribute('role', 'option');
      button.dataset.value = option.value;
      button.dataset.optionIndex = String(index);
      button.disabled = option.disabled;
      button.setAttribute('aria-selected', String(option === selected));
      const optionText = document.createElement('span');
      optionText.textContent = optionLabel(option);
      button.append(optionText);
      if (option === selected) {
        const check = document.createElement('b');
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        button.append(check);
      }
      button.addEventListener('click', () => {
        if (option.disabled) return;
        select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        close(true);
      });
      menu.append(button);
      return button;
    });
    if (shell.classList.contains('is-open')) positionMenu();
  };

  const close = (restoreFocus = false) => {
    if (closeTimer) window.clearTimeout(closeTimer);
    if (!shell.classList.contains('is-open')) return;
    shell.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    closeTimer = window.setTimeout(() => { menu.hidden = true; }, 160);
    if (restoreFocus) trigger.focus();
  };

  const open = () => {
    if (select.disabled || !select.options.length) return;
    closeOtherSelects(shell);
    if (closeTimer) window.clearTimeout(closeTimer);
    sync();
    menu.hidden = false;
    menu.setAttribute('aria-hidden', 'false');
    shell.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    positionMenu();
    const selected = optionButtons.find((button) => button.getAttribute('aria-selected') === 'true');
    (selected || optionButtons.find((button) => !button.disabled))?.focus();
  };

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    shell.classList.contains('is-open') ? close(true) : open();
  });
  trigger.addEventListener('keydown', (event) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!shell.classList.contains('is-open')) open();
      else moveFocus(optionButtons.filter((button) => !button.disabled), document.activeElement, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!shell.classList.contains('is-open')) open();
      const options = optionButtons.filter((button) => !button.disabled);
      (event.key === 'Home' ? options[0] : options.at(-1))?.focus();
    }
  });
  menu.addEventListener('keydown', (event) => {
    const options = optionButtons.filter((button) => !button.disabled);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(options, document.activeElement, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      (event.key === 'Home' ? options[0] : options.at(-1))?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  });

  const optionObserver = new MutationObserver(sync);
  optionObserver.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label'] });
  select.addEventListener('input', sync);
  select.addEventListener('change', sync);
  select.addEventListener('encore:select-value', sync);
  select.addEventListener('invalid', () => { trigger.focus(); }, { capture: true });
  window.addEventListener('resize', positionMenu, { passive: true });
  window.addEventListener('scroll', positionMenu, { passive: true, capture: true });
  enhancedSelects.set(select, { close, sync });
  sync();
}

const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
if (nativeValueDescriptor?.set && nativeValueDescriptor.get) {
  Object.defineProperty(HTMLSelectElement.prototype, 'value', {
    configurable: nativeValueDescriptor.configurable,
    enumerable: nativeValueDescriptor.enumerable,
    get: nativeValueDescriptor.get,
    set(nextValue) {
      nativeValueDescriptor.set.call(this, nextValue);
      this.dispatchEvent(new Event('encore:select-value', { bubbles: false }));
    },
  });
}

document.querySelectorAll('select').forEach(enhanceSelect);
const selectObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches?.('select')) enhanceSelect(node);
      node.querySelectorAll?.('select').forEach(enhanceSelect);
    }
  }
});
selectObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.website-select')) return;
  document.querySelectorAll('.website-select.is-open').forEach((shell) => enhancedSelects.get(shell.querySelector('select'))?.close(false));
});
