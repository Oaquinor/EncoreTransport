import {
  publicTrackPackage,
} from '../../packages/shared/api.mjs';
import { icon } from '../../packages/shared/icons.mjs';

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

function setActionLabel(button, label) {
  const target = button.querySelector('[data-action-label]');
  if (target) target.textContent = label;
  else button.textContent = label;
}

function trackingQrUrl(shareUrl) {
  const params = new URLSearchParams({
    text: shareUrl,
    size: '280',
    margin: '2',
    ecLevel: 'M',
    dark: '102b3c',
    light: 'ffffff',
    dotStyle: 'rounded',
    finderStyle: 'rounded',
    caption: 'Encore Transport',
    captionFontSize: '14',
  });
  return `https://quickchart.io/qr?${params.toString()}`;
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

    const events = Array.isArray(packageInfo.events) ? packageInfo.events : [];
    const shareUrl = `${location.origin}/track-package/?token=${encodeURIComponent(token)}`;
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

        <div class="track-actions" aria-label="Tracking actions">
          <button type="button" class="button button--ghost button--with-icon" data-copy-tracking="${esc(shareUrl)}">${icon('copy')}<span data-action-label>Copy tracking link</span></button>
          <button type="button" class="button button--ghost button--with-icon" data-show-tracking-qr="${esc(trackingQrUrl(shareUrl))}" aria-controls="trackingQrPanel" aria-expanded="false">${icon('qr')}<span data-action-label>Show QR code</span></button>
          <button type="button" class="button button--ghost button--with-icon" data-refresh-tracking="${esc(token)}">${icon('refresh')}<span data-action-label>Refresh status</span></button>
        </div>
        <div id="trackingQrPanel" class="tracking-qr" data-tracking-qr-panel hidden>
          <div><strong>Share this tracking view</strong><span>Show this code to the recipient without sharing account access.</span><small data-tracking-qr-status role="status">Preparing secure QR code…</small></div>
          <div class="tracking-qr__visual"><img data-tracking-qr alt="QR code for this package tracking view" width="240" height="240" loading="lazy"></div>
        </div>

        <div class="track-events">
          ${events.length ? events
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
            .join('') : '<p class="track-empty">No movement events have been recorded yet. Check again after the next operational update.</p>'}
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

result?.addEventListener('click', async (event) => {
  const copyButton = event.target.closest('[data-copy-tracking]');
  if (copyButton) {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyTracking);
      setActionLabel(copyButton, 'Link copied');
      setTimeout(() => { setActionLabel(copyButton, 'Copy tracking link'); }, 1800);
    } catch {
      setActionLabel(copyButton, 'Copy unavailable');
    }
    return;
  }
  const refreshButton = event.target.closest('[data-refresh-tracking]');
  if (refreshButton) void track(refreshButton.dataset.refreshTracking);
  const qrButton = event.target.closest('[data-show-tracking-qr]');
  if (qrButton) {
    const panel = result.querySelector('[data-tracking-qr-panel]');
    const image = panel?.querySelector('[data-tracking-qr]');
    if (!panel || !image) return;
    if (!panel.hidden && qrButton.dataset.qrState !== 'error') {
      panel.hidden = true;
      image.onload = null;
      image.onerror = null;
      qrButton.dataset.qrState = 'hidden';
      qrButton.setAttribute('aria-expanded', 'false');
      setActionLabel(qrButton, 'Show QR code');
      return;
    }
    const status = panel.querySelector('[data-tracking-qr-status]');
    if (status) status.textContent = 'Loading secure QR code…';
    image.hidden = true;
    qrButton.dataset.qrState = 'loading';
    image.onload = () => {
      image.hidden = false;
      qrButton.dataset.qrState = 'ready';
      if (status) status.textContent = 'Ready to scan.';
    };
    image.onerror = () => {
      image.hidden = true;
      qrButton.dataset.qrState = 'error';
      if (status) status.textContent = 'The QR provider is unavailable. Try again in a moment.';
      panel.hidden = false;
      qrButton.setAttribute('aria-expanded', 'true');
      setActionLabel(qrButton, 'Retry QR code');
    };
    image.src = qrButton.dataset.showTrackingQr;
    panel.hidden = false;
    qrButton.setAttribute('aria-expanded', 'true');
    setActionLabel(qrButton, 'Hide QR code');
  }
});

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
