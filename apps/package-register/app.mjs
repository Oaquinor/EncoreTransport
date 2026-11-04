import { createPackage, fetchDriverTrip } from '../../packages/shared/api/driver.mjs';

const form = document.querySelector('#packageForm');
const submitButton = document.querySelector('#submitButton');
const tripId = document.querySelector('#tripId');
const tripStatus = document.querySelector('#tripStatus');
const formError = document.querySelector('#formError');
const successCard = document.querySelector('#successCard');
const copyTrackingLink = document.querySelector('#copyTrackingLink');

function tripLabel(trip) {
  const route = trip?.route;
  const origin = route?.origin ?? trip?.origin ?? 'Origin';
  const destination = route?.destination ?? trip?.destination ?? 'Destination';
  return `${origin} → ${destination}${trip?.departure_at ? ` · ${new Date(trip.departure_at).toLocaleString()}` : ''}`;
}

async function loadTrip() {
  try {
    const trip = await fetchDriverTrip();
    if (!trip?.id) throw new Error('No active trip is assigned to this driver.');
    tripId.value = trip.id;
    tripStatus.textContent = `Active trip: ${tripLabel(trip)}`;
    tripStatus.classList.add('ready');
    submitButton.disabled = false;
  } catch (error) {
    if ([401, 403].includes(Number(error?.status))) {
      tripStatus.innerHTML = 'Driver access is required to register a package. <a href="/login/?return=/package-register/">Sign in to continue →</a>';
    } else if (Number(error?.status) === 404) {
      tripStatus.textContent = 'No active trip is assigned to this driver yet. Operations must assign a trip before packages can be registered.';
    } else {
      tripStatus.textContent = error.message || 'Unable to load the active trip.';
    }
    tripStatus.classList.add('error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;
  successCard.hidden = true;
  submitButton.disabled = true;
  submitButton.querySelector('[data-action-label]')?.replaceChildren('Registering…');
  const data = new FormData(form);
  let registrationSucceeded = false;
  try {
    const result = await createPackage(Object.fromEntries(data.entries()));
    const pkg = result?.package ?? result;
    const token = result?.tracking_token;
    document.querySelector('#successReference').textContent = pkg?.reference ?? 'Package registered';
    const link = document.querySelector('#trackingLink');
    link.href = token ? `/track-package/?token=${encodeURIComponent(token)}` : '/track-package/';
    if (copyTrackingLink) copyTrackingLink.dataset.url = new URL(link.href, location.origin).href;
    registrationSucceeded = true;
    form.reset();
    tripId.value = pkg?.trip_id ?? tripId.value;
  } catch (error) {
    formError.textContent = error.message || 'Package could not be registered.';
    formError.hidden = false;
  } finally {
    submitButton.disabled = !tripId.value;
    submitButton.querySelector('[data-action-label]')?.replaceChildren('Register package');
    if (registrationSucceeded) successCard.hidden = false;
  }
});

copyTrackingLink?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copyTrackingLink.dataset.url || `${location.origin}/track-package/`);
    copyTrackingLink.querySelector('[data-action-label]')?.replaceChildren('Copied');
    setTimeout(() => { copyTrackingLink.querySelector('[data-action-label]')?.replaceChildren('Copy link'); }, 1800);
  } catch {
    copyTrackingLink.querySelector('[data-action-label]')?.replaceChildren('Copy unavailable');
  }
});

loadTrip();
