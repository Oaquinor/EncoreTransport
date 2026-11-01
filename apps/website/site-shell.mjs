const headerTarget = document.querySelector('[data-site-header]');
const footerTarget = document.querySelector('[data-site-footer]');

const travelLinks = `
  <a data-nav-link href="/website/routes/"><strong>Rutas y destinos</strong><small>Explora recorridos publicados</small></a>
  <a data-nav-link href="/website/trips/"><strong>Buscar viajes</strong><small>Horarios y asientos disponibles</small></a>
  <a data-nav-link href="/website/routes/#terminals"><strong>Terminales</strong><small>Puntos de salida del recorrido</small></a>`;
const packageLinks = `
  <a data-nav-link href="/website/packages/"><strong>Información de paquetería</strong><small>Requisitos y proceso</small></a>
  <a data-nav-link href="/website/services/"><strong>Servicios</strong><small>Viajes y envíos en un solo lugar</small></a>
  <a data-nav-link href="/track-package/"><strong>Rastrear paquete</strong><small>Consulta el estado registrado</small></a>`;
const trackingLinks = `
  <a data-nav-link href="/website/live/"><strong>Encore Live</strong><small>Red y ubicaciones autorizadas</small></a>
  <a data-nav-link href="/track-package/"><strong>Rastreo de paquetes</strong><small>Seguimiento por referencia</small></a>`;
const companyLinks = `
  <a data-nav-link href="/website/about/"><strong>Nosotros</strong><small>Propósito y forma de trabajar</small></a>
  <a data-nav-link href="/website/contact/"><strong>Contacto</strong><small>Canales para recibir ayuda</small></a>
  <a data-nav-link href="/website/help/"><strong>Preguntas frecuentes</strong><small>Respuestas para planificar</small></a>`;

function desktopMenu(label, id, links) {
  return `<div class="site-menu" data-menu><button class="site-menu__button" data-menu-button type="button" aria-expanded="false" aria-controls="${id}">${label}</button><div class="site-menu__panel" data-menu-panel id="${id}" hidden>${links}</div></div>`;
}

function mobileMenu(label, id, links) {
  return `<div class="site-mobile-menu" data-mobile-menu><button class="site-mobile-menu__button" data-mobile-menu-button type="button" aria-expanded="false" aria-controls="${id}">${label}</button><div class="site-mobile-menu__panel" data-mobile-menu-panel id="${id}" hidden>${links}</div></div>`;
}

if (headerTarget) {
  headerTarget.setAttribute('data-site-navigation', '');
  headerTarget.className = 'topbar shell public-topbar';
  headerTarget.innerHTML = `
    <a class="brand encore-lockup" href="/website/" aria-label="Encore Transport, inicio">
      <img class="encore-lockup__logo" src="/logo.svg" alt="" aria-hidden="true" />
      <span class="encore-lockup__copy"><strong>encore</strong><small>transport</small></span>
    </a>
    <nav class="nav public-nav" id="primaryNav" aria-label="Navegación principal">
      <a data-nav-link href="/website/">Inicio</a>
      ${desktopMenu('Viajes', 'travelMenu', travelLinks)}
      ${desktopMenu('Paquetería', 'packageMenu', packageLinks)}
      ${desktopMenu('Seguimiento', 'trackingMenu', trackingLinks)}
      ${desktopMenu('Empresa y ayuda', 'companyMenu', companyLinks)}
    </nav>
    <div class="public-topbar__actions">
      <a class="public-account-link" id="publicAccountAction" href="/login/?return=/passenger/"><span aria-hidden="true">◎</span><span>Iniciar sesión</span></a>
      <a class="public-passenger-link" id="publicMyTrips" href="/passenger/?screen=account" hidden>Mis viajes</a>
    </div>
    <button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-label="Abrir navegación" aria-controls="mobileNavigation" aria-expanded="false"><span></span><span></span><span></span></button>`;
}

