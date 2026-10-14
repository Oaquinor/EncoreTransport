import {
  publicTrackPackage,
} from '../../packages/shared/api.mjs';

const form =
  document.querySelector('#trackForm');

const result =
  document.querySelector('#result');

const query =
  new URLSearchParams(location.search);

const tokenField =
  form?.querySelector('[name="token"]');

if (
  tokenField &&
  query.get('token')
) {
  tokenField.value =
    query.get('token');
}

function esc(value = '') {
  return String(value).replace(
    /[&<>'"]/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;',
    }[character]),
  );
}

function humanStatus(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

async function track(token) {
  result.innerHTML = `
    <div class="track-result">
      <strong>Checking your package…</strong>
      <span>This usually takes only a moment.</span>
    </div>`;

  try {
    const packageInfo =
      await publicTrackPackage(token);

    result.innerHTML = `
      <section class="track-result">
        <div>
          <small>Tracking number</small>
          <h2>${esc(packageInfo.reference)}</h2>
        </div>

        <div>
          <small>Current status</small>
          <strong>${esc(humanStatus(packageInfo.status))}</strong>
        </div>

        ${
          packageInfo.route
            ? `
              <div>
                <small>Route</small>
                <strong>${esc(packageInfo.route)}</strong>
              </div>`
            : ''
        }

        <div class="track-events">
          ${(packageInfo.events ?? [])
            .map(
              (event) => `
                <div class="track-event">
                  <strong>${esc(humanStatus(event.status))}</strong>
                  ${
                    event.notes
                      ? `<div>${esc(event.notes)}</div>`
                      : ''
                  }
                  <small>${esc(event.occurred_at ?? '')}</small>
                </div>`,
            )
            .join('')}
        </div>
      </section>`;
  } catch {
    result.innerHTML = `
      <div class="track-result">
        <strong>We couldn’t find an update for that tracking number.</strong>
        <span>Check the number and try again. If it still doesn’t work, contact Encore Transport with your shipment details.</span>
      </div>`;
  }
}

form?.addEventListener(
  'submit',
  (event) => {
    event.preventDefault();

    const data =
      new FormData(form);

    const token =
      String(
        data.get('token') ?? '',
      ).trim();

    if (!token) return;

    void track(token);
  },
);

if (tokenField?.value) {
  void track(tokenField.value);
}
