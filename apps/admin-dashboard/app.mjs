import { fetchAdminDashboard } from '../../packages/shared/api.mjs';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '../../packages/shared/domain.mjs';
import { badge, statCard } from '../../packages/shared/ui.mjs';

const appRoot = document.querySelector('#app');
const detailDialog = document.querySelector('#detailDialog');

const state = {
  loading: true,
  activeModule: 'dashboard',
  search: '',
  dashboard: null
};

const modules = [
  { id: 'dashboard', label: 'Control' },
  { id: 'trips', label: 'Viajes' },
  { id: 'buses', label: 'Buses' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' }
];

function render() {
  appRoot.innerHTML = `
    <div class="admin-layout motion-enter">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <img class="admin-brand__logo" src="/logo.svg" alt="Encore Transport" />
          <div>
            <strong>Encore Operations</strong>
            <small>Control Center</small>
          </div>
        </div>
        <nav class="admin-nav">
          ${modules.map((module) => `<div class="admin-nav__item ${module.id === state.activeModule ? 'admin-nav__item--active' : ''}" data-module="${module.id}">${module.label}</div>`).join('')}
        </nav>
      </aside>
      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <div class="eyebrow">Centralized operations</div>
            <h1 class="page-title">${getModuleTitle()}</h1>
          </div>
          <div class="admin-controls">
            <input class="field" id="searchInput" placeholder="Search..." value="${state.search}" />
            <button class="button button--ghost" id="refreshButton">Refresh</button>
          </div>
        </header>

        ${state.loading ? renderLoading() : renderContent()}
      </section>
    </div>
  `;

  wireEvents();
}

function getModuleTitle() {
  const item = modules.find((entry) => entry.id === state.activeModule) ?? modules[0];
  return item.label;
}

function renderLoading() {
  return `
    <div class="grid grid--3">
      ${statCard('Today\'s trips', '—', 'Loading...')}
      ${statCard('Bookings', '—', 'Loading...')}
      ${statCard('Revenue', '—', 'Loading...')}
      ${statCard('Incidents', '—', 'Loading...')}
    </div>
  `;
}

function renderContent() {
  const dashboard = state.dashboard;
  const filteredTrips = filterRows(dashboard.trips);
  const filteredBuses = filterRows(dashboard.buses);
  const filteredDrivers = filterRows(dashboard.drivers);
  const filteredPassengers = filterRows(dashboard.passengers);
  const filteredInventory = filterRows(dashboard.inventory);

  return `
    <section class="admin-stats">
      ${statCard('Today\'s trips', dashboard.metrics.tripsToday, 'Active operations')}
      ${statCard('Bookings', dashboard.metrics.bookings, 'Confirmed and pending')}
      ${statCard('Revenue', formatCurrency(dashboard.metrics.revenue), 'Daily tracking')}
      ${statCard('Occupancy', `${dashboard.metrics.occupancy}%`, 'Capacity used')}
    </section>

    <section class="admin-columns">
      <article class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div>
            <div class="eyebrow">Trend</div>
            <h2>Occupancy and operations</h2>
          </div>
          <span class="badge badge--info">Updated today</span>
        </div>
        <img class="admin-fleet-image" src="/assets/media/Autobus.png" alt="Autobús de Encore Transport" />
        <div class="chart-bars">
          ${[52, 63, 58, 72, 81, 74, 88].map((height) => `<div class="chart-bar" style="height:${height}%"></div>`).join('')}
        </div>
      </article>

      <article class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div>
            <div class="eyebrow">Alerts</div>
            <h2>Operational status</h2>
          </div>
        </div>
        <div class="feed">
          <div class="feed-item"><strong>${dashboard.metrics.pendingBookings}</strong> bookings pending confirmation</div>
          <div class="feed-item"><strong>${dashboard.metrics.availableBuses}</strong> buses available for scheduling</div>
          <div class="feed-item"><strong>${dashboard.metrics.incidents}</strong> active incidents require attention</div>
        </div>
      </article>
    </section>

    ${renderModuleTables(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory)}
  `;
}

function renderModuleTables(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory) {
  switch (state.activeModule) {
    case 'trips':
      return tableBlock('Trips', filteredTrips.map((trip) => [trip.routeName, trip.departureTime, `${trip.occupancy}%`, trip.status]), ['Route', 'Departure', 'Occupancy', 'Status']);
    case 'buses':
      return tableBlock('Buses', filteredBuses.map((bus) => [bus.name, bus.plate, bus.capacity, bus.status]), ['Unit', 'Plate', 'Capacity', 'Status']);
    case 'drivers':
      return tableBlock('Drivers', filteredDrivers.map((driver) => [driver.name, driver.license, driver.status]), ['Name', 'License', 'Status']);
    case 'bookings':
      return tableBlock('Bookings', filteredPassengers.map((passenger) => [passenger.name, passenger.idNumber, passenger.status]), ['Passenger', 'Document', 'Status']);
    case 'inventory':
      return tableBlock('Inventory', filteredInventory.map((item) => [item.name, `${item.quantity} ${item.unit}`, item.status]), ['Item', 'Quantity', 'Status']);
    case 'reports':
      return reportsPanel();
    case 'users':
      return placeholderPanel('Users', 'Prepared for account and access administration.');
    case 'roles':
      return placeholderPanel('Roles and permissions', 'Prepared for RBAC, policies, and granular permissions.');
    default:
      return dashboardPanel(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory);
  }
}

function dashboardPanel(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory) {
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">Summary</div>
          <h2>Daily operations</h2>
        </div>
        <span class="badge badge--primary">${state.dashboard.metrics.tripsToday} trips</span>
      </div>
      <div class="table-wrap">
        <table class="table admin-table">
          <thead><tr><th>Route</th><th>Bus</th><th>Driver</th><th>Occupancy</th><th>Status</th></tr></thead>
          <tbody>
            ${filteredTrips
              .map((trip) => `<tr><td>${trip.routeName}</td><td>${trip.busId}</td><td>${trip.driverId}</td><td>${trip.occupancy}%</td><td><span class="row-action" data-row-trip="${trip.id}">${trip.status}</span></td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
    <section class="admin-columns">
      <article class="admin-panel admin-panel--pad">
        <h3>Available buses</h3>
        <div class="grid" style="gap:10px;">
          ${filteredBuses.map((bus) => `<div class="feed-item"><strong>${bus.name}</strong><div>${bus.plate} · ${bus.capacity} seats</div></div>`).join('')}
        </div>
      </article>
      <article class="admin-panel admin-panel--pad">
        <h3>Incidents and passengers</h3>
        <div class="grid" style="gap:10px;">
          ${filteredPassengers.slice(0, 3).map((passenger) => `<div class="feed-item"><strong>${passenger.name}</strong><div>${passenger.status}</div></div>`).join('')}
        </div>
      </article>
    </section>
  `;
}

function tableBlock(title, rows, headers) {
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">${title}</div>
          <h2>${title}</h2>
        </div>
        <span class="badge badge--neutral">${rows.length} registros</span>
      </div>
      <div class="table-wrap">
        <table class="table admin-table">
          <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row, index) => `
                  <tr data-row-index="${index}">
                    ${row.map((cell) => `<td>${cell}</td>`).join('')}
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function placeholderPanel(title, description) {
  return `
    <section class="admin-panel admin-panel--pad">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">${title}</div>
          <h2>${title}</h2>
        </div>
      </div>
      <p>${description}</p>
      <span class="badge badge--info">Preparado para producción</span>
    </section>
  `;
}

function reportsPanel() {
  const dashboard = state.dashboard;
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">Reports</div>
          <h2>Filters and future export</h2>
        </div>
        <div class="admin-controls">
          <select class="select"><option>Today</option><option>Date range</option></select>
          <button class="button button--ghost">Export CSV</button>
        </div>
      </div>
      <div class="grid grid--2">
        <div class="feed-item"><strong>Trips</strong><div>${dashboard.trips.length} records available</div></div>
        <div class="feed-item"><strong>Bookings</strong><div>${dashboard.metrics.bookings} consolidations</div></div>
        <div class="feed-item"><strong>Revenue</strong><div>${formatCurrency(dashboard.metrics.revenue)}</div></div>
        <div class="feed-item"><strong>Occupancy</strong><div>${dashboard.metrics.occupancy}% average</div></div>
      </div>
    </section>
  `;
}

function filterRows(rows) {
  const query = state.search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query)));
}

