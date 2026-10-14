/* Progressive homepage enhancements only. Business/API logic remains in app.mjs. */

const navLinks = [
  ...document.querySelectorAll(
    '.public-nav a[href^="#"]',
  ),
];

const observedSections = navLinks
  .map((link) => {
    const selector =
      link.getAttribute('href');

    return {
      link,
      section:
        selector
          ? document.querySelector(selector)
          : null,
    };
  })
  .filter((entry) => entry.section);

function syncNavigation() {
  const marker =
    window.innerHeight * 0.30;

  let active = null;

  for (const entry of observedSections) {
    const rect =
      entry.section.getBoundingClientRect();

    if (
      rect.top <= marker &&
      rect.bottom > marker
    ) {
      active = entry;
      break;
    }
  }

  observedSections.forEach(
    (entry) => {
      entry.link.classList.toggle(
        'is-active',
        entry === active,
      );
    },
  );
}

window.addEventListener(
  'scroll',
  syncNavigation,
  { passive: true },
);

window.addEventListener(
  'resize',
  syncNavigation,
  { passive: true },
);

syncNavigation();
