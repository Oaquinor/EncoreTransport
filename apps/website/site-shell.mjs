import { applyStaticLocale, copy, DEFAULT_LOCALE, getPageKey, pageSeo } from './locale-data.mjs';

const siteLoader = document.createElement('div');
siteLoader.className = 'site-loader';
siteLoader.setAttribute('role', 'status');
siteLoader.setAttribute('aria-live', 'polite');
siteLoader.innerHTML = '<div class="site-loader__inner"><img src="/assets/media/encore-loader.gif" alt="" width="180" height="180" /><span>Preparing your journey…</span></div>';
document.body.prepend(siteLoader);
const dismissSiteLoader = () => {
  siteLoader.classList.add('is-hidden');
  window.setTimeout(() => siteLoader.remove(), 220);
};
const dismissWhenShellIsReady = () => window.setTimeout(dismissSiteLoader, 40);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dismissWhenShellIsReady, { once: true });
else dismissWhenShellIsReady();
window.setTimeout(dismissSiteLoader, 900);

const headerTarget = document.querySelector('[data-site-header]');
const footerTarget = document.querySelector('[data-site-footer]');
const mobileTarget = document.querySelector('[data-site-mobile-navigation]');
const queryLocale = new URLSearchParams(window.location.search).get('lang');
const storedLocale = (() => { try { return window.localStorage.getItem('encore_site_locale_v1'); } catch { return null; } })();
const locale = queryLocale === 'es' || queryLocale === 'en' ? queryLocale : (storedLocale === 'es' ? 'es' : DEFAULT_LOCALE);
const labels = copy(locale);

function desktopMenu(label, id, links) {
  return `<div class="site-menu" data-menu><button class="site-menu__button" data-menu-button type="button" aria-expanded="false" aria-controls="${id}">${label}</button><div class="site-menu__panel" data-menu-panel id="${id}" hidden>${links}</div></div>`;
}

function mobileMenu(label, id, links) {
  return `<div class="site-mobile-menu" data-mobile-menu><button class="site-mobile-menu__button" data-mobile-menu-button type="button" aria-expanded="false" aria-controls="${id}">${label}</button><div class="site-mobile-menu__panel" data-mobile-menu-panel id="${id}" hidden>${links}</div></div>`;
}

const travelLinks = `
  <a data-nav-link href="/website/routes/"><strong>${labels.travel.routes}</strong><small>${labels.travel.routesHint}</small></a>
  <a data-nav-link href="/website/trips/"><strong>${labels.travel.search}</strong><small>${labels.travel.searchHint}</small></a>
  <a data-nav-link href="/website/routes/#terminals"><strong>${labels.travel.terminals}</strong><small>${labels.travel.terminalsHint}</small></a>`;
const packageLinks = `
  <a data-nav-link href="/website/packages/"><strong>${labels.packages.info}</strong><small>${labels.packages.infoHint}</small></a>
  <a data-nav-link href="/website/services/"><strong>${labels.packages.services}</strong><small>${labels.packages.servicesHint}</small></a>
  <a data-nav-link href="/track-package/"><strong>${labels.packages.track}</strong><small>${labels.packages.trackHint}</small></a>`;
const trackingLinks = `
  <a data-nav-link href="/website/live/"><strong>${labels.tracking.live}</strong><small>${labels.tracking.liveHint}</small></a>
  <a data-nav-link href="/track-package/"><strong>${labels.tracking.packages}</strong><small>${labels.tracking.packagesHint}</small></a>`;
const companyLinks = `
  <a data-nav-link href="/website/about/"><strong>${labels.company.about}</strong><small>${labels.company.aboutHint}</small></a>
  <a data-nav-link href="/website/contact/"><strong>${labels.company.contact}</strong><small>${labels.company.contactHint}</small></a>
  <a data-nav-link href="/website/help/"><strong>${labels.company.help}</strong><small>${labels.company.helpHint}</small></a>`;

function languageSwitcher(id) {
  return `<label class="locale-switcher" for="${id}"><span class="sr-only">${labels.nav.language}</span><select id="${id}" data-locale-switcher aria-label="${labels.nav.language}"><option value="en" ${locale === 'en' ? 'selected' : ''}>EN</option><option value="es" ${locale === 'es' ? 'selected' : ''}>ES</option></select></label>`;
}

if (headerTarget) {
  headerTarget.setAttribute('data-site-navigation', '');
  headerTarget.className = 'topbar shell public-topbar';
  headerTarget.innerHTML = `
    <a class="brand encore-lockup" href="/website/" aria-label="Encore Transport, ${labels.nav.home}">
      <img class="encore-lockup__logo" src="/logo.svg" alt="" aria-hidden="true" />
      <span class="encore-lockup__copy"><strong>encore</strong><small>transport</small></span>
    </a>
    <nav class="nav public-nav" id="primaryNav" aria-label="${labels.nav.home}">
      <a data-nav-link href="/website/">${labels.nav.home}</a>
      ${desktopMenu(labels.nav.trips, 'travelMenu', travelLinks)}
      ${desktopMenu(labels.nav.packages, 'packageMenu', packageLinks)}
      ${desktopMenu(labels.nav.tracking, 'trackingMenu', trackingLinks)}
      ${desktopMenu(labels.nav.company, 'companyMenu', companyLinks)}
    </nav>
    <div class="public-topbar__actions">${languageSwitcher('desktopLocale')}
      <a class="public-account-link" id="publicAccountAction" href="/login/?return=/passenger/"><span aria-hidden="true">◎</span><span>${labels.nav.signIn}</span></a>
      <a class="public-passenger-link" id="publicMyTrips" href="/passenger/?screen=account" hidden>${labels.nav.myTrips}</a>
    </div>
    <button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-label="${labels.nav.open}" aria-controls="mobileNavigation" aria-expanded="false"><span></span><span></span><span></span></button>`;
}

