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
  { id: 'drivers', label: 'Conductores' },
  { id: 'bookings', label: 'Reservas' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'reports', label: 'Reportes' },
  { id: 'users', label: 'Usuarios' },
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
            <div class="eyebrow">Operación centralizada</div>
            <h1 class="page-title">${getModuleTitle()}</h1>
          </div>
          <div class="admin-controls">
            <input class="field" id="searchInput" placeholder="Buscar..." value="${state.search}" />
            <button class="button button--ghost" id="refreshButton">Actualizar</button>
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
      ${statCard('Viajes hoy', '—', 'Cargando...')}
      ${statCard('Reservas', '—', 'Cargando...')}
      ${statCard('Ingresos', '—', 'Cargando...')}
      ${statCard('Incidencias', '—', 'Cargando...')}
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
      ${statCard('Viajes hoy', dashboard.metrics.tripsToday, 'Operación activa')}
      ${statCard('Reservas', dashboard.metrics.bookings, 'Confirmadas y pendientes')}
      ${statCard('Ingresos', formatCurrency(dashboard.metrics.revenue), 'Monitoreo diario')}
      ${statCard('Ocupación', `${dashboard.metrics.occupancy}%`, 'Capacidad usada')}
    </section>

    <section class="admin-columns">
      <article class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div>
            <div class="eyebrow">Tendencia</div>
            <h2>Ocupación y operación</h2>
          </div>
          <span class="badge badge--info">Actualizado hoy</span>
        </div>
        <img class="admin-fleet-image" src="/assets/media/Autobus.png" alt="Autobús de Encore Transport" />
        <div class="chart-bars">
          ${[52, 63, 58, 72, 81, 74, 88].map((height) => `<div class="chart-bar" style="height:${height}%"></div>`).join('')}
        </div>
      </article>

      <article class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div>
            <div class="eyebrow">Alertas</div>
            <h2>Estado operacional</h2>
          </div>
        </div>
        <div class="feed">
          <div class="feed-item"><strong>${dashboard.metrics.pendingBookings}</strong> reservas pendientes de confirmación</div>
          <div class="feed-item"><strong>${dashboard.metrics.availableBuses}</strong> buses disponibles para programación</div>
          <div class="feed-item"><strong>${dashboard.metrics.incidents}</strong> incidencias activas requieren atención</div>
        </div>
      </article>
    </section>

    ${renderModuleTables(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory)}
  `;
}

function renderModuleTables(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory) {
  switch (state.activeModule) {
    case 'trips':
      return tableBlock('Viajes', filteredTrips.map((trip) => [trip.routeName, trip.departureTime, `${trip.occupancy}%`, trip.status]), ['Ruta', 'Salida', 'Ocupación', 'Estado']);
    case 'buses':
      return tableBlock('Buses', filteredBuses.map((bus) => [bus.name, bus.plate, bus.capacity, bus.status]), ['Unidad', 'Placa', 'Capacidad', 'Estado']);
    case 'drivers':
      return tableBlock('Conductores', filteredDrivers.map((driver) => [driver.name, driver.license, driver.status]), ['Nombre', 'Licencia', 'Estado']);
    case 'bookings':
      return tableBlock('Reservas', filteredPassengers.map((passenger) => [passenger.name, passenger.idNumber, passenger.status]), ['Pasajero', 'Documento', 'Estado']);
    case 'inventory':
      return tableBlock('Inventario', filteredInventory.map((item) => [item.name, `${item.quantity} ${item.unit}`, item.status]), ['Item', 'Cantidad', 'Estado']);
    case 'reports':
      return reportsPanel();
    case 'users':
      return placeholderPanel('Usuarios', 'Preparado para la administración de cuentas y accesos.');
    case 'roles':
      return placeholderPanel('Roles y permisos', 'Preparado para RBAC, policies y permisos granulares.');
    default:
      return dashboardPanel(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory);
  }
}

function dashboardPanel(filteredTrips, filteredBuses, filteredDrivers, filteredPassengers, filteredInventory) {
  return `
    <section class="admin-panel admin-panel--pad module-view">
      <div class="module-view__header">
        <div>
          <div class="eyebrow">Resumen</div>
          <h2>Operación diaria</h2>
        </div>
        <span class="badge badge--primary">${state.dashboard.metrics.tripsToday} viajes</span>
      </div>
      <div class="table-wrap">
        <table class="table admin-table">
          <thead><tr><th>Ruta</th><th>Bus</th><th>Conductor</th><th>Ocupación</th><th>Estado</th></tr></thead>
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
        <h3>Buses disponibles</h3>
        <div class="grid" style="gap:10px;">
          ${filteredBuses.map((bus) => `<div class="feed-item"><strong>${bus.name}</strong><div>${bus.plate} · ${bus.capacity} asientos</div></div>`).join('')}
        </div>
      </article>
      <article class="admin-panel admin-panel--pad">
        <h3>Incidencias y pasajeros</h3>
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
          <div class="eyebrow">Reportes</div>
          <h2>Filtros y exportación futura</h2>
        </div>
        <div class="admin-controls">
          <select class="select"><option>Hoy</option><option>Rango de fechas</option></select>
          <button class="button button--ghost">Exportar CSV</button>
        </div>
      </div>
      <div class="grid grid--2">
        <div class="feed-item"><strong>Viajes</strong><div>${dashboard.trips.length} registros disponibles</div></div>
        <div class="feed-item"><strong>Reservas</strong><div>${dashboard.metrics.bookings} consolidaciones</div></div>
        <div class="feed-item"><strong>Ingresos</strong><div>${formatCurrency(dashboard.metrics.revenue)}</div></div>
        <div class="feed-item"><strong>Ocupación</strong><div>${dashboard.metrics.occupancy}% promedio</div></div>
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
              <div class="eyebrow">Viaje</div>
              <h3>${trip.routeName}</h3>
            </div>
            <button class="button button--ghost" id="closeDialog">Cerrar</button>
          </div>
          <div class="grid grid--2">
            <div class="feed-item"><strong>Salida</strong><div>${formatDateLabel(trip.date)} · ${formatTimeLabel(trip.departureTime)}</div></div>
            <div class="feed-item"><strong>Ocupación</strong><div>${trip.occupancy}%</div></div>
            <div class="feed-item"><strong>Bus</strong><div>${trip.busId}</div></div>
            <div class="feed-item"><strong>Conductor</strong><div>${trip.driverId}</div></div>
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
