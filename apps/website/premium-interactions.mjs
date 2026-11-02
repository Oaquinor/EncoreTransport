const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const main = document.querySelector('main');

function mountScrollProgress() {
  if (!main || document.querySelector('.scroll-progress')) return;
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  document.body.append(progress);
  const fill = progress.firstElementChild;
  const update = () => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const percentage = max ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
    fill.style.width = `${percentage}%`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function mountPointerField() {
  if (reducedMotion || !window.matchMedia('(pointer:fine)').matches) return;
  document.addEventListener('pointermove', (event) => {
    const x = event.clientX / Math.max(1, window.innerWidth);
    const y = event.clientY / Math.max(1, window.innerHeight);
    document.documentElement.style.setProperty('--pointer-x', `${(x * 100).toFixed(2)}%`);
    document.documentElement.style.setProperty('--pointer-y', `${(y * 100).toFixed(2)}%`);
  }, { passive: true });
}

function mountServiceInduction() {
  const panel = document.querySelector('[data-service-induction]');
  if (!panel) return;
  const locale = document.documentElement.lang === 'es' ? 'es' : 'en';
  const steps = locale === 'es' ? [
    { count: '01 / 03', title: 'Busca y reserva', copy: 'Compara salidas, revisa los detalles y elige tus asientos.', action: 'Abrir búsqueda', href: '/website/trips/' },
    { count: '02 / 03', title: 'Envía y rastrea', copy: 'Prepara tu encomienda, consulta los requisitos y sigue su recorrido.', action: 'Ver paquetería', href: '/website/packages/' },
    { count: '03 / 03', title: 'Encuentra respuestas', copy: 'Consulta orientación práctica sobre viajes, boletos y encomiendas.', action: 'Abrir ayuda', href: '/website/help/' },
  ] : [
    { count: '01 / 03', title: 'Search and book', copy: 'Compare departures, review details and choose your seats.', action: 'Open trip search', href: '/website/trips/' },
    { count: '02 / 03', title: 'Send and track', copy: 'Prepare your shipment, review requirements and follow its journey.', action: 'View parcel services', href: '/website/packages/' },
    { count: '03 / 03', title: 'Find an answer', copy: 'Get practical guidance about trips, tickets and parcels.', action: 'Open help', href: '/website/help/' },
  ];
  const count = panel.querySelector('[data-induction-count]');
  const title = panel.querySelector('[data-induction-title]');
  const copy = panel.querySelector('[data-induction-copy]');
  const action = panel.querySelector('[data-induction-link]');
  const progress = panel.querySelector('[data-induction-progress]');
  const buttons = [...panel.querySelectorAll('[data-induction-step]')];
  const topLabel = panel.querySelector('.service-induction__top > span');
  const stepLabels = locale === 'es' ? ['Buscar', 'Enviar', 'Ayuda'] : ['Search', 'Send', 'Help'];
  if (topLabel) topLabel.textContent = locale === 'es' ? 'Cómo funciona' : 'How it works';
  panel.setAttribute('aria-label', locale === 'es' ? 'Cómo funciona Encore' : 'How Encore works');
  buttons.forEach((button, index) => { button.innerHTML = `${String(index + 1).padStart(2, '0')} <span>${stepLabels[index]}</span>`; });
  let active = 0;
  let timer = null;
  const render = (index) => {
    active = (index + steps.length) % steps.length;
    const step = steps[active];
    if (count) count.textContent = step.count;
    if (title) title.textContent = step.title;
    if (copy) copy.textContent = step.copy;
    if (action) { action.href = step.href; action.firstChild.textContent = `${step.action} `; }
    if (progress) progress.style.width = `${((active + 1) / steps.length) * 100}%`;
    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === active;
      button.setAttribute('aria-selected', String(selected));
      button.classList.toggle('is-active', selected);
    });
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = null; };
  const start = () => { if (reducedMotion || timer) return; timer = window.setInterval(() => render(active + 1), 4200); };
  buttons.forEach((button) => button.addEventListener('click', () => { stop(); render(Number(button.dataset.inductionStep)); start(); }));
  panel.addEventListener('mouseenter', stop);
  panel.addEventListener('mouseleave', start);
  panel.addEventListener('focusin', stop);
  panel.addEventListener('focusout', (event) => { if (!panel.contains(event.relatedTarget)) start(); });
  render(0);
  start();
}

function mountPackageFlow() {
  const panel = document.querySelector('[data-package-flow]');
  if (!panel) return;
  const locale = document.documentElement.lang === 'es' ? 'es' : 'en';
  const steps = locale === 'es' ? [
    { count: '01 / 03', title: 'Prepara', copy: 'Ten listos los datos del destinatario, origen, destino y una descripción del contenido.', action: 'Ver qué preparar', href: '/website/contact/' },
    { count: '02 / 03', title: 'Entrega', copy: 'Entrega la encomienda con la información correcta y conserva su referencia.', action: 'Consultar requisitos', href: '/website/contact/' },
    { count: '03 / 03', title: 'Sigue', copy: 'Usa la referencia para consultar las actualizaciones registradas del recorrido.', action: 'Rastrear encomienda', href: '/track-package/' },
  ] : [
    { count: '01 / 03', title: 'Prepare', copy: 'Have the recipient details, origin, destination and a description of the contents ready.', action: 'See what to prepare', href: '/website/contact/' },
    { count: '02 / 03', title: 'Hand over', copy: 'Hand over the parcel with the right information and keep its reference.', action: 'Ask about requirements', href: '/website/contact/' },
    { count: '03 / 03', title: 'Follow', copy: 'Use the reference to check the recorded updates along the journey.', action: 'Track a parcel', href: '/track-package/' },
  ];
  const count = panel.querySelector('[data-package-count]');
  const title = panel.querySelector('[data-package-title]');
  const copy = panel.querySelector('[data-package-copy]');
  const action = panel.querySelector('[data-package-link]');
  const progress = panel.querySelector('[data-package-progress]');
  const buttons = [...panel.querySelectorAll('[data-package-step]')];
  const stepLabels = locale === 'es' ? ['Prepara', 'Entrega', 'Sigue'] : ['Prepare', 'Hand over', 'Follow'];
  let active = 0;
  let timer = null;
  buttons.forEach((button, index) => { button.innerHTML = `${String(index + 1).padStart(2, '0')} <span>${stepLabels[index]}</span>`; });
  const render = (index) => {
    active = (index + steps.length) % steps.length;
    const step = steps[active];
    if (count) count.textContent = step.count;
    if (title) title.textContent = step.title;
    if (copy) copy.textContent = step.copy;
    if (action) { action.href = step.href; action.firstChild.textContent = `${step.action} `; }
    if (progress) progress.style.width = `${((active + 1) / steps.length) * 100}%`;
    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === active;
      button.setAttribute('aria-selected', String(selected));
      button.classList.toggle('is-active', selected);
    });
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = null; };
  const start = () => { if (reducedMotion || timer) return; timer = window.setInterval(() => render(active + 1), 4300); };
  buttons.forEach((button) => button.addEventListener('click', () => { stop(); render(Number(button.dataset.packageStep)); start(); }));
  panel.addEventListener('mouseenter', stop);
  panel.addEventListener('mouseleave', start);
  panel.addEventListener('focusin', stop);
  panel.addEventListener('focusout', (event) => { if (!panel.contains(event.relatedTarget)) start(); });
  render(0);
  start();
}

mountScrollProgress();
mountPointerField();
mountServiceInduction();
mountPackageFlow();
