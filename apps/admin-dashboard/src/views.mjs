function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[character]));
}

export function icon(name) {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="m4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 2 2"/>',
    archive: '<path d="M4 7h16M6 7v12h12V7M9 11h6"/><path d="m5 4h14v3H5z"/>',
    save: '<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
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
                    ${row.map((cell) => `<td>${cell && typeof cell === 'object' && cell.html ? cell.html : esc(cellValue(cell))}</td>`).join('')}
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
  const capabilities = data.capabilities ?? {};
  const statCards = [
    capabilities.trips ? `<article class="stat-card"><span>Today's trips</span><strong>${Number(metrics.tripsToday ?? 0)}</strong><small>Scheduled and active</small></article>` : '',
    capabilities.bookings ? `<article class="stat-card"><span>Bookings</span><strong>${Number(metrics.bookings ?? 0)}</strong><small>Current records</small></article>` : '',
    capabilities.payments ? `<article class="stat-card"><span>Paid revenue</span><strong>${money(metrics.revenue ?? 0)}</strong><small>Verified payments only</small></article>` : '',
    capabilities.incidents ? `<article class="stat-card"><span>Open incidents</span><strong>${Number(metrics.incidents ?? 0)}</strong><small>Needs operational review</small></article>` : '',
  ].filter(Boolean).join('');

  return `
    ${statCards ? `<section class="admin-stats">${statCards}</section>` : '<section class="admin-panel admin-panel--pad et-empty">No dashboard metrics are available for your current permissions.</section>'}

    ${capabilities.trips ? table(
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
    ) : ''}`;
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

function reportWidget(id, title, body, className = '') {
  return `<article class="report-widget ${className}" draggable="true" data-report-widget="${esc(id)}"><header><div><span class="eyebrow">${esc(title)}</span><span class="report-drag-hint" aria-label="Drag to reorder">⋮⋮</span></div></header>${body}</article>`;
}

function executiveReport(data, widgetOrder = []) {
  const widgets = {
    kpis: reportWidget('kpis', 'At a glance', `<div class="report-kpi-grid"><div><span>Trips</span><strong>${data.trips?.total ?? 0}</strong><small>${data.trips?.completed ?? 0} completed</small></div><div><span>Bookings</span><strong>${data.bookings?.confirmed ?? 0}</strong><small>${data.bookings?.pending ?? 0} pending</small></div><div><span>Revenue</span><strong>${money((data.payments?.revenue_minor ?? 0) / 100)}</strong><small>${data.payments?.paid ?? 0} paid transactions</small></div><div><span>Incidents</span><strong>${data.incidents ?? 0}</strong><small>${data.fleet?.active ?? 0} active vehicles</small></div></div>`, 'report-widget--wide'),
    occupancy: reportWidget('occupancy', 'Seat performance', `<div class="report-occupancy"><div class="report-ring" style="--report-rate:${Number(data.occupancy?.rate ?? 0)}%"><strong>${data.occupancy?.rate == null ? '—' : `${data.occupancy.rate}%`}</strong><span>occupancy</span></div><div class="report-side-stats"><div><span>Occupied</span><strong>${data.occupancy?.occupied ?? 0}</strong></div><div><span>Available</span><strong>${data.occupancy?.available ?? 0}</strong></div><div><span>Capacity</span><strong>${data.occupancy?.capacity ?? 0}</strong></div></div></div>`),
    trend: reportWidget('trend', 'Activity trend', `<div class="report-trend">${(data.daily ?? []).map((day) => `<div class="report-trend-row"><span>${esc(String(day.date).slice(5))}</span><i style="--bar:${Math.min(100, Number(day.bookings ?? 0) * 10)}%" title="${esc(day.bookings)} bookings"></i><b>${day.bookings ?? 0}</b></div>`).join('') || '<p class="report-empty">No activity in this period.</p>'}</div>`, 'report-widget--wide'),
    upcoming: reportWidget('upcoming', 'Next departures', `<div class="report-departures">${(data.upcoming ?? []).map((trip) => `<div class="report-departure"><div><strong>${esc(trip.route || 'Route unavailable')}</strong><span>${esc(trip.date)} · ${esc(trip.time)} · ${esc(trip.vehicle || 'Vehicle pending')}</span></div><b>${trip.available_seats ?? 0} seats</b></div>`).join('') || '<p class="report-empty">No upcoming departures found.</p>'}</div>`, 'report-widget--wide'),
    cargo: reportWidget('cargo', 'Cargo activity', `<div class="report-mini-grid"><div><span>Received</span><strong>${data.cargo?.received ?? 0}</strong></div><div><span>In transit</span><strong>${data.cargo?.in_transit ?? 0}</strong></div><div><span>Delivered</span><strong>${data.cargo?.delivered ?? 0}</strong></div><div><span>Cancelled trips</span><strong>${data.trips?.cancelled ?? 0}</strong></div></div>`),
  };
  const order = [...new Set([...(widgetOrder ?? []), 'kpis', 'occupancy', 'trend', 'upcoming', 'cargo'])];
  return `<div class="report-dashboard"><div class="report-dashboard__hint">Drag the panels to arrange your workspace. Your layout is saved on this device.</div><div class="report-widget-grid">${order.map((id) => widgets[id]).filter(Boolean).join('')}</div></div>`;
}

export function reportView(kind, data, options = {}) {
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
    return executiveReport(data, options.widgetOrder);
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
