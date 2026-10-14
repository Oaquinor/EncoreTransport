const links = [
  ...document.querySelectorAll(
    '.home-nav a[href^="#"]',
  ),
];

const sections = links
  .map((link) => {
    const id =
      link.getAttribute('href');

    return {
      link,
      section:
        id
          ? document.querySelector(id)
          : null,
    };
  })
  .filter(
    (item) => item.section,
  );

function updateActiveNavigation() {
  const offset =
    window.innerHeight * 0.32;

  let active = null;

  for (const item of sections) {
    const rect =
      item.section.getBoundingClientRect();

    if (
      rect.top <= offset &&
      rect.bottom > offset
    ) {
      active = item;
      break;
    }
  }

  for (const item of sections) {
    item.link.classList.toggle(
      'is-active',
      item === active,
    );
  }
}

window.addEventListener(
  'scroll',
  updateActiveNavigation,
  {
    passive: true,
  },
);

window.addEventListener(
  'resize',
  updateActiveNavigation,
  {
    passive: true,
  },
);

updateActiveNavigation();

/*
 * Decorate the existing seat preview produced by app.mjs without
 * replacing its API or business logic.
 */
const preview =
  document.querySelector('#seatPreview');

function decorateSeats() {
  preview
    ?.querySelectorAll(
      'button.seat',
    )
    .forEach(
      (seat) => {
        if (
          seat.querySelector(
            '.home-physical-seat',
          )
        ) {
          return;
        }

        const label =
          seat.textContent?.trim() ?? '';

        seat.textContent = '';

        const physical =
          document.createElement(
            'span',
          );

        physical.className =
          'home-physical-seat';

        const text =
          document.createElement('b');

        text.textContent = label;

        seat.append(
          physical,
          text,
        );
      },
    );
}

if (preview) {
  const observer =
    new MutationObserver(
      decorateSeats,
    );

  observer.observe(
    preview,
    {
      childList: true,
      subtree: true,
    },
  );

  decorateSeats();
}
