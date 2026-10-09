function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[character]));
}

export const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function cellValue(value) {
  return value == null || value === '' ? '—' : String(value);
}

export function table(title, headers, rows, options = {}) {
  const id = options.id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return `
    <section class="admin-panel admin-panel--pad module-view" data-table-shell="${esc(id)}">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">${esc(options.eyebrow ?? title)}</div>
          <h2>${esc(title)}</h2>
        </div>
        <span class="badge badge--neutral">${rows.length} records</span>
      </div>

      <div class="premium-table-toolbar">
        <label class="premium-table-search">
          <span class="sr-only">Search ${esc(title)}</span>
          <input
            type="search"
            placeholder="Search ${esc(title.toLowerCase())}…"
            data-table-search="${esc(id)}"
            autocomplete="off" />
        </label>

        <label class="premium-table-size">
          <span>Rows</span>
          <select data-table-size="${esc(id)}">
            <option value="10">10</option>
            <option value="25" selected>25</option>
            <option value="50">50</option>
          </select>
        </label>
      </div>

      <div class="table-wrap">
        <table class="table admin-table" data-admin-table="${esc(id)}">
          <thead>
            <tr>
              ${headers.map((header, index) => `
                <th>
                  <button type="button" class="premium-sort" data-sort-column="${index}">
                    ${esc(header)} <span aria-hidden="true">↕</span>
                  </button>
                </th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.length
              ? rows.map((row) => `
                  <tr data-table-row>
                    ${row.map((cell) => `<td>${esc(cellValue(cell))}</td>`).join('')}
                  </tr>`).join('')
              : `<tr><td colspan="${headers.length}">No records found.</td></tr>`}
          </tbody>
        </table>
      </div>

      <footer class="premium-table-footer" data-table-footer="${esc(id)}">
        <span data-table-count>${rows.length} records</span>
        <div>
          <button type="button" data-table-prev>Previous</button>
          <span data-table-page>1 / 1</span>
          <button type="button" data-table-next>Next</button>
        </div>
      </footer>
    </section>`;
}

export function dashboardView(data) {
  const metrics = data.metrics ?? {};

  return `
    <section class="admin-stats">
      <article class="stat-card">
        <span>Today's trips</span>
        <strong>${Number(metrics.tripsToday ?? 0)}</strong>
        <small>Scheduled and active</small>
      </article>
      <article class="stat-card">
        <span>Bookings</span>
        <strong>${Number(metrics.bookings ?? 0)}</strong>
        <small>Current records</small>
      </article>
      <article class="stat-card">
        <span>Paid revenue</span>
        <strong>${money(metrics.revenue ?? 0)}</strong>
        <small>Verified payments only</small>
      </article>
      <article class="stat-card">
        <span>Open incidents</span>
        <strong>${Number(metrics.incidents ?? 0)}</strong>
        <small>Needs operational review</small>
      </article>
    </section>

    ${table(
      'Recent trips',
      ['Route', 'Date', 'Bus', 'Driver', 'Status'],
      (data.trips ?? []).slice(0, 40).map((trip) => [
        trip.route?.origin && trip.route?.destination
          ? `${trip.route.origin} → ${trip.route.destination}`
          : '—',
        String(trip.departure_date ?? '').slice(0, 10),
        trip.bus?.code,
        trip.driver?.name,
        trip.status,
      ]),
      { id: 'recent-trips', eyebrow: 'Network activity' },
    )}`;
}

export function incidentsView(items) {
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">Operational follow-up</div>
          <h2>Incidents</h2>
        </div>
        <span class="badge badge--neutral">${items.length} records</span>
      </div>

      <div class="premium-record-list">
        ${items.length
          ? items.map((item) => `
              <article class="premium-record">
                <div class="premium-record__main">
                  <div class="premium-record__meta">
                    <span class="badge ${item.severity === 'high' ? 'premium-badge--danger' : item.severity === 'medium' ? 'premium-badge--warning' : 'badge--neutral'}">
                      ${esc(item.severity ?? 'medium')}
                    </span>
                    <span>Trip ${esc(item.trip?.id ?? '—')}</span>
                    <span>${esc(String(item.created_at ?? '').slice(0, 16))}</span>
                  </div>
                  <h3>${esc(item.title ?? 'Incident')}</h3>
                  <p>${esc(item.description ?? '')}</p>
                </div>

                <div class="premium-record__actions">
                  <label>
                    <span>Status</span>
                    <select data-incident-status="${esc(item.id)}">
                      ${['open', 'in_progress', 'resolved', 'dismissed'].map((status) => `
                        <option value="${status}" ${item.status === status ? 'selected' : ''}>
                          ${status.replaceAll('_', ' ')}
                        </option>`).join('')}
                    </select>
                  </label>
                  <button
                    type="button"
                    class="button button--ghost"
                    data-save-incident="${esc(item.id)}">
                    Save
                  </button>
                </div>
              </article>`).join('')
          : `<div class="et-empty">No incidents found.</div>`}
      </div>
    </section>`;
}

