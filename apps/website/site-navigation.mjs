const header = document.querySelector('[data-site-navigation]');
const mobileToggle = document.querySelector('#mobileMenuToggle');
const mobileNavigation = document.querySelector('#mobileNavigation');
const menus = [...document.querySelectorAll('[data-menu]')];
const closeTimers = new WeakMap();
const navigationCopy = document.documentElement.lang === 'es'
  ? { open: 'Abrir navegación', close: 'Cerrar navegación' }
  : { open: 'Open navigation', close: 'Close navigation' };

function cancelClose(menu) {
  const timer = closeTimers.get(menu);
  if (timer) window.clearTimeout(timer);
  closeTimers.delete(menu);
}

function scheduleClose(menu) {
  cancelClose(menu);
  closeTimers.set(menu, window.setTimeout(() => closeMenu(menu), 110));
}

function closeMenu(menu, { focus = false } = {}) {
  cancelClose(menu);
  const button = menu.querySelector('[data-menu-button]');
  const panel = menu.querySelector('[data-menu-panel]');
  button?.setAttribute('aria-expanded', 'false');
  if (panel) panel.hidden = true;
  menu.classList.remove('is-open');
  delete menu.dataset.openReason;
  if (focus) button?.focus();
}

function openMenu(menu, reason = 'click') {
  cancelClose(menu);
  menus.forEach((item) => { if (item !== menu) closeMenu(item); });
  const button = menu.querySelector('[data-menu-button]');
  const panel = menu.querySelector('[data-menu-panel]');
  button?.setAttribute('aria-expanded', 'true');
  if (panel) panel.hidden = false;
  menu.classList.add('is-open');
  menu.dataset.openReason = reason;
}

function closeMenus({ restoreFocus = false } = {}) {
  menus.forEach((menu) => closeMenu(menu, { focus: restoreFocus }));
}

function closeMobileNavigation({ restoreFocus = false } = {}) {
  if (!mobileToggle || !mobileNavigation) return;
  mobileNavigation.hidden = true;
  mobileToggle.setAttribute('aria-expanded', 'false');
  mobileToggle.setAttribute('aria-label', navigationCopy.open);
  document.body.classList.remove('mobile-menu-open');
  if (restoreFocus) mobileToggle.focus();
}

function openMobileNavigation() {
  if (!mobileToggle || !mobileNavigation) return;
  mobileNavigation.hidden = false;
  mobileToggle.setAttribute('aria-expanded', 'true');
  mobileToggle.setAttribute('aria-label', navigationCopy.close);
  document.body.classList.add('mobile-menu-open');
  mobileNavigation.querySelector('a, button')?.focus();
}

menus.forEach((menu) => {
  const button = menu.querySelector('[data-menu-button]');
  button?.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (expanded && menu.dataset.openReason === 'hover') menu.dataset.openReason = 'click';
    else if (expanded) closeMenu(menu);
    else openMenu(menu);
  });
  button?.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    openMenu(menu, 'keyboard');
    const links = menu.querySelectorAll('[data-menu-panel] a');
    const target = event.key === 'ArrowUp' ? links[links.length - 1] : links[0];
    target?.focus();
  });

  menu.addEventListener('pointerenter', () => {
    cancelClose(menu);
    if (window.matchMedia('(min-width: 981px) and (pointer: fine)').matches) openMenu(menu, 'hover');
  });
  menu.addEventListener('pointerleave', () => {
    if (window.matchMedia('(min-width: 981px)').matches) scheduleClose(menu);
  });
  menu.addEventListener('focusout', (event) => {
    if (!menu.contains(event.relatedTarget)) closeMenu(menu);
  });
});

document.addEventListener('pointermove', (event) => {
  if (!window.matchMedia('(min-width: 981px) and (pointer: fine)').matches) return;
  menus.forEach((menu) => {
    // Keep a small hand-off window while the pointer crosses the gap from
    // the trigger to the panel. Immediate closure makes submenu items
    // impossible to reach on slower or diagonal pointer movement.
    if (menu.dataset.openReason === 'hover' && !menu.contains(event.target)) scheduleClose(menu);
  });
}, { passive: true });

mobileToggle?.addEventListener('click', () => {
  if (mobileToggle.getAttribute('aria-expanded') === 'true') closeMobileNavigation();
  else openMobileNavigation();
});

mobileNavigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => closeMobileNavigation());
});

document.addEventListener('click', (event) => {
  if (!header?.contains(event.target)) closeMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const open = menus.find((menu) => menu.classList.contains('is-open'));
  if (open) {
    closeMenu(open, { focus: true });
    return;
  }
  if (mobileToggle?.getAttribute('aria-expanded') === 'true') closeMobileNavigation({ restoreFocus: true });
});

const mediaQuery = window.matchMedia('(min-width: 981px)');
mediaQuery.addEventListener?.('change', () => {
  closeMenus();
  if (mediaQuery.matches) closeMobileNavigation();
});

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/website';
document.querySelectorAll('[data-nav-link]').forEach((link) => {
  const target = new URL(link.href, window.location.origin).pathname.replace(/\/+$/, '') || '/website';
  if (target === currentPath || (target !== '/website' && currentPath.startsWith(`${target}/`))) {
    link.setAttribute('aria-current', 'page');
    link.closest('[data-menu]')?.querySelector('[data-menu-button]')?.setAttribute('aria-current', 'page');
  }
});

document.querySelector('#copyrightYear')?.replaceChildren(String(new Date().getFullYear()));
