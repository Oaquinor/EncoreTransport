import { formatMoney } from '../../../packages/shared/formatters.mjs';

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
    view: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="m4 16-.8 4.8L8 20l10.8-10.8a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 2 2"/>',
    archive: '<path d="M4 7h16M6 7v12h12V7M9 11h6"/><path d="m5 4h14v3H5z"/>',
    save: '<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.3 3.2-5 7-5s6.3 1.7 7 5"/>',
    dashboard: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a4 4 0 0 0 4-4V10a4 4 0 0 1 4-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    report: '<path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}

export const money = (value) =>
  formatMoney(value);

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
        <span class="badge badge--neutral">${rows.length} ${rows.length === 1 ? 'record' : 'records'}</span>
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
        <span data-table-count>${rows.length} ${rows.length === 1 ? 'record' : 'records'}</span>
        <div>
          <button type="button" data-table-prev>Previous</button>
          <span data-table-page>1 / 1</span>
          <button type="button" data-table-next>Next</button>
        </div>
      </footer>
    </section>`;
}

export function bookingDetailsView(booking) {
  const trip = booking.trip ?? {};
  const route = trip.route ?? {};
  const seats = booking.reserved_seats?.map((item) => item.seat?.seat_number).filter(Boolean)
    ?? booking.seat_numbers ?? [];
  const passengers = booking.passengers ?? [];
  const payments = booking.payments ?? [];
  const tripLabel = route.origin && route.destination ? `${route.origin} → ${route.destination}` : 'Route unavailable';
  const tripDate = [String(trip.departure_date ?? '').slice(0, 10), String(trip.departure_time ?? '').slice(0, 5)].filter(Boolean).join(' · ') || 'Departure unavailable';

  return `
    <div class="booking-detail-header">
      <div><div class="eyebrow">Booking details</div><h2>${esc(booking.reference ?? 'Booking')}</h2></div>
      <button class="button button--icon" type="button" data-close-booking-details aria-label="Close booking details">${icon('close')}</button>
    </div>
    <div class="booking-detail-grid">
      <article><span>Status</span><strong>${esc(String(booking.status ?? 'unknown').replaceAll('_', ' '))}</strong></article>
      <article><span>Trip</span><strong>${esc(tripLabel)}</strong><small>${esc(tripDate)}${trip.bus?.code ? ` · ${esc(trip.bus.code)}` : ''}</small></article>
      <article><span>Lead passenger</span><strong>${esc(booking.passenger_name ?? '—')}</strong><small>${esc(booking.passenger_email || 'No email')} · ${esc(booking.passenger_phone || 'No phone')}</small></article>
      <article><span>Seats</span><strong>${esc(seats.length ? seats.join(', ') : 'Not assigned')}</strong></article>
      <article><span>Passengers</span><strong>${passengers.length}</strong><small>${passengers.map((passenger) => esc(passenger.full_name)).join(', ') || 'No passenger records'}</small></article>
      <article><span>Booking total</span><strong>${money(booking.total_amount ?? 0)}</strong></article>
    </div>
    <section class="booking-detail-payments"><h3>Payments and ticket</h3>
      ${payments.length ? `<ul>${payments.map((payment) => `<li><span>${esc(payment.gateway ?? 'Payment')} · ${esc(payment.currency ?? '')}</span><strong>${esc(payment.status)} · ${money(Number(payment.amount_minor ?? 0) / 100)}</strong></li>`).join('')}</ul>` : '<p>No payment attempts recorded.</p>'}
      <p>Ticket: <strong>${esc(booking.ticket?.status ?? 'Not issued')}</strong>${booking.ticket?.issued_at ? ` · issued ${esc(booking.ticket.issued_at)}` : ''}</p>
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