const mobileTarget = document.querySelector('[data-site-mobile-navigation]');
if (mobileTarget) {
  mobileTarget.id = 'mobileNavigation';
  mobileTarget.className = 'mobile-navigation';
  mobileTarget.hidden = true;
  mobileTarget.innerHTML = `<nav aria-label="Navegación móvil">
    <a data-nav-link href="/website/">Inicio</a>
    ${mobileMenu('Viajes', 'mobileTravelMenu', travelLinks)}
    ${mobileMenu('Paquetería', 'mobilePackageMenu', packageLinks)}
    ${mobileMenu('Seguimiento', 'mobileTrackingMenu', trackingLinks)}
    ${mobileMenu('Empresa y ayuda', 'mobileCompanyMenu', companyLinks)}
    <a id="publicMobileMyTrips" href="/passenger/?screen=account&tab=tickets" hidden>Mis viajes</a>
    <a id="publicMobileAccount" class="mobile-navigation__staff" href="/login/?return=/passenger/">Iniciar sesión</a>
  </nav>`;
}

if (footerTarget) {
  footerTarget.className = 'footer public-footer';
  footerTarget.innerHTML = `
    <div class="shell public-footer__grid">
      <div class="public-footer__brand-block"><a class="encore-lockup encore-lockup--footer" href="/website/" aria-label="Encore Transport, inicio"><img class="encore-lockup__logo" src="/logo.svg" alt="" aria-hidden="true" /><span class="encore-lockup__copy"><strong>encore</strong><small>transport</small></span></a><p>Viajes regionales y seguimiento claro, desde la búsqueda hasta el boleto o la entrega.</p><a class="public-footer__primary-link" href="/website/trips/">Planificar un viaje <span aria-hidden="true">→</span></a></div>
      <div class="public-footer__column"><strong>Viajes</strong><nav class="public-footer__nav" aria-label="Enlaces de viajes"><a href="/website/routes/">Rutas y destinos</a><a href="/website/trips/">Buscar viajes</a><a href="/website/routes/#terminals">Terminales</a></nav></div>
      <div class="public-footer__column"><strong>Paquetería</strong><nav class="public-footer__nav" aria-label="Enlaces de paquetería"><a href="/website/packages/">Información</a><a href="/website/services/">Servicios</a><a href="/track-package/">Rastrear paquete</a></nav></div>
      <div class="public-footer__column"><strong>Empresa y ayuda</strong><nav class="public-footer__nav" aria-label="Enlaces de empresa y ayuda"><a href="/website/about/">Nosotros</a><a href="/website/contact/">Contacto</a><a href="/website/help/">Preguntas frecuentes</a><a href="/login/">Acceso de personal</a></nav></div>
    </div>
    <div class="shell public-footer__legal"><details><summary>Privacidad</summary><p>Usamos la información de cuenta y reservas para operar Encore Transport, dar soporte y proteger el servicio.</p></details><details><summary>Términos</summary><p>Las reservas siguen la ruta, tarifa y reglas de cancelación mostradas antes de confirmar.</p></details><details><summary>Accesibilidad</summary><p>El sitio mantiene navegación por teclado, contraste legible, etiquetas y diseño responsive.</p></details></div>
    <div class="shell public-footer__bottom"><span>© <span id="copyrightYear"></span> Encore Transport.</span><span>Viajes, asientos y paquetería.</span><nav aria-label="Enlaces legales"><a href="/website/help/#accessibility">Accesibilidad</a><a href="/website/contact/">Contacto</a></nav></div>`;
}

document.querySelectorAll('[data-mobile-menu]').forEach((menu) => {
  const button = menu.querySelector('[data-mobile-menu-button]');
  const panel = menu.querySelector('[data-mobile-menu-panel]');
  button?.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    if (panel) panel.hidden = expanded;
    menu.classList.toggle('is-open', !expanded);
  });
});

document.querySelector('#copyrightYear')?.replaceChildren(String(new Date().getFullYear()));
await import('./site-navigation.mjs');