export function schedulesView(items, dashboard) {
  const drivers = dashboard?.drivers ?? [];
  const buses = dashboard?.buses ?? [];

  return `
    <section class="admin-schedule-layout">
      <section class="admin-panel admin-panel--pad premium-schedule-form">
        <div class="eyebrow">Planning</div>
        <h2>Create driver schedule</h2>
        <p>Schedules are checked by the server for overlapping assignments.</p>

        <form id="scheduleForm">
          <label>
            <span>Driver</span>
            <select name="driver_id" required>
              <option value="">Select driver</option>
              ${drivers.map((driver) => `<option value="${esc(driver.id)}">${esc(driver.name)} · ${esc(driver.license_number ?? '')}</option>`).join('')}
            </select>
          </label>

          <label>
            <span>Vehicle</span>
            <select name="bus_id">
              <option value="">No vehicle</option>
              ${buses.map((bus) => `<option value="${esc(bus.id)}">${esc(bus.code)} · ${esc(bus.plate ?? '')}</option>`).join('')}
            </select>
          </label>

          <div class="premium-form-grid">
            <label>
              <span>Date</span>
              <input type="date" name="work_date" required />
            </label>
            <label>
              <span>Start</span>
              <input type="time" name="starts_at" required />
            </label>
            <label>
              <span>End</span>
              <input type="time" name="ends_at" required />
            </label>
          </div>

          <label>
            <span>Notes</span>
            <textarea name="notes" rows="3" placeholder="Optional operational note"></textarea>
          </label>

          <button type="submit" class="button button--primary">Create schedule</button>
          <div id="scheduleMessage" aria-live="polite"></div>
        </form>
      </section>

      ${table(
        'Driver schedules',
        ['Date', 'Driver', 'Vehicle', 'Start', 'End', 'Status'],
        items.map((item) => [
          String(item.work_date ?? '').slice(0, 10),
          item.driver?.name,
          item.bus?.code,
          item.starts_at,
          item.ends_at,
          item.status,
        ]),
        { id: 'driver-schedules', eyebrow: 'Current assignments' },
      )}
    </section>`;
}

export function reportView(kind, data) {
  if (kind === 'trip-costs' && !data.available) {
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="eyebrow">Trip Cost Summary</div>
        <h2>Cost sources are not yet available.</h2>
        <p>${esc(data.message)}</p>
        <div class="feed">
          ${(data.missing_sources ?? []).map((source) => `
            <div class="feed-item">
              <strong>Missing source</strong>
              <div>${esc(source)}</div>
            </div>`).join('')}
        </div>
      </section>`;
  }

  if (kind === 'executive') {
    return `
      <section class="admin-stats">
        <article class="stat-card"><span>Trips</span><strong>${data.trips?.total ?? 0}</strong></article>
        <article class="stat-card"><span>Confirmed bookings</span><strong>${data.bookings?.confirmed ?? 0}</strong></article>
        <article class="stat-card"><span>Paid payments</span><strong>${data.payments?.paid ?? 0}</strong></article>
        <article class="stat-card"><span>Revenue</span><strong>${money((data.payments?.revenue_minor ?? 0) / 100)}</strong></article>
      </section>`;
  }

  if (kind === 'travel') {
    return table(
      'Travel Report',
      ['Trip', 'Date', 'Route', 'Vehicle', 'Driver', 'Occupied', 'Status'],
      (data.items ?? []).map((item) => [
        item.trip_id,
        item.date,
        item.route,
        item.vehicle,
        item.driver,
        item.occupied_seats,
        item.status,
      ]),
      { id: 'travel-report' },
    );
  }

  if (kind === 'vehicles') {
    return table(
      'Vehicle Report',
      ['Vehicle', 'Plate', 'Trips', 'Completed', 'Fuel', 'Engine', 'Tires', 'Network'],
      (data.items ?? []).map((item) => [
        item.code,
        item.plate,
        item.trips,
        item.completed_trips,
        item.latest_vehicle_status?.fuel_percent != null
          ? `${item.latest_vehicle_status.fuel_percent}%`
          : '—',
        item.latest_vehicle_status?.engine_status,
        item.latest_vehicle_status?.tires_status,
        item.latest_vehicle_status?.network_status,
      ]),
      { id: 'vehicle-report' },
    );
  }

  return table(
    'Trip Report',
    ['Trip', 'Date', 'Route', 'Bus', 'Driver', 'Bookings', 'Incidents', 'Status'],
    (data.items ?? []).map((item) => [
      item.id,
      item.date,
      item.route,
      item.bus,
      item.driver,
      item.bookings,
      item.incidents,
      item.status,
    ]),
    { id: 'trip-report' },
  );
}