export function incidentsView(items, canUpdate = false) {
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">Operational follow-up</div>
          <h2>Incidents</h2>
        </div>
        <span class="badge badge--neutral">${items.length} ${items.length === 1 ? 'record' : 'records'}</span>
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
                  ${canUpdate ? `<div class="incident-edit-fields"><label><span>Title</span><input data-incident-title="${esc(item.id)}" maxlength="120" value="${esc(item.title ?? '')}" /></label><label><span>Description</span><textarea data-incident-description="${esc(item.id)}" maxlength="5000" rows="3">${esc(item.description ?? '')}</textarea></label></div>` : `<h3>${esc(item.title ?? 'Incident')}</h3><p>${esc(item.description ?? '')}</p>`}
                </div>

                <div class="premium-record__actions">
                  ${canUpdate ? `<label><span>Severity</span><select data-incident-severity="${esc(item.id)}">${['low', 'medium', 'high'].map((severity) => `<option value="${severity}" ${item.severity === severity ? 'selected' : ''}>${severity}</option>`).join('')}</select></label>
                  <label><span>Status</span><select data-incident-status="${esc(item.id)}">${['open', 'in_progress', 'resolved', 'dismissed'].map((status) => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select></label>
                  <button
                    type="button"
                    class="button button--ghost"
                    data-save-incident="${esc(item.id)}">
                    Save
                  </button>` : `<span class="badge badge--neutral">${esc(item.status ?? 'open').replaceAll('_', ' ')}</span>`}
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

const reportColors = ['#078cbd', '#22a06b', '#f2ae38', '#e45c62', '#596bd8'];

function activityChart(days = []) {
  const points = days.slice(-14);
  if (!points.length) return '<p class="report-empty">No activity in this period.</p>';
  const width = 760;
  const height = 250;
  const left = 42;
  const right = 16;
  const top = 18;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...points.flatMap((point) => [Number(point.trips ?? 0), Number(point.bookings ?? 0)]));
  const x = (index) => left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
  const y = (value) => top + chartHeight - (Number(value ?? 0) / max) * chartHeight;
  const grids = Array.from({ length: 4 }, (_, index) => {
    const value = Math.round(max * (index / 3));
    const lineY = y(value);
    return `<g class="chart-grid"><line x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}"/><text x="${left - 9}" y="${lineY + 4}" text-anchor="end">${value}</text></g>`;
  }).join('');
  const series = [
    { key: 'trips', color: reportColors[0], name: 'Trips' },
    { key: 'bookings', color: reportColors[1], name: 'Bookings' },
  ];
  const lines = series.map(({ key, color, name }) => {
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point[key])}`).join(' ');
    const dots = points.map((point, index) => `<circle cx="${x(index)}" cy="${y(point[key])}" r="3.5"><title>${esc(name)}: ${Number(point[key] ?? 0)} · ${esc(point.date)}</title></circle>`).join('');
    return `<g class="chart-series" style="--series-color:${color}"><path d="${path}"/>${dots}</g>`;
  }).join('');
  const labelStride = Math.ceil(points.length / 7);
  const labels = points.map((point, index) => index % labelStride === 0 || index === points.length - 1 ? `<text class="chart-x-label" x="${x(index)}" y="${height - 10}" text-anchor="middle">${esc(String(point.date ?? '').slice(5))}</text>` : '').join('');
  const legend = series.map(({ color, name }) => `<span><i style="--series-color:${color}"></i>${name}</span>`).join('');
  return `<div class="report-chart"><div class="report-chart-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Trips and bookings by date">${grids}${lines}${labels}</svg></div>`;
}

function revenueChart(days = []) {
  const points = days.slice(-14);
  if (!points.length) return '<p class="report-empty">No revenue recorded in this period.</p>';
  const width = 760;
  const height = 220;
  const left = 48;
  const right = 16;
  const top = 14;
  const bottom = 34;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...points.map((point) => Number(point.revenue_minor ?? 0)));
  const slot = (width - left - right) / points.length;
  const bars = points.map((point, index) => {
    const value = Number(point.revenue_minor ?? 0);
    const barHeight = (value / max) * chartHeight;
    const barWidth = Math.max(4, slot * .55);
    const barX = left + index * slot + (slot - barWidth) / 2;
    const barY = top + chartHeight - barHeight;
    const labelStride = Math.ceil(points.length / 7);
    const label = index % labelStride === 0 || index === points.length - 1 ? `<text class="chart-x-label" x="${barX + barWidth / 2}" y="${height - 8}" text-anchor="middle">${esc(String(point.date ?? '').slice(5))}</text>` : '';
    return `<g class="revenue-bar"><rect x="${barX}" y="${barY}" width="${barWidth}" height="${Math.max(2, barHeight)}" rx="4"><title>${esc(point.date)} · ${esc(money(value / 100))}</title></rect>${label}</g>`;
  }).join('');
  const guide = [0, .5, 1].map((ratio) => {
    const guideY = top + chartHeight * (1 - ratio);
    return `<g class="chart-grid"><line x1="${left}" y1="${guideY}" x2="${width - right}" y2="${guideY}"/><text x="${left - 7}" y="${guideY + 4}" text-anchor="end">${esc(money(max * ratio / 100))}</text></g>`;
  }).join('');
  return `<div class="report-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily paid revenue">${guide}${bars}</svg></div>`;
}

function breakdownDonut(title, entries = []) {
  const usable = entries.map(([label, value], index) => ({ label, value: Math.max(0, Number(value ?? 0)), color: reportColors[index % reportColors.length] })).filter((entry) => entry.value > 0);
  const total = usable.reduce((sum, entry) => sum + entry.value, 0);
  if (!total) return `<p class="report-empty">No ${esc(title.toLowerCase())} recorded in this period.</p>`;
  const circumference = 2 * Math.PI * 42;
  let offset = 0;
  const segments = usable.map((entry) => {
    const length = circumference * entry.value / total;
    const markup = `<circle class="chart-donut-segment" cx="60" cy="60" r="42" stroke="${entry.color}" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${esc(entry.label)}: ${entry.value}</title></circle>`;
    offset += length;
    return markup;
  }).join('');
  const legend = usable.map((entry) => `<li><i style="--series-color:${entry.color}"></i><span>${esc(entry.label)}</span><b>${entry.value}</b></li>`).join('');
  return `<div class="report-donut-layout"><svg class="report-donut" viewBox="0 0 120 120" role="img" aria-label="${esc(title)}"><circle class="chart-donut-track" cx="60" cy="60" r="42"/>${segments}<text x="60" y="57" text-anchor="middle">${total}</text><text class="chart-donut-caption" x="60" y="72" text-anchor="middle">total</text></svg><ul class="report-donut-legend">${legend}</ul></div>`;
}

function severityBars(breakdown = {}) {
  const order = ['high', 'medium', 'low'];
  const values = order.map((key) => [key, Number(breakdown[key] ?? 0)]);
  const max = Math.max(1, ...values.map(([, count]) => count));
  return `<div class="report-severity-bars">${values.map(([severity, count]) => `<div><span>${esc(severity)}</span><i style="--bar:${(count / max) * 100}%;--severity-color:${severity === 'high' ? '#e45c62' : severity === 'medium' ? '#f2ae38' : '#22a06b'}"></i><b>${count}</b></div>`).join('')}</div>`;
}

function executiveReport(data, widgetOrder = []) {
  const widgets = {
    kpis: reportWidget('kpis', 'At a glance', `<div class="report-kpi-grid"><div><span>Trips</span><strong>${data.trips?.total ?? 0}</strong><small>${data.trips?.completed ?? 0} completed</small></div><div><span>Bookings</span><strong>${data.bookings?.confirmed ?? 0}</strong><small>${data.bookings?.pending ?? 0} pending</small></div><div><span>Revenue</span><strong>${money((data.payments?.revenue_minor ?? 0) / 100)}</strong><small>${data.payments?.paid ?? 0} paid transactions</small></div><div><span>Incidents</span><strong>${data.incidents ?? 0}</strong><small>${data.fleet?.active ?? 0} active vehicles</small></div></div>`, 'report-widget--wide'),
    occupancy: reportWidget('occupancy', 'Seat performance', `<div class="report-occupancy"><div class="report-ring" style="--report-rate:${Number(data.occupancy?.rate ?? 0)}%"><strong>${data.occupancy?.rate == null ? '—' : `${data.occupancy.rate}%`}</strong><span>occupancy</span></div><div class="report-side-stats"><div><span>Occupied</span><strong>${data.occupancy?.occupied ?? 0}</strong></div><div><span>Available</span><strong>${data.occupancy?.available ?? 0}</strong></div><div><span>Capacity</span><strong>${data.occupancy?.capacity ?? 0}</strong></div></div></div>`),
    trend: reportWidget('trend', 'Trips and bookings by day', activityChart(data.daily), 'report-widget--wide'),
    revenue: reportWidget('revenue', 'Paid revenue by day', revenueChart(data.daily), 'report-widget--wide'),
    bookingMix: reportWidget('booking-mix', 'Booking status mix', breakdownDonut('Booking status', [
      ['Confirmed', data.bookings?.confirmed], ['Pending', data.bookings?.pending], ['Cancelled', data.bookings?.cancelled],
    ])),
    incidentMix: reportWidget('incident-mix', 'Incident risk and status', `<div class="report-incident-mix"><div><span class="eyebrow">By severity</span>${severityBars(data.incident_breakdown?.severity)}</div><div><span class="eyebrow">By status</span>${breakdownDonut('Incident status', Object.entries(data.incident_breakdown?.status ?? {}).map(([status, count]) => [status, count]))}</div></div>`),
    upcoming: reportWidget('upcoming', 'Next departures', `<div class="report-departures">${(data.upcoming ?? []).map((trip) => `<div class="report-departure"><div><strong>${esc(trip.route || 'Route unavailable')}</strong><span>${esc(trip.date)} · ${esc(trip.time)} · ${esc(trip.vehicle || 'Vehicle pending')}</span></div><b>${trip.available_seats ?? 0} seats</b></div>`).join('') || '<p class="report-empty">No upcoming departures found.</p>'}</div>`, 'report-widget--wide'),
    cargo: reportWidget('cargo', 'Cargo activity', `<div class="report-mini-grid"><div><span>Received</span><strong>${data.cargo?.received ?? 0}</strong></div><div><span>In transit</span><strong>${data.cargo?.in_transit ?? 0}</strong></div><div><span>Delivered</span><strong>${data.cargo?.delivered ?? 0}</strong></div><div><span>Cancelled trips</span><strong>${data.trips?.cancelled ?? 0}</strong></div></div>`),
  };
  const order = [...new Set([...(widgetOrder ?? []), 'kpis', 'occupancy', 'trend', 'revenue', 'bookingMix', 'incidentMix', 'upcoming', 'cargo'])];
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

  if (kind === 'bookings') {
    return table('Bookings Report', ['Reference', 'Created', 'Trip date', 'Route', 'Vehicle', 'Passenger', 'Passengers', 'Seats', 'Amount', 'Booking', 'Payment'],
      (data.items ?? []).map((item) => [item.reference, item.created_at, item.trip_date, item.route, item.vehicle, item.passenger, item.passenger_count, item.seats, money(item.amount), item.status, item.payment_status]),
      { id: 'bookings-report' });
  }

  if (kind === 'revenue') {
    return table('Revenue Report', ['Payment', 'Paid at', 'Booking', 'Route', 'Amount', 'Currency', 'Gateway'],
      (data.items ?? []).map((item) => [item.payment_reference, item.paid_at, item.booking_reference, item.route, money(Number(item.amount ?? 0) / 100), item.currency, item.gateway]),
      { id: 'revenue-report' });
  }

  if (kind === 'incidents') {
    return table('Incidents Report', ['Incident', 'Reported', 'Route', 'Driver', 'Title', 'Severity', 'Status', 'Resolved'],
      (data.items ?? []).map((item) => [item.id, item.reported_at, item.route, item.driver, item.title, item.severity, item.status, item.resolved_at]),
      { id: 'incidents-report' });
  }

  if (kind === 'packages') {
    return table('Packages Report', ['Reference', 'Created', 'Route', 'Driver', 'Status', 'Delivered'],
      (data.items ?? []).map((item) => [item.reference, item.created_at, item.route, item.driver, item.status, item.delivered_at]),
      { id: 'packages-report' });
  }

  if (kind === 'schedules') {
    return table('Schedules Report', ['Date', 'Start', 'End', 'Driver', 'Vehicle', 'Route', 'Status'],
      (data.items ?? []).map((item) => [item.date, item.starts_at, item.ends_at, item.driver, item.vehicle, item.route, item.status]),
      { id: 'schedules-report' });
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