function wireEvents() {
  document.querySelectorAll('[data-module]').forEach((item) => {
    item.addEventListener('click', () => {
      state.activeModule = item.getAttribute('data-module');
      render();
    });
  });

  document.querySelector('#searchInput')?.addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });

  document.querySelector('#refreshButton')?.addEventListener('click', async () => {
    state.loading = true;
    render();
    state.dashboard = await fetchAdminDashboard();
    state.loading = false;
    render();
  });

  document.querySelectorAll('[data-row-trip]').forEach((element) => {
    element.addEventListener('click', () => {
      const trip = state.dashboard.trips.find((entry) => entry.id === element.getAttribute('data-row-trip'));
      if (!trip || !detailDialog) {
        return;
      }
      detailDialog.innerHTML = `
        <div class="detail-dialog__content">
          <div class="detail-dialog__header">
            <div>
              <div class="eyebrow">Trip</div>
              <h3>${trip.routeName}</h3>
            </div>
            <button class="button button--ghost" id="closeDialog">Close</button>
          </div>
          <div class="grid grid--2">
            <div class="feed-item"><strong>Departure</strong><div>${formatDateLabel(trip.date)} · ${formatTimeLabel(trip.departureTime)}</div></div>
            <div class="feed-item"><strong>Occupancy</strong><div>${trip.occupancy}%</div></div>
            <div class="feed-item"><strong>Bus</strong><div>${trip.busId}</div></div>
            <div class="feed-item"><strong>Driver</strong><div>${trip.driverId}</div></div>
          </div>
        </div>
      `;
      detailDialog.showModal();
      document.querySelector('#closeDialog')?.addEventListener('click', () => detailDialog.close());
    });
  });
}

async function initialize() {
  state.dashboard = await fetchAdminDashboard();
  state.loading = false;
  render();
}

initialize();