if (mobileTarget) {
  mobileTarget.id = 'mobileNavigation';
  mobileTarget.className = 'mobile-navigation';
  mobileTarget.hidden = true;
  mobileTarget.innerHTML = `<nav aria-label="${labels.nav.home}">
    ${languageSwitcher('mobileLocale')}
    <a data-nav-link href="/website/">${labels.nav.home}</a>
    ${mobileMenu(labels.nav.trips, 'mobileTravelMenu', travelLinks)}
    ${mobileMenu(labels.nav.packages, 'mobilePackageMenu', packageLinks)}
    ${mobileMenu(labels.nav.tracking, 'mobileTrackingMenu', trackingLinks)}
    ${mobileMenu(labels.nav.company, 'mobileCompanyMenu', companyLinks)}
    <a id="publicMobileMyTrips" href="/passenger/?screen=account&tab=tickets" hidden>${labels.nav.myTrips}</a>
    <a id="publicMobileAccount" class="mobile-navigation__staff" href="/login/?return=/passenger/">${labels.nav.signIn}</a>
  </nav>`;
}

if (footerTarget) {
  footerTarget.className = 'footer public-footer';
  footerTarget.innerHTML = `
    <div class="shell public-footer__grid">
      <div class="public-footer__brand-block"><a class="encore-lockup encore-lockup--footer" href="/website/" aria-label="Encore Transport, ${labels.nav.home}"><img class="encore-lockup__logo" src="/logo.svg" alt="" aria-hidden="true" /><span class="encore-lockup__copy"><strong>encore</strong><small>transport</small></span></a><p>${labels.footer.lead}</p><a class="public-footer__primary-link" href="/website/trips/">${labels.footer.plan} <span aria-hidden="true">→</span></a></div>
      <div class="public-footer__column"><strong>${labels.footer.travel}</strong><nav class="public-footer__nav" aria-label="${labels.footer.travel}"><a href="/website/routes/">${labels.travel.routes}</a><a href="/website/trips/">${labels.travel.search}</a><a href="/website/routes/#terminals">${labels.travel.terminals}</a></nav></div>
      <div class="public-footer__column"><strong>${labels.footer.packages}</strong><nav class="public-footer__nav" aria-label="${labels.footer.packages}"><a href="/website/packages/">${labels.footer.information}</a><a href="/website/services/">${labels.packages.services}</a><a href="/track-package/">${labels.packages.track}</a></nav></div>
      <div class="public-footer__column"><strong>${labels.footer.company}</strong><nav class="public-footer__nav" aria-label="${labels.footer.company}"><a href="/website/about/">${labels.company.about}</a><a href="/website/contact/">${labels.company.contact}</a><a href="/website/help/">${labels.company.help}</a><a href="/login/">${labels.footer.staff}</a></nav></div>
    </div>
    <div class="shell public-footer__legal"><details><summary>${labels.footer.privacy}</summary><p>${labels.footer.privacyText}</p></details><details><summary>${labels.footer.terms}</summary><p>${labels.footer.termsText}</p></details><details><summary>${labels.footer.accessibility}</summary><p>${labels.footer.accessibilityText}</p></details></div>
    <div class="shell public-footer__bottom"><span>© <span id="copyrightYear"></span> Encore Transport.</span><span>${labels.footer.bottom}</span><nav aria-label="${labels.footer.accessibility}"><a href="/website/help/">${labels.footer.accessibility}</a><a href="/website/contact/">${labels.company.contact}</a></nav></div>`;
}

function applySeo() {
  const seo = pageSeo(getPageKey(window.location.pathname), locale);
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
  document.title = seo.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', seo.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.description);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', seo.title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', seo.description);
  const current = new URL(window.location.href);
  if (locale === 'en') current.searchParams.delete('lang'); else current.searchParams.set('lang', locale);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${current.pathname}${current.search}`);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', `${current.pathname}${current.search}`);
  for (const code of ['en', 'es']) {
    const url = new URL(window.location.href);
    if (code === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', code);
    let link = document.querySelector(`link[rel="alternate"][hreflang="${code}"]`);
    if (!link) { link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = code; document.head.append(link); }
    link.href = `${url.pathname}${url.search}`;
  }
  let xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]');
  if (!xDefault) { xDefault = document.createElement('link'); xDefault.rel = 'alternate'; xDefault.hreflang = 'x-default'; document.head.append(xDefault); }
  const defaultUrl = new URL(window.location.href); defaultUrl.searchParams.delete('lang'); xDefault.href = `${defaultUrl.pathname}${defaultUrl.search}`;
}

function switchLocale(nextLocale) {
  if (!['en', 'es'].includes(nextLocale)) return;
  try { window.localStorage.setItem('encore_site_locale_v1', nextLocale); } catch {}
  const url = new URL(window.location.href);
  if (nextLocale === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', nextLocale);
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
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

document.querySelectorAll('[data-locale-switcher]').forEach((select) => select.addEventListener('change', (event) => switchLocale(event.target.value)));
document.querySelector('#copyrightYear')?.replaceChildren(String(new Date().getFullYear()));
applySeo();
applyStaticLocale(locale);
await import('./premium-interactions.mjs');
await import('./site-navigation.mjs');
