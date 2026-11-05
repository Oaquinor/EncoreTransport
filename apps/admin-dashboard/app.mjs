import {
  getApiToken,
  me,
  logout,
  mapJourney,
  requestJson,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../packages/shared/api.mjs';
import {
  renderJourneyMapWithLoader,
  destroyRealMap,
} from '../../packages/shared/real-map.mjs';
import { modules } from './src/module-registry.mjs';
import * as api from './src/api.mjs';
import { reportFilename, reportToCsv, reportToJson } from './src/report-export.mjs';
import {
  dashboardView,
  table,
  reportView,
  incidentsView,
  bookingDetailsView,
  icon,
  actionButton,
} from './src/views.mjs';

const root = document.querySelector('#app');
let latestLoadRequest = 0;

const state = {
  module: 'dashboard',
  loading: true,
  error: '',
  accessDenied: false,
  dashboard: null,
  incidents: [],
  schedules: [],
  scheduleFormOpen: false,
  scheduleEditingId: null,
  scheduleForm: null,
  tripFormOpen: false,
  tripEditingId: null,
  tripForm: null,
  packages: [],
  tickets: [],
  ticketMeta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
  ticketFilters: { q: '', status: '', lifecycle: '', page: 1, per_page: 25 },
  ticketDetail: null,
  routes: [],
  drivers: [],
  vehicles: [],
  vehicleEditingId: null,
  vehicleSeatLayout: [],
  vehicleDraft: null,
  driverFormOpen: false,
  driverEditingId: null,
  routeFormOpen: false,
  routeEditingId: null,
  routeEditor: null,
  websiteContent: null,
  websiteMedia: [],
  cmsImageSection: 'hero',
  cmsPendingMediaDeletes: [],
  vehicleStatus: [],
  reportType: 'executive',
  reportData: null,
  reportFrom: '',
  reportTo: '',
  reportWidgetOrder: JSON.parse(localStorage.getItem('encore_report_widgets') || '[]'),
  user: null,
  permissions: [],
  users: [],
  userMeta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
  userFilters: { q: '', role: '', active: '', date_from: '', date_to: '', page: 1, per_page: 25 },
  roles: [],
  permissionCatalog: [],
  generalSettings: null,
  userFormOpen: false,
  userEditingId: null,
  userForm: null,
  userDetail: null,
  userDetailTab: 'general',
  userDetailLoading: false,
  userDetailError: '',
  userDetailMeta: {},
  roleEditingId: null,
  profilePhotoMessage: '',
  profilePhotoDraftUrl: '',
  profilePhotoDraftFile: null,
  profilePhotoZoom: 1,
  profileDialog: '',
  profileSaving: false,
  profileDirty: false,
  userMenuOpen: false,
  notificationsOpen: false,
  notifications: [],
  notificationsUnread: 0,
  sidebarCollapsed: localStorage.getItem('encore_admin_sidebar_collapsed') === '1',
  navGroups: JSON.parse(localStorage.getItem('encore_admin_nav_groups_v2') || '{}'),
};

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[character]));
}

function adminDisplayName(user) {
  const name = String(user?.name ?? '').trim();
  return name && name.toLowerCase() !== 'admin demo' ? name : 'Operations Admin';
}

const navIconByModule = {
  dashboard: 'dashboard',
  trips: 'route',
  bookings: 'calendar',
  tickets: 'ticket',
  vehicles: 'bus',
  drivers: 'user',
  routes: 'route',
  website: 'view',
  schedules: 'calendar',
  packages: 'package',
  incidents: 'close',
  customers: 'user',
  reports: 'report',
  users: 'user',
  roles: 'user',
  permissions: 'save',
  settings: 'settings',
  profile: 'user',
};

async function optimizeImageForUpload(file) {
  if (typeof createImageBitmap !== 'function' || typeof File !== 'function') return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  try {
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 512 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally { bitmap.close?.(); }
}

async function cropProfileImage(file, zoom = 1) {
  if (typeof createImageBitmap !== 'function' || typeof File !== 'function') return file;
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height) / Math.max(1, Number(zoom));
    const sx = Math.max(0, (bitmap.width - side) / 2);
    const sy = Math.max(0, (bitmap.height - side) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, 720, 720);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-profile.webp`, { type: 'image/webp', lastModified: Date.now() }) : file;
  } finally { bitmap.close?.(); }
}

function captureVehicleDraft() {
  const form = document.querySelector('#vehicleForm');
  if (!form) return state.vehicleDraft;
  state.vehicleDraft = {
    code: form.elements.code.value,
    plate: form.elements.plate.value,
    capacity: form.elements.capacity.value,
    status: form.elements.status.value,
    positionsPerRow: document.querySelector('#vehiclePositionsPerRow')?.value ?? '4',
  };
  return state.vehicleDraft;
}

function routeEditorFrom(route = null) {
  const stops = (route?.stops ?? []).slice().sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0)).map((stop) => ({
    name: stop.name ?? '',
    latitude: stop.latitude ?? '',
    longitude: stop.longitude ?? '',
    offset_minutes: stop.offset_minutes ?? 0,
  }));

  return {
    stops: stops.length >= 2 ? stops : [{ name: '', latitude: '', longitude: '', offset_minutes: 0 }, { name: '', latitude: '', longitude: '', offset_minutes: 0 }],
    segments: (route?.segments ?? []).map((segment) => ({
      origin: segment.origin ?? segment.origin_name ?? '',
      destination: segment.destination ?? segment.destination_name ?? '',
      price: segment.price ?? '',
      distance_meters: segment.distance_meters ?? '',
      duration_seconds: segment.duration_seconds ?? '',
      active: segment.active !== false,
    })),
  };
}

const cmsSections = ['hero', 'tracking', 'routes', 'faq', 'about', 'contact', 'final_cta'];
function blankWebsiteContent() {
  const source = {
    hero: ['Travel with confidence.','Every step of the way.','Find a trip, choose your route and select your seat.','',''],
    tracking: ['Every shipment has a clear next step.','','Use the tracking reference from your team to see the latest recorded update, from receipt to delivery.','Track my package','/track-package/'],
    routes: ['See where Encore can take you.','','Browse the routes currently available and continue straight to matching departures.','',''],
    faq: ['A few things you may want to know.','','Quick answers for planning a trip, choosing seats and tracking a package.','',''],
    about: ['A clearer way to move people and packages.','','Encore Transport is building a connected travel experience for travelers, operations teams and future cargo services.','',''],
    contact: ['Need a hand before you travel?','','Use the help answers first, then return to your trip when you are ready to review it.','Read travel help','#faq'],
    final_cta: ['Your next journey, clearly planned.','','Find a departure, choose your seat and keep every trip detail close at hand.','Book a trip','#book'],
  };
  return {
    sections: Object.fromEntries(cmsSections.map((key, order) => [key, { title: source[key][0], subtitle: source[key][1], description: source[key][2], button_label: source[key][3], button_url: source[key][4], enabled: true, order }])),
    faqs: [
      { question: 'How do I find an Encore Transport trip?', answer: 'Choose your departure city, destination, travel date and number of passengers. We’ll show the departures currently available for that search.', enabled: true },
      { question: 'Can I choose my seat before I travel?', answer: 'Yes. After choosing a departure, continue to your booking to see the seats currently available for that bus and select the seats you want.', enabled: true },
      { question: 'Can I see the route before booking?', answer: 'Yes. When route information is available, you can review the trip map and estimated travel time before continuing.', enabled: true },
      { question: 'How do I track a package?', answer: 'Open Package Tracking and enter the tracking number provided for your shipment to see its latest recorded status.', enabled: true },
    ],
  };
}

function cmsImageEditor(content, selectedKey, writable) {
  const sections = Object.keys(content.sections ?? {});
  const item = content.sections?.[selectedKey] ?? {};
  const media = state.websiteMedia ?? [];
  const library = media.length
    ? `<div class="cms-library">${media.map((asset) => `<article class="cms-library-item"><img src="${esc(publicAssetUrl(asset.image_url))}" alt="Stored website image" /><small>${esc(asset.image_path.split('/').pop())} · ${(Number(asset.size || 0) / 1024 / 1024).toFixed(1)} MB</small><div class="cms-library-actions">${writable ? `<button type="button" class="button button--ghost" data-cms-use-media="${esc(asset.image_path)}">Use in ${esc(selectedKey.replaceAll('_',' '))}</button><button type="button" class="button button--icon" data-cms-delete-media="${esc(asset.image_path)}" aria-label="Delete image">×</button>` : ''}</div></article>`).join('')}</div>`
    : '<p class="cms-library-empty">Uploaded images will appear here so you can reuse them in other sections.</p>';
  return `<article class="cms-card cms-media"><h3>Section image</h3><label>Website section<select id="cmsImageSection" ${writable?'':'disabled'}>${sections.map((key)=>`<option value="${esc(key)}" ${key===selectedKey?'selected':''}>${esc(key.replaceAll('_',' '))}</option>`).join('')}</select></label><label>Upload image<input id="cmsImageInput" type="file" accept="image/jpeg,image/png,image/webp" ${writable?'':'disabled'} /><small>JPG, PNG or WebP · maximum 5 MB · saved to the reusable image library</small></label><div id="cmsImagePreview" class="cms-image-preview">${item.image_url?`<img src="${esc(publicAssetUrl(item.image_url))}" alt="Website section preview" />`:'No image selected for this section.'}</div>${item.image_path?'<button class="button button--ghost" id="cmsRemoveImage" type="button">Remove image from this section</button>':''}<h3>Image library</h3>${library}</article>`;
}

function websiteEditor() {
  const editable = state.websiteContent?.draft ?? blankWebsiteContent();
  const sections = Object.entries(editable.sections ?? {}).sort((a,b)=>Number(a[1].order??0)-Number(b[1].order??0));
  const writable = state.permissions.includes('settings.update');
  const visibleCount = sections.filter(([, item]) => item.enabled !== false).length;
  return `<section class="admin-panel admin-panel--pad cms-editor">
    <div class="cms-editor__top">
      <div><div class="eyebrow">Website editor</div><h2>Public website content</h2><p class="module-subtitle">Manage every public section, call-to-action, FAQ, image and publication state from one workspace.</p></div>
      <div class="cms-editor__tools"><a class="button button--ghost button--with-icon" href="/website/" target="_blank" rel="noreferrer">${icon('route')}Open website</a><button class="button button--ghost button--with-icon" id="cmsReload" type="button">${icon('refresh')}Reload content</button></div>
    </div>
    <div class="cms-editor__summary"><strong>${sections.length} sections</strong><span>${visibleCount} visible on the public website</span><span>${(editable.faqs ?? []).length} FAQ entries</span><span>Draft changes are private until published.</span></div>
    <div class="cms-grid">${sections.map(([key, item], index)=>`<article class="cms-card cms-section-card"><header><div><span class="cms-section-order">${String(index + 1).padStart(2, '0')}</span><strong>${esc(key.replaceAll('_',' ').replace(/^./, c=>c.toUpperCase()))}</strong><small class="cms-image-state ${item.image_path ? 'is-set' : ''}">${item.image_path ? 'Image assigned' : 'No image assigned'}</small></div><div class="cms-card-actions"><label><input type="checkbox" data-cms-enabled="${esc(key)}" ${item.enabled===false?'':'checked'} ${writable?'':'disabled'} /> Visible</label><button type="button" class="button button--ghost cms-image-select" data-cms-image-section="${esc(key)}" ${writable?'':'disabled'}>Manage image</button><button type="button" class="button button--icon" data-cms-move="${esc(key)}" data-direction="-1" ${index===0||!writable?'disabled':''} aria-label="Move up">↑</button><button type="button" class="button button--icon" data-cms-move="${esc(key)}" data-direction="1" ${index===sections.length-1||!writable?'disabled':''} aria-label="Move down">↓</button></div></header><label>Title<input data-cms-key="${esc(key)}" data-cms-field="title" maxlength="180" value="${esc(item.title??'')}" ${writable?'':'disabled'} /></label><label>Subtitle<input data-cms-key="${esc(key)}" data-cms-field="subtitle" maxlength="240" value="${esc(item.subtitle??'')}" ${writable?'':'disabled'} /></label><label>Description<textarea data-cms-key="${esc(key)}" data-cms-field="description" maxlength="1200" rows="3" ${writable?'':'disabled'}>${esc(item.description??'')}</textarea></label><div class="cms-field-grid"><label>Button text<input data-cms-key="${esc(key)}" data-cms-field="button_label" maxlength="80" value="${esc(item.button_label??'')}" ${writable?'':'disabled'} /></label><label>Button destination<input data-cms-key="${esc(key)}" data-cms-field="button_url" maxlength="500" value="${esc(item.button_url??'')}" placeholder="/passenger/ or #destinations" ${writable?'':'disabled'} /></label></div></article>`).join('')}</div>
    ${cmsImageEditor(editable,state.cmsImageSection,writable)}
    <article class="cms-card cms-faq-editor"><header><div><h3>Frequently asked questions</h3><p>These answers appear in the public FAQ section.</p></div><button type="button" class="button button--ghost button--with-icon" id="cmsAddFaq" ${writable?'':'disabled'}>${icon('route')}Add question</button></header>${(editable.faqs??[]).map((faq,index)=>`<div class="cms-faq"><div class="cms-faq__number">${String(index + 1).padStart(2, '0')}</div><label>Question<input data-cms-faq="question" data-index="${index}" maxlength="240" value="${esc(faq.question)}" ${writable?'':'disabled'} /></label><label>Answer<textarea data-cms-faq="answer" data-index="${index}" maxlength="1200" rows="2" ${writable?'':'disabled'}>${esc(faq.answer)}</textarea></label><label class="cms-faq__visible"><input data-cms-faq-visible="${index}" type="checkbox" ${faq.enabled===false?'':'checked'} ${writable?'':'disabled'} /> Visible</label><button type="button" class="button button--icon" data-cms-faq-remove="${index}" ${writable?'':'disabled'} aria-label="Remove question">${icon('close')}</button></div>`).join('')}</article>
    <div class="cms-preview"><div class="cms-preview__heading"><strong>Content preview</strong><span>Preview of the current draft order and visibility</span></div><div class="cms-preview-grid">${sections.map(([key,item])=>`<article class="cms-preview-card ${item.enabled===false?'is-hidden':''}"><span>${esc(key.replaceAll('_',' '))}</span><h3>${esc(item.title || 'Untitled section')}</h3><p>${esc(item.description || 'No description added yet.')}</p>${item.button_label?`<b>${esc(item.button_label)} →</b>`:''}</article>`).join('')}</div></div>
    <div class="form-actions">${writable?'<button class="button button--ghost" id="cmsDiscard" type="button">Discard changes</button><button class="button button--ghost" id="cmsSave" type="button">Save draft</button><button class="button button--primary" id="cmsPublish" type="button">Publish website</button>':''}<span id="cmsMessage" aria-live="polite">${writable?'Draft and publishing access enabled.':'Read only; settings.update is required to edit.'}</span></div>
  </section>`;
}

function segmentKey(origin, destination) {
  return `${origin}::${destination}`;
}

function routeSegmentRows(editor) {
  const existing = new Map(editor.segments.map((segment) => [segmentKey(segment.origin, segment.destination), segment]));
  const rows = [];
  for (let from = 0; from < editor.stops.length; from += 1) {
    for (let to = from + 1; to < editor.stops.length; to += 1) {
      const origin = String(editor.stops[from].name ?? '').trim();
      const destination = String(editor.stops[to].name ?? '').trim();
      if (!origin || !destination) continue;
      rows.push(existing.get(segmentKey(origin, destination)) ?? {
        origin, destination, price: '', distance_meters: '', duration_seconds: '', active: true,
      });
    }
  }
  editor.segments = rows;
  return rows;
}

function routeSegmentsMarkup(segments) {
  return segments.length ? segments.map((segment, index) => `<div class="route-segment-row" data-segment-row="${index}">
    <strong>${esc(segment.origin)} → ${esc(segment.destination)}</strong>
    <input data-segment-field="price" type="number" min="0" aria-label="${esc(segment.origin)} to ${esc(segment.destination)} price" value="${esc(segment.price)}" placeholder="Price" />
    <input data-segment-field="duration_seconds" type="number" min="0" aria-label="Duration in seconds" value="${esc(segment.duration_seconds)}" placeholder="Duration (seconds)" />
    <input data-segment-field="distance_meters" type="number" min="0" aria-label="Distance in meters" value="${esc(segment.distance_meters)}" placeholder="Distance (meters)" />
    <label><input data-segment-field="active" type="checkbox" ${segment.active ? 'checked' : ''} /> Active</label>
  </div>`).join('') : '<p class="empty-state">Add named stops to configure commercial segments.</p>';
}

function routeEditorFields() {
  const editor = state.routeEditor ?? routeEditorFrom();
  const segments = routeSegmentRows(editor);
  return `
    <div class="route-editor" id="routeEditor">
      <div class="route-editor__heading"><strong>Stops</strong><span>First stop is the origin and last stop is the destination.</span></div>
      <div class="route-editor__stops">
        ${editor.stops.map((stop, index) => `<div class="route-stop-row" data-stop-row="${index}">
          <span class="route-stop-index">${index + 1}</span>
          <input data-stop-field="name" aria-label="Stop ${index + 1} name" value="${esc(stop.name)}" placeholder="Stop name" required />
          <input data-stop-field="latitude" aria-label="Stop ${index + 1} latitude" type="number" step="any" value="${esc(stop.latitude)}" placeholder="Latitude" />
          <input data-stop-field="longitude" aria-label="Stop ${index + 1} longitude" type="number" step="any" value="${esc(stop.longitude)}" placeholder="Longitude" />
          <input data-stop-field="offset_minutes" aria-label="Stop ${index + 1} offset" type="number" min="0" value="${esc(stop.offset_minutes)}" placeholder="Minutes" />
          <button type="button" class="button button--icon" data-stop-up="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move stop up">↑</button>
          <button type="button" class="button button--icon" data-stop-down="${index}" ${index === editor.stops.length - 1 ? 'disabled' : ''} aria-label="Move stop down">↓</button>
          <button type="button" class="button button--icon" data-stop-remove="${index}" ${editor.stops.length <= 2 ? 'disabled' : ''} aria-label="Remove stop">×</button>
        </div>`).join('')}
      </div>
      <button type="button" class="button button--ghost" id="addRouteStop">Add stop</button>
      <div class="route-editor__heading"><strong>Commercial segments</strong><span>Prices and timings are generated from the ordered stops.</span></div>
      <div class="route-editor__segments">${routeSegmentsMarkup(segments)}</div>
      <input type="hidden" name="stops" id="routeStopsPayload" />
      <input type="hidden" name="segments" id="routeSegmentsPayload" />
    </div>`;
}

function syncRouteEditorPayload() {
  const editor = state.routeEditor;
  if (!editor) return;
  const stops = editor.stops.map((stop) => ({
    name: String(stop.name ?? '').trim(),
    latitude: stop.latitude === '' ? null : Number(stop.latitude),
    longitude: stop.longitude === '' ? null : Number(stop.longitude),
    offset_minutes: Number(stop.offset_minutes || 0),
  }));
  const stopsPayload = document.querySelector('#routeStopsPayload');
  const segmentsPayload = document.querySelector('#routeSegmentsPayload');
  if (stopsPayload) stopsPayload.value = JSON.stringify(stops);
  if (segmentsPayload) segmentsPayload.value = JSON.stringify(editor.segments.map((segment) => ({
    ...segment,
    price: segment.price === '' ? null : Number(segment.price),
    distance_meters: segment.distance_meters === '' ? null : Number(segment.distance_meters),
    duration_seconds: segment.duration_seconds === '' ? null : Number(segment.duration_seconds),
  })));
}

function refreshRouteEditor() {
  const editor = document.querySelector('#routeEditor');
  if (!editor) return;
  editor.outerHTML = routeEditorFields();
  syncRouteEditorPayload();
  bindRouteEditor();
}

function refreshRouteSegments() {
  const container = document.querySelector('.route-editor__segments');
  if (!container || !state.routeEditor) return;
  container.innerHTML = routeSegmentsMarkup(routeSegmentRows(state.routeEditor));
  syncRouteEditorPayload();
}

function bindRouteEditor() {
  const editor = document.querySelector('#routeEditor');
  if (!editor || !state.routeEditor) return;
  syncRouteEditorPayload();
  editor.addEventListener('input', (event) => {
    const stopRow = event.target.closest('[data-stop-row]');
    const segmentRow = event.target.closest('[data-segment-row]');
    if (stopRow) {
      state.routeEditor.stops[Number(stopRow.dataset.stopRow)][event.target.dataset.stopField] = event.target.type === 'number' ? event.target.value : event.target.value;
      if (event.target.dataset.stopField === 'name') refreshRouteSegments();
    }
    if (segmentRow) state.routeEditor.segments[Number(segmentRow.dataset.segmentRow)][event.target.dataset.segmentField] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    syncRouteEditorPayload();
  });
  editor.querySelector('#addRouteStop')?.addEventListener('click', () => {
    state.routeEditor.stops.push({ name: '', latitude: '', longitude: '', offset_minutes: 0 });
    refreshRouteEditor();
  });
  editor.querySelectorAll('[data-stop-remove]').forEach((button) => button.addEventListener('click', () => {
    state.routeEditor.stops.splice(Number(button.dataset.stopRemove), 1);
    refreshRouteEditor();
  }));
  editor.querySelectorAll('[data-stop-up]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.stopUp);
    [state.routeEditor.stops[index - 1], state.routeEditor.stops[index]] = [state.routeEditor.stops[index], state.routeEditor.stops[index - 1]];
    refreshRouteEditor();
  }));
  editor.querySelectorAll('[data-stop-down]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.stopDown);
    [state.routeEditor.stops[index], state.routeEditor.stops[index + 1]] = [state.routeEditor.stops[index + 1], state.routeEditor.stops[index]];
    refreshRouteEditor();
  }));
}

function redirectLogin() {
  location.replace('/login/?return=' + encodeURIComponent('/admin/'));
}

function roleHome(user) {
  const permissions = new Set(user?.permissions ?? state.permissions);
  if (permissions.has('dashboard.view')) return '/admin/';
  if (permissions.has('driver.access')) return '/driver/';
  if (user?.active) return '/passenger/';
  return '/website/';
}

async function ensureAdmin() {
  if (!getApiToken()) {
    redirectLogin();
    return false;
  }

  try {
    const payload = await me();
    state.user = payload.user ?? payload.data?.user ?? payload;

    state.permissions = payload.permissions ?? [];
    try {
      const notifications = await listNotifications({ limit: 12 });
      state.notifications = notifications.items;
      state.notificationsUnread = notifications.unread;
    } catch { state.notifications = []; state.notificationsUnread = 0; }

    if (!state.permissions.includes('dashboard.view')) {
      state.loading = false;
      state.accessDenied = true;
      state.error = 'Your account is signed in, but it does not have permission to access Operations.';
      return false;
    }

    state.accessDenied = false;
    return true;
  } catch (error) {
    state.loading = false;

    if (error?.status === 401 || error?.status === 403) {
      redirectLogin();
      return false;
    }

    state.error = error?.message ?? 'Unable to verify your account.';
    return false;
  }
}

function sidebar() {
  const grouped = new Map();
  modules
    .filter((module) => state.permissions.includes(module.permission))
    .forEach((module) => {
      if (!grouped.has(module.group)) grouped.set(module.group, []);
      grouped.get(module.group).push(module);
    });

  return `
    <aside class="admin-sidebar ${state.sidebarCollapsed ? 'is-collapsed' : ''}">
      <a class="admin-brand" href="/website/" aria-label="Encore Transport home">
        <img class="admin-brand__logo" src="/logo.svg" alt="" aria-hidden="true">
        <div>
          <strong>encore</strong>
          <small>transport · operations</small>
        </div>
      </a>
      <button class="button admin-sidebar-toggle" type="button" data-sidebar-toggle aria-expanded="${!state.sidebarCollapsed}" aria-label="${state.sidebarCollapsed ? 'Show navigation menu' : 'Hide navigation menu'}">
        ${icon(state.sidebarCollapsed ? 'arrowRight' : 'arrowLeft')}<b>${state.sidebarCollapsed ? 'Show menu' : 'Hide menu'}</b>
      </button>
      <div class="admin-nav-tools" role="group" aria-label="Navigation section controls">
        <button class="button button--ghost button--with-icon" type="button" data-nav-expand-all>${icon('arrowRight')}<span>Expand all</span></button>
        <button class="button button--ghost button--with-icon" type="button" data-nav-collapse-all>${icon('close')}<span>Collapse all</span></button>
      </div>

      <nav class="admin-nav" aria-label="Admin operations navigation">
        ${[...grouped.entries()].map(([group, items]) => {
          const open = state.navGroups[group] !== false || items.some((item) => item.id === state.module);
          const groupId = navGroupId(group);
          const groupShort = group.trim().slice(0, 1).toUpperCase();
          return `<section class="admin-nav-group ${open ? 'is-open' : ''}" data-nav-group="${esc(group)}">
            <button class="admin-nav-group__toggle" type="button" data-nav-toggle="${esc(group)}" aria-controls="${groupId}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(group)}" title="${esc(group)}"><span class="admin-nav-group__label">${esc(group)}</span><span class="admin-nav-group__short" aria-hidden="true">${esc(groupShort)}</span><b aria-hidden="true">${open ? '−' : '+'}</b></button>
            <div class="admin-nav-group__items" id="${groupId}" ${open ? '' : 'hidden'}>
              ${items.map((module) => `<button class="admin-nav__item ${state.module === module.id ? 'admin-nav__item--active' : ''}" type="button" data-module="${esc(module.id)}" title="${esc(module.label)}" aria-label="${esc(module.label)}" ${state.module === module.id ? 'aria-current="page"' : ''} ${state.accessDenied ? 'disabled' : ''}>${icon(navIconByModule[module.id] ?? 'view')}<span class="admin-nav__label">${esc(module.label)}</span></button>`).join('')}
            </div>
          </section>`;
        }).join('')}
      </nav>

      <button class="admin-access-profile" data-module="profile" type="button" aria-label="Open profile and settings">
        <span class="admin-access-profile__avatar">
          ${profileImageSource(state.user) ? `<img src="${esc(profileImageSource(state.user))}" alt="" class="admin-access-profile__photo" data-profile-avatar-photo>` : ''}
          <span class="admin-access-profile__icon" data-profile-avatar-fallback ${profileImageSource(state.user) ? 'hidden' : ''}>${icon('user')}</span>
        </span>
        <div>
          <small>Account profile</small>
          <strong>${esc(adminDisplayName(state.user) || state.user?.role || 'Staff account')}</strong>
          <span>${esc(state.user?.role ?? 'Staff account')} · ${state.permissions.length} permissions</span>
          <span class="admin-profile-photo-action">Open profile settings</span>
        </div>
        <span class="admin-profile-photo-message" data-profile-photo-message aria-live="polite">${esc(state.profilePhotoMessage)}</span>
      </button>
    </aside>`;
}

function navGroupId(group) {
  return `admin-nav-group-${String(group).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function profileImageSource(user) {
  const candidate = user?.avatar_url ?? user?.profile_photo_url ?? user?.photo_url ?? user?.avatar ?? user?.photo_path ?? user?.driver?.photo_url ?? user?.driver?.photo_path;
  return publicAssetUrl(candidate);
}

function publicAssetUrl(candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return '';
  const value = candidate.trim();
  if (/^(storage\/)?(avatars|profiles|users|drivers|website-media|routes)\//i.test(value)) {
    return `/storage/${value.replace(/^\/?storage\//i, '')}`;
  }
  try {
    const parsed = new URL(value, location.origin);
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return value.startsWith('/') ? value : '';
  }
}

function initialsForUser(user = {}) {
  const parts = String(user.name ?? 'Staff account').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ET';
}

function profileDialogMarkup() {
  const draft = state.profilePhotoDraftUrl;
  if (state.profileDialog === 'photo') return `<dialog class="profile-dialog" aria-labelledby="photoDialogTitle"><form method="dialog" class="profile-dialog__panel" id="profilePhotoDialog"><div class="eyebrow">Profile photo</div><div class="profile-dialog__heading"><h3 id="photoDialogTitle">Change profile photo</h3><button type="submit" class="button button--icon" value="cancel" aria-label="Close">${icon('close')}</button></div><div class="photo-dialog-grid"><div class="photo-dialog-preview" style="--photo-zoom:${state.profilePhotoZoom}">${draft ? `<img src="${esc(draft)}" alt="Selected profile preview" />` : `<span>${icon('user')}</span>`}</div><label class="photo-dropzone"><input id="profilePhotoDialogInput" type="file" accept="image/jpeg,image/png,image/webp" /><span>${icon('view')}Choose a photo</span><small>JPG, PNG or WebP · maximum 5 MB</small></label></div><label class="photo-zoom"><span>Adjust framing</span><input id="profilePhotoZoom" type="range" min="1" max="2" step="0.05" value="${state.profilePhotoZoom}" ${draft ? '' : 'disabled'} /></label><div class="profile-dialog__actions"><button type="submit" class="button button--ghost" value="cancel">Cancel</button><button class="button button--primary" id="applyProfilePhoto" type="button" ${draft ? '' : 'disabled'}>${icon('save')}Save photo</button></div><p id="profilePhotoDialogMessage" class="profile-dialog__message" aria-live="polite"></p></form></dialog>`;
  if (state.profileDialog === 'delete') return `<dialog class="profile-dialog profile-dialog--danger" aria-labelledby="deleteDialogTitle"><form method="dialog" class="profile-dialog__panel" id="deleteProfileDialog"><div class="profile-danger-icon">${icon('close')}</div><div class="profile-dialog__heading"><h3 id="deleteDialogTitle">Delete account?</h3><button type="submit" class="button button--icon" value="cancel" aria-label="Close">${icon('close')}</button></div><p>This action cannot be undone. Historical bookings will be preserved and personal data will be anonymized where required.</p><label><span>Type DELETE to confirm</span><input id="deleteConfirmation" autocomplete="off" placeholder="DELETE" /></label><div class="profile-dialog__actions"><button type="submit" class="button button--ghost" value="cancel">Cancel</button><button class="button button--danger" id="confirmDeleteProfile" type="button" disabled>Delete account</button></div><p id="deleteProfileMessage" class="profile-dialog__message" aria-live="polite"></p></form></dialog>`;
  if (state.profileDialog === 'saved') return `<dialog class="profile-dialog profile-dialog--success" aria-labelledby="savedDialogTitle"><form method="dialog" class="profile-dialog__panel"><div class="profile-success-icon">${icon('save')}</div><h3 id="savedDialogTitle">Profile updated</h3><p>Your information was saved successfully.</p><button type="submit" class="button button--primary" value="cancel">Done</button></form></dialog>`;
  return '';
}

function accessRoleList(roles, selectedIds = [], disabled = false) {
  return `<label class="access-search"><span>Find a role</span><input type="search" placeholder="Search roles" data-access-filter="roles" /></label><div class="access-list__items" data-access-list="roles">${roles.map((role) => {
    const selected = selectedIds.map(Number).includes(Number(role.id));
    return `<div class="access-row" data-access-item="${esc(`${role.label ?? role.name} ${role.name}`.toLowerCase())}"><div><strong>${esc(role.label ?? role.name)}</strong><small>${esc(role.name)}</small></div><button type="button" class="access-toggle ${selected ? 'is-on' : ''}" data-user-role="${esc(role.id)}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>${selected ? 'Assigned' : 'Not assigned'}</button></div>`;
  }).join('')}</div>`;
}

function directPermissionList(permissions, directGrants = {}, assignedRoleIds = [], roles = [], disabled = false) {
  const assigned = roles.filter((role) => assignedRoleIds.map(Number).includes(Number(role.id)));
  return `<label class="access-search"><span>Find a permission</span><input type="search" placeholder="Search permissions" data-access-filter="permissions" /></label><div class="access-list__items" data-access-list="permissions">${permissions.map((permission) => {
    const value = directGrants[permission.key] == null ? 'inherit' : directGrants[permission.key] ? 'allow' : 'deny';
    const providedByRole = assigned.some((role) => (role.permissions ?? []).some((item) => item.key === permission.key));
    return `<div class="access-row" data-access-item="${esc(`${permission.label ?? permission.key} ${permission.key} ${permission.resource ?? ''}`.toLowerCase())}"><div><strong>${esc(permission.label ?? permission.key)}</strong><small>${esc(permission.resource ?? permission.key)} · ${providedByRole ? 'Granted by assigned role' : 'No assigned role grants this'}</small></div><select aria-label="${esc(permission.label ?? permission.key)} access" data-user-permission="${esc(permission.key)}" ${disabled ? 'disabled' : ''}><option value="inherit" ${value === 'inherit' ? 'selected' : ''}>Inherit</option><option value="allow" ${value === 'allow' ? 'selected' : ''}>Allow</option><option value="deny" ${value === 'deny' ? 'selected' : ''}>Deny</option></select></div>`;
  }).join('')}</div>`;
}

function rolePermissionList(permissions, assignedPermissionKeys = []) {
  const assigned = new Set(assignedPermissionKeys);
  return `<label class="access-search"><span>Find a permission</span><input type="search" placeholder="Search permissions" data-access-filter="role-permissions" /></label><div class="access-list__items" data-access-list="role-permissions">${permissions.map((permission) => {
    const selected = assigned.has(permission.key);
    return `<div class="access-row" data-access-item="${esc(`${permission.label ?? permission.key} ${permission.key} ${permission.resource ?? ''}`.toLowerCase())}"><div><strong>${esc(permission.label ?? permission.key)}</strong><small>${esc(permission.resource ?? permission.key)}</small></div><button type="button" class="access-toggle ${selected ? 'is-on' : ''}" data-role-permission="${esc(permission.key)}" aria-pressed="${selected}">${selected ? 'Enabled' : 'Disabled'}</button></div>`;
  }).join('')}</div>`;
}

function liveMapPanel() {
  const trips = state.dashboard?.trips ?? [];

  const trip = trips.find((item) =>
    ['boarding', 'in_progress', 'scheduled'].includes(item.status)
  ) ?? trips[0];

  if (!trip) {
    return `
      <section class="admin-panel admin-panel--pad admin-map-panel">
        <div class="admin-map-panel__head">
          <div>
            <div class="eyebrow">Live route context</div>
            <h2>No trip available for mapping.</h2>
          </div>
        </div>
      </section>`;
  }

  return `
    <section class="admin-panel admin-panel--pad admin-map-panel">
      <div class="admin-map-panel__head">
        <div>
          <div class="eyebrow">Live route context</div>
          <h2>${esc(trip.route?.origin ?? '')} → ${esc(trip.route?.destination ?? '')}</h2>
          <small>Vehicle position appears only when the assigned driver has sent authorized GPS data.</small>
        </div>

        <span class="badge badge--neutral">${esc(trip.status ?? '')}</span>
      </div>

      <div
        id="adminLiveMap"
        class="admin-live-map"
        data-trip-id="${esc(trip.id)}"
        data-origin="${esc(trip.route?.origin ?? '')}"
        data-destination="${esc(trip.route?.destination ?? '')}"
        aria-label="Operations route map"></div>
    </section>`;
}

function userDetailPanel() {
  const detail = state.userDetail;
  if (!detail) return '';
  const user = detail.user ?? { name: 'Selected account' };
  const tabs = [
    ['general', 'General'], ['profile', 'Profile'], ['bookings', 'Bookings'], ['tickets', 'Tickets'],
    ['packages', 'Authorized packages'], ['activity', 'Activity'], ['permissions', 'Permissions'],
  ];
  const body = state.userDetailLoading
    ? '<div class="admin-loading-state admin-loading-state--inline" role="status"><img src="/assets/media/encore-loader.gif" alt="" width="92" height="92" /><span>Loading selected account…</span></div>'
    : state.userDetailError
      ? `<div class="admin-error-state" role="alert">${esc(state.userDetailError)}</div>`
      : detail.tab === 'general' || detail.tab === 'profile'
        ? `<div class="user-detail-grid"><article><span>Name</span><strong>${esc(user.name)}</strong></article><article><span>Email</span><strong>${esc(user.email)}</strong></article><article><span>Phone</span><strong>${esc(user.phone || 'Not provided')}</strong></article><article><span>Status</span><strong>${user.active ? 'Active' : 'Disabled'}</strong></article><article><span>Legacy role</span><strong>${esc(user.role || '—')}</strong></article><article><span>Registered</span><strong>${esc(String(user.created_at ?? '').slice(0, 10) || '—')}</strong></article>${detail.tab === 'profile' ? `<article class="user-detail-grid__wide"><span>Assigned roles</span><strong>${(user.roles ?? []).map((role) => esc(role.label ?? role.name)).join(', ') || 'None'}</strong></article><article class="user-detail-grid__wide"><span>Direct permission overrides</span><strong>${(user.direct_permissions ?? []).map((permission) => esc(permission.key)).join(', ') || 'None'}</strong></article>` : ''}</div>`
        : detail.tab === 'permissions'
          ? `<div class="user-detail-permissions"><section><h4>Roles</h4><p>${(detail.data.roles ?? []).map((role) => esc(role.label ?? role.name)).join(', ') || 'None'}</p></section><section><h4>Direct grants/denials</h4><p>${(detail.data.direct ?? []).map((permission) => `${esc(permission.key)} (${permission.pivot?.granted ? 'allow' : 'deny'})`).join(', ') || 'None'}</p></section><section><h4>Effective permissions</h4><p>${(detail.data.effective ?? []).map((permission) => esc(typeof permission === 'string' ? permission : permission.key ?? '')).join(', ') || 'None'}</p></section></div>`
          : `<div class="user-detail-table-wrap"><table class="table admin-table"><thead><tr>${(detail.tab === 'bookings' ? ['Reference', 'Status', 'Trip', 'Ticket', 'Payment'] : detail.tab === 'tickets' ? ['Ticket', 'Lifecycle', 'Booking', 'Payment', 'Boarding'] : detail.tab === 'packages' ? ['Reference', 'Status', 'Route', 'Authorized'] : ['Action', 'Subject', 'Date']).map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${(detail.data ?? []).length ? (detail.data ?? []).map((item) => `<tr>${detail.tab === 'bookings' ? `<td>${esc(item.reference)}</td><td>${esc(item.status)}</td><td>${esc(item.trip?.route ?? '—')}</td><td>${esc(item.ticket_status ?? '—')}</td><td>${esc(item.payment_status ?? '—')}</td>` : detail.tab === 'tickets' ? `<td>${esc(item.public_id)}</td><td>${esc(item.lifecycle_status)}</td><td>${esc(item.booking_reference ?? '—')}</td><td>${esc(item.payment_status ?? '—')}</td><td>${esc(item.boarding_status)}</td>` : detail.tab === 'packages' ? `<td>${esc(item.reference ?? '—')}</td><td>${esc(item.status ?? '—')}</td><td>${esc(item.route ?? '—')}</td><td>${esc(String(item.authorized_at ?? '').slice(0, 10) || '—')}</td>` : `<td>${esc(item.action)}</td><td>${esc(item.subject_type ? `${item.subject_type}#${item.subject_id ?? ''}` : '—')}</td><td>${esc(String(item.created_at ?? '').slice(0, 19) || '—')}</td>`}</tr>`).join('') : `<tr><td colspan="5">No records found.</td></tr>`}</tbody></table></div>`;
  const meta = state.userDetailMeta;
  const paginated = !['general', 'profile', 'permissions'].includes(detail.tab);
  return `<section class="admin-panel admin-panel--pad user-detail-panel" id="userDetailPanel" aria-busy="${state.userDetailLoading ? 'true' : 'false'}"><div class="module-view__header"><div><div class="eyebrow">Account detail</div><h2>${esc(user.name)}</h2><p class="module-subtitle">Each tab loads its own authorized data source.</p></div><button class="button button--ghost" type="button" id="closeUserDetail">Close detail</button></div><nav class="user-detail-tabs" role="tablist" aria-label="User detail tabs">${tabs.map(([id, label]) => `<button type="button" role="tab" data-user-detail-tab="${id}" class="button button--tab ${detail.tab === id ? 'is-active' : ''}" aria-selected="${detail.tab === id}" ${state.userDetailLoading || !detail.user?.id ? 'disabled' : ''}>${label}</button>`).join('')}</nav>${body}${paginated ? `<footer class="server-pagination"><span>Showing ${(detail.data ?? []).length} of ${meta.total ?? 0}</span><div><button class="button button--ghost" type="button" data-user-detail-page="prev" ${(meta.current_page ?? 1) <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${meta.current_page ?? 1} of ${meta.last_page ?? 1}</span><button class="button button--ghost" type="button" data-user-detail-page="next" ${(meta.current_page ?? 1) >= (meta.last_page ?? 1) ? 'disabled' : ''}>Next</button></div></footer>` : ''}</section>`;
}

function userDirectoryFilters() {
  return state.module === 'customers'
    ? { ...state.userFilters, role: 'passenger' }
    : state.userFilters;
}

function content() {
  if (state.loading) {
    return `
      <section class="admin-panel admin-panel--pad admin-loading-state" aria-live="polite">
        <img class="admin-loading-state__brand" src="/assets/media/encore-loader.gif" alt="" width="112" height="112" />
        <div>
          <h2>Loading Operations…</h2>
          <p>Checking your access and retrieving current data.</p>
        </div>
      </section>`;
  }

  if (state.accessDenied) {
    return `
      <section class="admin-panel admin-panel--pad admin-access-denied">
        <div class="eyebrow">Access denied</div>
        <h2>Operations is restricted to administrative accounts.</h2>
        <p>${esc(state.error)}</p>

        <div class="admin-access-denied__actions">
          <a class="button button--primary" href="${roleHome(state.user)}">Go to my area</a>
          <button type="button" class="button button--ghost" id="logout">Sign out</button>
        </div>
      </section>`;
  }

  if (state.error) {
    return `
      <section class="admin-panel admin-panel--pad admin-error-state">
        <div class="eyebrow">Unable to load</div>
        <h2>Operations data could not be loaded.</h2>
        <p>${esc(state.error)}</p>
        <button type="button" class="button button--primary" id="retry">Retry</button>
      </section>`;
  }

  const dashboard = state.dashboard ?? {};

  if (state.module === 'dashboard') {
    return `${liveMapPanel()}${dashboardView(dashboard)}`;
  }

  if (state.module === 'trips') {
    const permissions = new Set(state.permissions);
    const canCreate = permissions.has('trips.create') && permissions.has('trips.assign_driver') && permissions.has('trips.assign_vehicle');
    const canEdit = permissions.has('trips.update') && permissions.has('trips.assign_driver') && permissions.has('trips.assign_vehicle');
    const canCancel = permissions.has('trips.cancel');
    const trip = state.tripForm ?? {};
    const form = state.tripFormOpen ? `
      <form id="tripForm" class="premium-form-grid fleet-form">
        <div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.tripEditingId ? 'Update scheduled trip' : 'Create scheduled trip'}</strong><span>Choose an active route, operational vehicle and available driver.</span></div></div>
        <label><span>Route</span><select name="transport_route_id" required><option value="">Select route</option>${(dashboard.routes ?? []).map((route) => `<option value="${esc(route.id)}" ${String(trip.transport_route_id) === String(route.id) ? 'selected' : ''}>${esc(route.origin)} → ${esc(route.destination)}</option>`).join('')}</select></label>
        <label><span>Vehicle</span><select name="bus_id" required><option value="">Select operational vehicle</option>${(dashboard.buses ?? []).filter((bus) => bus.status === 'operational').map((bus) => `<option value="${esc(bus.id)}" ${String(trip.bus_id) === String(bus.id) ? 'selected' : ''}>${esc(bus.code)} · ${esc(bus.plate)} · ${esc(bus.capacity)} seats</option>`).join('')}</select></label>
        <label><span>Driver</span><select name="driver_id" required><option value="">Select available driver</option>${(dashboard.drivers ?? []).filter((driver) => ['active', 'upcoming'].includes(driver.status)).map((driver) => `<option value="${esc(driver.id)}" ${String(trip.driver_id) === String(driver.id) ? 'selected' : ''}>${esc(driver.name)} · ${esc(driver.status)}</option>`).join('')}</select></label>
        <label><span>Departure date</span><input name="departure_date" type="date" min="${new Date().toISOString().slice(0, 10)}" required value="${esc(String(trip.departure_date ?? '').slice(0, 10))}" /></label>
        <label><span>Departure time</span><input name="departure_time" type="time" required value="${esc(String(trip.departure_time ?? '').slice(0, 5))}" /></label>
        <label><span>Arrival time</span><input name="arrival_time" type="time" required value="${esc(String(trip.arrival_time ?? '').slice(0, 5))}" /></label>
        <label><span>Price per passenger</span><input name="price_per_passenger" type="number" min="0" required value="${esc(trip.price_per_passenger ?? '')}" /></label>
        <div class="form-actions"><button class="button button--primary" type="submit">${state.tripEditingId ? 'Update trip' : 'Create trip'}</button><button class="button button--ghost" id="cancelTripForm" type="button">Cancel</button></div>
        <div id="tripMessage" aria-live="polite"></div>
      </form>` : '';
    const rows = (dashboard.trips ?? []).map((trip) => [
        trip.route?.origin && trip.route?.destination
          ? `${trip.route.origin} → ${trip.route.destination}`
          : '—',
        String(trip.departure_date ?? '').slice(0, 10),
        trip.departure_time,
        trip.bus?.code,
        trip.driver?.name,
        trip.status,
        ...((canEdit || canCancel) ? [{ html: `<div class="table-actions">${canEdit && trip.status === 'scheduled' ? `<button class="button button--icon" data-edit-trip="${esc(trip.id)}" type="button" aria-label="Edit trip">${icon('edit')}</button>` : ''}${canCancel && trip.status === 'scheduled' ? `<button class="button button--icon" data-cancel-trip="${esc(trip.id)}" type="button" aria-label="Cancel trip">${icon('archive')}</button>` : ''}</div>` }] : []),
      ]);
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header"><div><div class="eyebrow">Service planning</div><h2>Trips</h2><p class="module-subtitle">Publish scheduled departures for passenger booking.</p></div>${canCreate ? `<button class="button button--primary" id="addTrip" type="button">Add trip</button>` : ''}</div>
        ${form}
      </section>
      ${table('Scheduled and completed trips', ['Route', 'Date', 'Departure', 'Bus', 'Driver', 'Status', ...((canEdit || canCancel) ? ['Actions'] : [])], rows, { id: 'admin-trips' })}`;
  }

  if (state.module === 'bookings') {
    return `${table(
      'Bookings',
      ['Reference', 'Trip', 'Departure', 'Passenger', 'Passengers', 'Seats', 'Status', 'Total', 'Actions'],
      (dashboard.bookings ?? []).map((booking) => [
        booking.reference,
        booking.trip?.route?.origin && booking.trip?.route?.destination ? `${booking.trip.route.origin} → ${booking.trip.route.destination}` : '—',
        [String(booking.trip?.departure_date ?? '').slice(0, 10), String(booking.trip?.departure_time ?? '').slice(0, 5)].filter(Boolean).join(' · ') || '—',
        booking.passenger_name,
        booking.passengers_count ?? 0,
        Array.isArray(booking.seat_numbers) && booking.seat_numbers.length ? booking.seat_numbers.join(', ') : '—',
        booking.status,
        booking.total_amount,
        { html: `<div class="table-actions"><button class="button button--icon" data-view-booking="${esc(booking.id)}" type="button" aria-label="View booking ${esc(booking.reference)}" title="View booking details">${icon('view')}</button>${['draft', 'pending_payment'].includes(booking.status) ? `<button class="button button--ghost" data-cancel-booking="${esc(booking.id)}" type="button">Cancel unpaid</button>` : ''}</div>` },
      ]),
    )}<dialog class="booking-details-dialog" id="bookingDetailsDialog" aria-label="Booking details"><div id="bookingDetailsContent"></div></dialog>`;
  }

  if (state.module === 'tickets') {
    const filter = state.ticketFilters;
    const meta = state.ticketMeta;
    const filters = `<form class="admin-filter-bar" id="ticketFilters"><label><span>Search ticket</span><input name="q" type="search" placeholder="Ticket, booking or email" value="${esc(filter.q)}"></label><label><span>Lifecycle</span><select name="lifecycle"><option value="">All states</option>${['valid','used','not_used','no_show','expired','cancelled','refunded'].map((status) => `<option value="${status}" ${filter.lifecycle === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select></label><label><span>Stored status</span><select name="status"><option value="">All stored statuses</option>${['active','used','no_show','expired','cancelled','refunded'].map((status) => `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('')}</select></label><button class="button button--primary button--with-icon" type="submit">${icon('filter')}<span>Filter tickets</span></button><button class="button button--ghost button--with-icon" id="clearTicketFilters" type="button">${icon('close')}<span>Clear</span></button></form>`;
    const rows = state.tickets.map((ticket) => [ticket.public_id, ticket.lifecycle_status, ticket.booking_reference ?? '—', ticket.payment_status ?? '—', ticket.boarding_status, { html: `<div class="table-actions"><button class="button button--icon" data-view-ticket="${esc(ticket.id)}" type="button" aria-label="View ticket">${icon('view')}</button>${ticket.status === 'active' ? `<button class="button button--ghost" data-ticket-transition="${esc(ticket.id)}" data-ticket-status="no_show" type="button">No show</button>` : ''}</div>` }]);
    const detail = state.ticketDetail ? `<section class="admin-panel admin-panel--pad user-detail-panel"><div class="module-view__header"><div><div class="eyebrow">Ticket detail</div><h2>${esc(state.ticketDetail.public_id)}</h2><p class="module-subtitle">Reservation, payment, ticket and boarding states remain separate.</p></div><button class="button button--ghost" id="closeTicketDetail" type="button">Close detail</button></div><div class="user-detail-grid"><article><span>Ticket state</span><strong>${esc(state.ticketDetail.status)}</strong></article><article><span>Lifecycle</span><strong>${esc(state.ticketDetail.lifecycle_status)}</strong></article><article><span>Payment</span><strong>${esc(state.ticketDetail.payment_status ?? '—')}</strong></article><article><span>Reservation</span><strong>${esc(state.ticketDetail.booking_status ?? '—')}</strong></article><article><span>Boarding</span><strong>${esc(state.ticketDetail.boarding_status)}</strong></article><article><span>Trip</span><strong>${esc(state.ticketDetail.trip?.route ?? '—')}</strong></article></div><h3>History</h3><div class="user-detail-table-wrap"><table class="table admin-table"><thead><tr><th>Action</th><th>Date</th><th>Context</th></tr></thead><tbody>${(state.ticketDetail.history ?? []).map((entry) => `<tr><td>${esc(entry.action)}</td><td>${esc(String(entry.created_at ?? '').slice(0, 19))}</td><td>${esc(JSON.stringify(entry.context ?? {}))}</td></tr>`).join('') || '<tr><td colspan="3">No history recorded.</td></tr>'}</tbody></table></div></section>` : '';
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Operations control</div><h2>Tickets</h2><p class="module-subtitle">Manage valid, used, not used, no-show, expired, cancelled and refunded states without inferring boarding from trip completion.</p></div><span class="badge badge--neutral">${meta.total} tickets</span></div>${filters}</section>${table('Ticket lifecycle', ['Ticket', 'Lifecycle', 'Booking', 'Payment', 'Boarding', 'Actions'], rows, { id: 'admin-tickets', serverPaginated: true })}<footer class="server-pagination"><span>Showing ${state.tickets.length} of ${meta.total}</span><div><button class="button button--ghost" type="button" data-tickets-page="prev" ${meta.current_page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${meta.current_page} of ${meta.last_page}</span><button class="button button--ghost" type="button" data-tickets-page="next" ${meta.current_page >= meta.last_page ? 'disabled' : ''}>Next</button></div></footer>${detail}`;
  }

  if (state.module === 'vehicles') {
    const editing = state.vehicles.find((bus) => String(bus.id) === String(state.vehicleEditingId));
    const seats = state.vehicleSeatLayout ?? [];
    const vehicleDraft = state.vehicleDraft ?? {};
    const positionCount = String(vehicleDraft.positionsPerRow ?? '4');
    const seatEditor = `<section class="vehicle-layout-editor"><div class="vehicle-layout-heading"><div><strong>Seat layout</strong><span>Set each seat’s real number, row and position. Capacity follows the seats below.</span></div><div class="vehicle-layout-tools"><label>Positions per row<select id="vehiclePositionsPerRow"><option value="2" ${positionCount==='2'?'selected':''}>2</option><option value="3" ${positionCount==='3'?'selected':''}>3</option><option value="4" ${positionCount==='4'?'selected':''}>4</option><option value="5" ${positionCount==='5'?'selected':''}>5</option><option value="6" ${positionCount==='6'?'selected':''}>6</option></select></label><button type="button" class="button button--ghost" id="generateVehicleLayout">Generate numbers</button><button type="button" class="button button--ghost" id="addVehicleSeat">Add seat</button></div></div><div class="vehicle-seat-grid">${seats.length ? seats.map((seat,index)=>`<article class="vehicle-seat-item"><label>Seat<input data-vehicle-seat="${index}" data-seat-field="seat_number" value="${esc(seat.seat_number)}" maxlength="16" required /></label><label>Row<input data-vehicle-seat="${index}" data-seat-field="row_number" type="number" min="1" value="${esc(seat.row_number ?? 1)}" required /></label><label>Position<input data-vehicle-seat="${index}" data-seat-field="position_index" type="number" min="1" value="${esc(seat.position_index ?? index+1)}" required /></label><label>Class<select data-vehicle-seat="${index}" data-seat-field="seat_class"><option value="standard" ${seat.seat_class==='standard'?'selected':''}>Standard</option><option value="premium" ${seat.seat_class==='premium'?'selected':''}>Premium</option><option value="accessible" ${seat.seat_class==='accessible'?'selected':''}>Accessible</option></select></label><label class="vehicle-seat-flag"><input data-vehicle-seat="${index}" data-seat-field="active" type="checkbox" ${seat.active===false?'':'checked'} /> Active</label><label class="vehicle-seat-flag"><input data-vehicle-seat="${index}" data-seat-field="window" type="checkbox" ${seat.window?'checked':''} /> Window</label><label class="vehicle-seat-flag"><input data-vehicle-seat="${index}" data-seat-field="aisle" type="checkbox" ${seat.aisle?'checked':''} /> Aisle</label><label class="vehicle-seat-flag"><input data-vehicle-seat="${index}" data-seat-field="accessible_flag" type="checkbox" ${seat.accessible?'checked':''} /> Accessible</label><label class="vehicle-seat-flag"><input data-vehicle-seat="${index}" data-seat-field="blocked" type="checkbox" ${seat.blocked?'checked':''} /> Blocked</label><button type="button" class="button button--icon" data-remove-vehicle-seat="${index}" aria-label="Remove seat ${esc(seat.seat_number)}">×</button></article>`).join('') : '<p class="vehicle-layout-empty">Generate sequential seat numbers or add seats one by one to describe this vehicle.</p>'}</div><span class="vehicle-seat-count">${seats.length} configured seats</span></section>`;
    return `<section class="admin-panel admin-panel--pad fleet-module"><div class="module-view__header"><div><div class="eyebrow">Fleet registry</div><h2>Vehicles</h2><p class="module-subtitle">Maintain each vehicle’s real capacity, seat positions and operational status.</p></div><span class="badge badge--neutral">${state.vehicles.length} records</span></div><form id="vehicleForm" class="premium-form-grid fleet-form"><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${editing ? 'Update vehicle and layout' : 'Add vehicle to fleet'}</strong><span>Generate a starting layout, then adjust rows, positions and seat features to match the actual coach.</span></div></div><label><span>Vehicle code</span><input name="code" required maxlength="50" value="${esc(vehicleDraft.code ?? editing?.code ?? '')}" placeholder="BUS-001" /></label><label><span>Plate</span><input name="plate" required maxlength="50" value="${esc(vehicleDraft.plate ?? editing?.plate ?? '')}" placeholder="Registration plate" /></label><label><span>Capacity</span><input name="capacity" id="vehicleCapacity" type="number" min="1" max="500" ${editing ? 'readonly' : ''} required value="${editing ? seats.length : esc(vehicleDraft.capacity ?? '')}" /></label><label><span>Status</span><select name="status"><option value="operational" ${(vehicleDraft.status ?? editing?.status ?? 'operational')==='operational'?'selected':''}>Operational</option><option value="maintenance" ${(vehicleDraft.status ?? editing?.status)==='maintenance'?'selected':''}>Maintenance</option><option value="out_of_service" ${(vehicleDraft.status ?? editing?.status)==='out_of_service'?'selected':''}>Out of service</option></select></label>${seatEditor}<div class="form-actions"><button class="button button--primary button--with-icon" type="submit">${icon('save')}${editing ? 'Save vehicle changes' : 'Save vehicle'}</button>${editing ? '<button class="button button--ghost" id="cancelVehicleEdit" type="button">Cancel</button>' : ''}</div><div id="vehicleMessage" aria-live="polite"></div></form></section>${table('Vehicles',['Code','Plate','Capacity','Status','Actions'],state.vehicles.map((bus)=>[bus.code,bus.plate,bus.capacity,bus.status,{html:`<button class="button button--icon" data-edit-vehicle="${esc(bus.id)}" type="button" aria-label="Edit vehicle ${esc(bus.code)}">${icon('edit')}</button>`}]))}`;
  }

  if (state.module === 'drivers') {
    const form = state.driverFormOpen ? `<form id="driverForm" class="premium-form-grid fleet-form"><input type="hidden" name="id" value="${esc(state.driverEditingId ?? '')}" /><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.driverEditingId ? 'Update driver profile' : 'Create a driver profile'}</strong><span>Keep identity and operational status up to date.</span></div></div><label><span>Name</span><input name="name" required maxlength="150" placeholder="Full name" /></label><label><span>License number</span><input name="license_number" required maxlength="80" placeholder="Driver license or internal ID" /></label><label><span>Status</span><select name="status"><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option></select></label><label class="file-field"><span>Profile photo</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG or WebP · maximum 5 MB</small></label><div class="form-actions"><button class="button button--primary button--with-icon" type="submit">${icon('save')}${state.driverEditingId ? 'Update driver' : 'Save driver'}</button><button class="button button--ghost button--with-icon" id="cancelDriverForm" type="button">${icon('close')}Cancel</button></div><div id="driverMessage" aria-live="polite"></div></form>` : '';
    return `<section class="admin-panel admin-panel--pad fleet-module"><div class="module-view__header"><div><div class="eyebrow">Fleet registry</div><h2>Drivers</h2><p class="module-subtitle">Manage profiles, status and identity documents from one place.</p></div><button class="button button--primary button--with-icon" id="addDriver" type="button">${icon('plus')}Add driver</button></div>${form}</section>${table(
      'Drivers',
      ['Photo', 'Name', 'License', 'Status', 'Actions'],
      state.drivers.map((driver) => [
        driver.photo_path ? { html: `<img class="admin-driver-photo" src="/storage/${esc(driver.photo_path)}" alt="${esc(driver.name)}" loading="lazy" />` } : '—',
        driver.name,
        driver.license_number,
        driver.status,
        { html: `<div class="table-actions"><button class="button button--icon" title="Edit driver" aria-label="Edit driver" data-edit-driver="${esc(driver.id)}" type="button">${icon('edit')}</button><button class="button button--icon" title="Deactivate driver" aria-label="Deactivate driver" data-deactivate-driver="${esc(driver.id)}" type="button" ${driver.status === 'inactive' ? 'disabled' : ''}>${icon('archive')}</button></div>` },
      ]),
    )}`;
  }

  if (state.module === 'routes') {
    const selectedRoute = state.routes.find((route) => String(route.id) === String(state.routeEditingId));
    const routeImage = state.routeFormOpen && state.routeEditingId ? `<label class="file-field"><span>Website card image</span><input name="route_image" id="routeImageInput" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG or WebP · maximum 5 MB</small></label><div class="route-image-preview" id="routeImagePreview">${selectedRoute?.image_url ? `<img src="${esc(publicAssetUrl(selectedRoute.image_url))}" alt="Current image for ${esc(selectedRoute.origin)} to ${esc(selectedRoute.destination)}" />` : '<span>Public route card graphic fallback</span>'}</div>${selectedRoute?.image_url ? '<button type="button" class="button button--ghost" id="removeRouteImage">Remove route image</button>' : ''}` : '';
    const form = state.routeFormOpen ? `<form id="routeForm" class="premium-form-grid fleet-form"><input type="hidden" name="id" value="${esc(state.routeEditingId ?? '')}" /><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.routeEditingId ? 'Update route' : 'Create a route'}</strong><span>Define the service corridor, ordered stops and commercial fares.</span></div></div><label><span>Origin terminal</span><input name="origin" required maxlength="150" placeholder="Starting terminal" /></label><label><span>Destination terminal</span><input name="destination" required maxlength="150" placeholder="Destination terminal" /></label><label><span>Distance (km)</span><input name="distance_km" type="number" min="0" required placeholder="0" /></label>${routeEditorFields()}${routeImage}<label><span>Published</span><select name="active"><option value="1">Active</option><option value="0">Inactive</option></select></label><div class="form-actions"><button type="submit" class="button button--primary button--with-icon">${icon('save')}${state.routeEditingId ? 'Update route' : 'Save route'}</button> <button type="button" class="button button--ghost button--with-icon" id="cancelRoute">${icon('close')}Cancel</button></div><div id="routeMessage" aria-live="polite"></div></form>` : '';
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header">
          <div><div class="eyebrow">Network configuration</div><h2>Routes</h2></div>
          <button class="button button--primary button--with-icon" id="addRoute" type="button">${icon('plus')}Add route</button>
        </div>
        ${form}
      </section>
      ${table('Saved routes', ['Origin', 'Destination', 'Distance', 'Stops', 'Active', 'Actions'], state.routes.map((route) => [
        route.origin, route.destination, `${route.distance_km ?? 0} km`, route.stops?.length ?? 0,
        route.active ? 'Yes' : 'No', { html: `<div class="table-actions"><button type="button" class="button button--icon" title="Edit route" aria-label="Edit route" data-edit-route="${esc(route.id)}">${icon('edit')}</button><button type="button" class="button button--icon" title="Deactivate route" aria-label="Deactivate route" data-deactivate-route="${esc(route.id)}" ${route.active ? '' : 'disabled'}>${icon('archive')}</button></div>` },
      ]), { id: 'admin-routes' })}`;
  }

  if (state.module === 'incidents') {
    return incidentsView(state.incidents, state.permissions.includes('incidents.update'));
  }

  if (state.module === 'schedules') {
    const canManage = state.permissions.includes('schedules.manage');
    const schedule = state.scheduleForm ?? {};
    const form = state.scheduleFormOpen && canManage ? `
      <form id="scheduleForm" class="premium-form-grid fleet-form">
        <div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.scheduleEditingId ? 'Update driver schedule' : 'Create driver schedule'}</strong><span>Prevent overlapping assignments for each driver.</span></div></div>
        <label><span>Driver</span><select name="driver_id" required><option value="">Select driver</option>${(state.dashboard?.drivers ?? []).map((driver) => `<option value="${esc(driver.id)}" ${String(schedule.driver_id) === String(driver.id) ? 'selected' : ''}>${esc(driver.name)}</option>`).join('')}</select></label>
        <label><span>Vehicle</span><select name="bus_id"><option value="">No vehicle assigned</option>${(state.dashboard?.buses ?? []).map((bus) => `<option value="${esc(bus.id)}" ${String(schedule.bus_id ?? '') === String(bus.id) ? 'selected' : ''}>${esc(bus.code)} · ${esc(bus.plate)}</option>`).join('')}</select></label>
        <label><span>Trip</span><select name="trip_id"><option value="">No trip linked</option>${(state.dashboard?.trips ?? []).map((trip) => `<option value="${esc(trip.id)}" ${String(schedule.trip_id ?? '') === String(trip.id) ? 'selected' : ''}>${esc(trip.route?.origin ?? '')} → ${esc(trip.route?.destination ?? '')} · ${esc(String(trip.departure_date ?? '').slice(0, 10))}</option>`).join('')}</select></label>
        <label><span>Work date</span><input name="work_date" type="date" required value="${esc(schedule.work_date ?? '')}" /></label>
        <label><span>Starts at</span><input name="starts_at" type="time" required value="${esc(schedule.starts_at ?? '')}" /></label>
        <label><span>Ends at</span><input name="ends_at" type="time" required value="${esc(schedule.ends_at ?? '')}" /></label>
        <label><span>Status</span><select name="status"><option value="scheduled" ${schedule.status === 'scheduled' ? 'selected' : ''}>Scheduled</option><option value="active" ${schedule.status === 'active' ? 'selected' : ''}>Active</option><option value="changed" ${schedule.status === 'changed' ? 'selected' : ''}>Changed</option><option value="cancelled" ${schedule.status === 'cancelled' ? 'selected' : ''}>Cancelled</option></select></label>
        <label class="form-span-2"><span>Notes</span><textarea name="notes" maxlength="2000">${esc(schedule.notes ?? '')}</textarea></label>
        <div class="form-actions"><button class="button button--primary" type="submit">${state.scheduleEditingId ? 'Update schedule' : 'Save schedule'}</button><button class="button button--ghost" id="cancelSchedule" type="button">Cancel</button></div>
        <div id="scheduleMessage" aria-live="polite"></div>
      </form>` : '';
    const rows = state.schedules.map((schedule) => [
        String(schedule.work_date ?? '').slice(0, 10),
        schedule.driver?.name,
        schedule.bus?.code,
        schedule.starts_at,
        schedule.ends_at,
        schedule.status,
        ...(canManage ? [{ html: `<button class="button button--icon" data-edit-schedule="${esc(schedule.id)}" type="button" aria-label="Edit schedule">${icon('edit')}</button>` }] : []),
      ]);
    return `
      <section class="admin-panel admin-panel--pad">
        <div class="module-view__header"><div><div class="eyebrow">Operations planning</div><h2>Driver schedules</h2><p class="module-subtitle">Assign drivers, vehicles and trips without overlapping work.</p></div>${canManage ? `<button class="button button--primary button--with-icon" id="addSchedule" type="button">${icon('calendar')}<span>Add schedule</span></button>` : ''}</div>
        ${form}
      </section>
      ${table('Schedule records', ['Date', 'Driver', 'Vehicle', 'Start', 'End', 'Status', ...(canManage ? ['Actions'] : [])], rows, { id: 'driver-schedules' })}`;
  }

  if (state.module === 'packages') {
    return table(
      'Packages',
      ['Reference', 'Route', 'Recipient', 'Status', 'Created'],
      state.packages.map((item) => [
        item.reference,
        item.trip?.route
          ? `${item.trip.route.origin} → ${item.trip.route.destination}`
          : '—',
        item.recipient_name,
        item.status,
        item.created_at,
      ]),
    );
  }

  if (state.module === 'reports') {
    return `
      <section class="admin-panel admin-panel--pad report-control-panel">
        <div class="module-view__header report-module-header">
          <div class="report-module-heading">
            <div class="eyebrow">Reports</div>
            <h2>Choose a business question</h2>
            <p class="module-subtitle">Turn operational records into a focused view for the decision in front of you.</p>
          </div>

          <label class="report-type-control"><span>Report view</span><select id="reportType" class="select">
            <option value="executive" ${state.reportType === 'executive' ? 'selected' : ''}>Executive dashboard</option>
            <option value="travel" ${state.reportType === 'travel' ? 'selected' : ''}>Travel Report</option>
            <option value="vehicles" ${state.reportType === 'vehicles' ? 'selected' : ''}>Vehicle Report</option>
            <option value="trips" ${state.reportType === 'trips' ? 'selected' : ''}>Trip Report</option>
            <option value="bookings" ${state.reportType === 'bookings' ? 'selected' : ''}>Bookings Report</option>
            <option value="revenue" ${state.reportType === 'revenue' ? 'selected' : ''}>Revenue Report</option>
            <option value="incidents" ${state.reportType === 'incidents' ? 'selected' : ''}>Incidents Report</option>
            <option value="packages" ${state.reportType === 'packages' ? 'selected' : ''}>Packages Report</option>
            <option value="schedules" ${state.reportType === 'schedules' ? 'selected' : ''}>Schedules Report</option>
            <option value="trip-costs" ${state.reportType === 'trip-costs' ? 'selected' : ''}>Trip Cost Summary</option>
          </select></label>
          <div class="report-filters"><label><span>From</span><input id="reportFrom" type="date" value="${esc(state.reportFrom)}" /></label><label><span>To</span><input id="reportTo" type="date" value="${esc(state.reportTo)}" /></label><button class="button button--primary button--with-icon" id="applyReportFilters" type="button">${icon('refresh')}<span>Update report</span></button></div>
          ${state.reportData ? `<div class="report-outputs" aria-label="Report output options"><div class="report-output-heading"><span>Report actions</span><small>Export the data currently shown, with the selected date range.</small></div>${actionButton({ label: 'Download CSV', iconName: 'download', id: 'exportReportCsv' })}${actionButton({ label: 'Download JSON', iconName: 'download', id: 'exportReportJson' })}${actionButton({ label: 'Print / Save PDF', iconName: 'print', id: 'printReport' })}</div>` : ''}
        </div>
      </section>

      ${state.reportData ? reportView(state.reportType, state.reportData, { widgetOrder: state.reportWidgetOrder }) : ''}`;
  }

  if (state.module === 'users') {
    const user = state.userForm ?? { name: '', email: '', phone: '', role: 'passenger', active: true, role_ids: [], permission_grants: {} };
    const canManageRoles = state.permissions.includes('roles.manage');
    const canAssignPermissions = state.permissions.includes('permissions.assign');
    const roleOptions = [...state.roles];
    if (user.role && !roleOptions.some((role) => role.name === user.role)) roleOptions.unshift({ name: user.role, label: `${user.role} (legacy)` });
    const userForm = state.userFormOpen ? `<form id="userForm" class="premium-form-grid fleet-form"><div class="form-intro"><div class="form-avatar">${icon('edit')}</div><div><strong>${state.userEditingId ? 'Update user access' : 'Create user'}</strong><span>Assign roles, then set direct permission overrides only where needed.</span></div></div><label><span>Name</span><input name="name" required maxlength="150" value="${esc(user.name)}" /></label><label><span>Email</span><input name="email" type="email" required maxlength="190" value="${esc(user.email)}" /></label><label><span>Phone</span><input name="phone" maxlength="40" value="${esc(user.phone ?? '')}" /></label><label><span>Legacy access role</span><select name="role" ${canManageRoles ? '' : 'disabled'}>${roleOptions.map((role) => `<option value="${esc(role.name)}" ${user.role === role.name ? 'selected' : ''}>${esc(role.label ?? role.name)}</option>`).join('')}</select></label><label><span>Password ${state.userEditingId ? '(leave blank to keep)' : ''}</span><input name="password" type="password" ${state.userEditingId ? '' : 'required'} minlength="8" /></label><label><span>Status</span><select name="active"><option value="1" ${user.active !== false ? 'selected' : ''}>Active</option><option value="0" ${user.active === false ? 'selected' : ''}>Disabled</option></select></label><fieldset class="access-list"><legend>Assigned roles ${canManageRoles ? '' : '(requires roles.manage)'}</legend>${accessRoleList(state.roles, user.role_ids, !canManageRoles)}</fieldset><fieldset class="access-list"><legend>Direct permission overrides ${canAssignPermissions ? '' : '(requires permissions.assign)'}</legend><p class="access-list__help">Inherit follows assigned roles. Use Allow or Deny only to override that result.</p>${directPermissionList(state.permissionCatalog, user.permission_grants, user.role_ids, state.roles, !canAssignPermissions)}</fieldset><div class="form-actions"><button type="submit" class="button button--primary">${state.userEditingId ? 'Update user' : 'Create user'}</button><button type="button" class="button button--ghost" id="cancelUser">Cancel</button></div><div id="userMessage" aria-live="polite"></div></form>` : '';
    const filter = state.userFilters;
    const meta = state.userMeta;
    const roleFilter = [...new Map(state.roles.map((role) => [role.name, role])).values()];
    const filters = `<form class="admin-filter-bar" id="userFilters"><label><span>Search account</span><input name="q" type="search" placeholder="ID, name, email or phone" value="${esc(filter.q)}" /></label><label><span>Role</span><select name="role"><option value="">All roles</option>${roleFilter.map((role) => `<option value="${esc(role.name)}" ${filter.role === role.name ? 'selected' : ''}>${esc(role.label ?? role.name)}</option>`).join('')}</select></label><label><span>Status</span><select name="active"><option value="">All statuses</option><option value="1" ${filter.active === '1' ? 'selected' : ''}>Active</option><option value="0" ${filter.active === '0' ? 'selected' : ''}>Disabled</option></select></label><label><span>Registered from</span><input name="date_from" type="date" value="${esc(filter.date_from)}" /></label><label><span>Registered to</span><input name="date_to" type="date" value="${esc(filter.date_to)}" /></label><button class="button button--primary button--with-icon" type="submit">${icon('search')}<span>Search accounts</span></button><button class="button button--ghost button--with-icon" id="clearUserFilters" type="button">${icon('close')}<span>Clear</span></button></form>`;
    const pagination = `<footer class="server-pagination"><span>Showing ${state.users.length} of ${meta.total} accounts</span><div><button class="button button--ghost" type="button" data-users-page="prev" ${meta.current_page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${meta.current_page} of ${meta.last_page}</span><button class="button button--ghost" type="button" data-users-page="next" ${meta.current_page >= meta.last_page ? 'disabled' : ''}>Next</button></div></footer>`;
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Access control</div><h2>Users</h2><p class="module-subtitle">Search only the accounts you are permitted to manage. Results are paginated by the server.</p></div><button class="button button--primary button--with-icon" id="addUser" type="button">${icon('plus')}<span>Add user</span></button></div>${filters}${userForm}</section>${table('Users', ['Name', 'Email', 'Roles', 'Effective permissions', 'Status', 'Actions'], state.users.map((item) => [item.name, item.email, (item.roles ?? []).map((role) => role.label ?? role.name).join(', ') || item.role, (item.permissions ?? []).length, item.active ? 'Active' : 'Disabled', { html: `<div class="table-actions"><button class="button button--icon" data-open-user="${esc(item.id)}" type="button" aria-label="Open user detail">${icon('view')}</button><button class="button button--icon" data-edit-user="${esc(item.id)}" type="button" aria-label="Edit user">${icon('edit')}</button><button class="button button--icon" data-disable-user="${esc(item.id)}" type="button" aria-label="Disable user" ${item.active ? '' : 'disabled'}>${icon('archive')}</button></div>` }]), { id: 'admin-users', serverPaginated: true })}${pagination}${userDetailPanel()}`;
  }
  if (state.module === 'customers') {
    // Laravel already applies the passenger role filter before pagination. Do not
    // filter the current page again: that would hide valid customers and corrupt
    // the server-provided count when a page contains mixed legacy/role data.
    const customers = state.users;
    const filter = state.userFilters;
    const meta = state.userMeta;
    const customerFilters = `<form class="admin-filter-bar" id="customerFilters"><label><span>Search customer</span><input name="q" type="search" placeholder="Name, email or phone" value="${esc(filter.q)}" /></label><label><span>Status</span><select name="active"><option value="">All statuses</option><option value="1" ${filter.active === '1' ? 'selected' : ''}>Active</option><option value="0" ${filter.active === '0' ? 'selected' : ''}>Disabled</option></select></label><button class="button button--primary button--with-icon" type="submit">${icon('search')}<span>Search customers</span></button><button class="button button--ghost button--with-icon" id="clearCustomerFilters" type="button">${icon('close')}<span>Clear</span></button></form>`;
    const customerPagination = `<footer class="server-pagination"><span>Showing ${customers.length} of ${meta.total} customers</span><div><button class="button button--ghost" type="button" data-customers-page="prev" ${meta.current_page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${meta.current_page} of ${meta.last_page}</span><button class="button button--ghost" type="button" data-customers-page="next" ${meta.current_page >= meta.last_page ? 'disabled' : ''}>Next</button></div></footer>`;
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Customer service</div><h2>Customers</h2><p class="module-subtitle">Passenger accounts are filtered and paginated by Laravel. Guest bookings remain visible in Bookings.</p></div><span class="badge badge--neutral">${meta.total} accounts</span></div>${customerFilters}</section>${table('Registered Customers', ['Name', 'Email', 'Phone', 'Bookings', 'Account status', 'Joined', 'Actions'], customers.map((user) => [user.name, user.email, user.phone || '—', user.booking_count ?? 0, user.active ? 'Active' : 'Disabled', String(user.created_at ?? '').slice(0, 10) || '—', { html: `<button class="button button--icon" data-open-user="${esc(user.id)}" type="button" aria-label="Open customer detail">${icon('view')}</button>` }]), { id: 'admin-customers', serverPaginated: true })}${customerPagination}${userDetailPanel()}`;
  }
  if (state.module === 'roles') {
    const editing = state.roles.find((role) => String(role.id) === String(state.roleEditingId));
    const roleForm = editing ? `<form id="roleForm" class="premium-form-grid fleet-form"><label><span>Role label</span><input name="label" required maxlength="120" value="${esc(editing.label)}" /></label><fieldset class="access-list"><legend>Permissions enabled for this role</legend>${rolePermissionList(state.permissionCatalog, (editing.permissions ?? []).map((item) => item.key))}</fieldset><div class="form-actions"><button class="button button--primary" type="submit">Save role</button><button class="button button--ghost" id="cancelRole" type="button">Cancel</button></div><div id="roleMessage" aria-live="polite"></div></form>` : '';
    return `<section class="admin-panel admin-panel--pad"><div class="module-view__header"><div><div class="eyebrow">Access control</div><h2>Roles</h2></div></div>${roleForm}</section>${table('Roles', ['Name', 'Label', 'System', 'Permissions', 'Actions'], state.roles.map((role) => [role.name, role.label, role.system ? 'Yes' : 'No', (role.permissions ?? []).length, { html: `<button class="button button--icon" data-edit-role="${esc(role.id)}" type="button" aria-label="Edit role" ${role.system && state.user?.role !== 'superadmin' ? 'disabled' : ''}>${icon('edit')}</button>` }]))}`;
  }
  if (state.module === 'permissions') return table('Permissions', ['Key', 'Label', 'Resource'], state.permissionCatalog.map((permission) => [permission.key, permission.label, permission.resource]));

  if (state.module === 'profile') {
    const user = state.user ?? {};
    const avatar = profileImageSource(user);
    return `<section class="admin-panel admin-panel--pad profile-module">
      <div class="profile-breadcrumb"><span>${icon('dashboard')}Operations</span><b>›</b><span>${icon('settings')}Configuration</span><b>›</b><strong>Account</strong></div>
      <div class="module-view__header profile-heading"><div><div class="eyebrow">Account settings</div><h2>Account configuration</h2><p class="module-subtitle">Manage your identity, access and preferences from one secure workspace.</p></div><button class="button button--ghost" id="profileClose" type="button">Back to dashboard</button></div>
      <div class="profile-context-bar" role="status">${icon('user')}<span><strong>Personal information</strong><small>Your identity and access details</small></span></div>
      <div class="profile-grid">
        <section class="profile-card profile-photo-card"><div class="profile-card-heading">${icon('user')}<div><h3>Profile photo</h3><p>Use a clear image for your account.</p></div></div><div class="profile-avatar-large">${avatar ? `<img src="${esc(avatar)}" alt="Current profile photo" />` : `<span>${esc(initialsForUser(user))}</span>`}<button type="button" id="changeProfilePhoto" aria-label="Change profile photo">${icon('view')}</button></div><button class="button button--ghost profile-photo-button" id="changeProfilePhotoSecondary" type="button">${icon('view')}Change photo</button><small class="profile-help">JPG, PNG or WebP · maximum 5 MB</small></section>
        <section class="profile-card profile-info-card"><div class="profile-card-heading">${icon('user')}<div><h3>Personal information</h3><p>Keep your account details current.</p></div></div><form id="profileForm" class="profile-form"><label><span>Full name</span><input name="name" required maxlength="150" value="${esc(user.name ?? '')}" /></label><label><span>Phone number</span><input name="phone" maxlength="40" value="${esc(user.phone ?? '')}" /></label>${user.email ? `<label><span>Email address</span><input value="${esc(user.email)}" disabled /></label>` : ''}<label><span>Account role</span><input value="${esc(user.role ?? 'Staff account')}" disabled /></label><div class="profile-form-actions"><span id="profileMessage" aria-live="polite">${state.profileDirty ? 'Unsaved changes' : ''}</span><button class="button button--primary button--with-icon" type="submit" ${state.profileDirty ? '' : 'disabled'}>${icon('save')}Save changes</button></div></form></section>
      </div>
      <div class="profile-grid profile-grid-bottom"><section class="profile-card profile-access-card"><div class="profile-card-heading">${icon('save')}<div><h3>Account access</h3><p>Manage this authenticated session and account lifecycle.</p></div></div><div class="profile-session-summary" role="status"><span class="profile-session-summary__dot" aria-hidden="true"></span><div><strong>Authenticated workspace</strong><small>${esc(user.email ?? 'Staff account')} · ${esc(user.role ?? 'Staff account')}</small></div></div><div class="profile-access-row"><button class="button button--ghost" id="profileLogout" type="button">${icon('logout')}Sign out</button><span>End the current authenticated session.</span></div><div class="profile-access-row profile-access-danger"><button class="button button--danger" id="deleteProfile" type="button">${icon('close')}Delete account</button><span>Requires explicit confirmation and preserves historical records.</span></div></section></div>
      ${profileDialogMarkup()}
    </section>`;
  }

  if (state.module === 'settings') {
    const settings = state.generalSettings ?? {};
    const canUpdate = state.permissions.includes('settings.update');
    return `<section class="admin-panel admin-panel--pad"><div class="eyebrow">System configuration</div><h2>General</h2><p class="module-subtitle">Set the address shown as the sender on passenger booking emails.</p><div class="settings-status ${settings.gmail_api_ready ? 'settings-status--ready' : 'settings-status--pending'}" role="status">${settings.gmail_api_ready ? 'Gmail API is ready to send email.' : 'Gmail authorization is incomplete. A server OAuth refresh token and MAIL_MAILER=gmail_api are required.'}</div><form id="emailSettingsForm" class="premium-form-grid fleet-form"><label><span>Sender email</span><input name="mail_from_address" type="email" autocomplete="email" maxlength="254" required value="${esc(settings.mail_from_address ?? '')}" ${canUpdate ? '' : 'disabled'} /></label><label><span>Sender name</span><input name="mail_from_name" maxlength="120" required value="${esc(settings.mail_from_name ?? 'Encore Transport')}" ${canUpdate ? '' : 'disabled'} /></label>${canUpdate ? '<div class="form-actions"><button class="button button--primary" type="submit">Save email settings</button></div>' : ''}<div id="emailSettingsMessage" aria-live="polite"></div></form></section>`;
  }

  if (state.module === 'website') return websiteEditor();

  return '';
}

function downloadReport(format) {
  if (!state.reportData) return;
  const isCsv = format === 'csv';
  const body = isCsv
    ? reportToCsv(state.reportType, state.reportData)
    : reportToJson(state.reportType, state.reportData);
  const type = isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
  const blobUrl = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = reportFilename(state.reportType, format);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function saveReportWidgetOrder(order) {
  state.reportWidgetOrder = order;
  localStorage.setItem('encore_report_widgets', JSON.stringify(order));
  render();
}

function moveReportWidget(widget, direction) {
  const widgets = [...document.querySelectorAll('[data-report-widget]')];
  const order = widgets.map((item) => item.dataset.reportWidget).filter(Boolean);
  const source = widget.dataset.reportWidget;
  const from = order.indexOf(source);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return;
  order.splice(from, 1);
  order.splice(to, 0, source);
  saveReportWidgetOrder(order);
  window.requestAnimationFrame(() => document.querySelector(`[data-report-widget="${CSS.escape(source)}"] [data-report-move]`)?.focus());
}

function render() {
  root.innerHTML = `
    <div class="admin-layout ${state.sidebarCollapsed ? 'is-sidebar-collapsed' : ''}">
      ${sidebar()}

      <section class="admin-main">
        <header class="admin-topbar">
          <div>
            <div class="eyebrow">Centralized operations</div>
            <h1 class="page-title">${esc(modules.find((module) => module.id === state.module)?.label ?? 'Operations')}</h1>
          </div>

          <div class="admin-controls">
            <button class="button button--icon admin-notification-button" id="adminNotificationsToggle" type="button" aria-expanded="${state.notificationsOpen}" aria-label="Open notifications">${icon('report')}${state.notificationsUnread ? `<b>${state.notificationsUnread}</b>` : ''}</button>
            ${state.notificationsOpen ? `<div class="admin-notifications-panel" role="dialog" aria-label="Notifications"><header><strong>Notifications</strong><button class="button button--ghost button--with-icon" id="markAllNotifications" type="button" ${state.notificationsUnread ? '' : 'disabled'}>${icon('check')}<span>Mark all read</span></button></header>${state.notifications.length ? state.notifications.map((notification) => `<button class="admin-notification-item ${notification.read_at ? '' : 'is-unread'}" data-notification-id="${esc(notification.id)}" type="button"><span>${icon('report')}</span><span><strong>${esc(notification.title)}</strong><small>${esc(notification.body)}</small></span></button>`).join('') : '<p class="admin-notifications-empty">No notifications yet.</p>'}</div>` : ''}
            <div class="admin-user-menu"><button class="button button--ghost admin-user-chip" id="adminUserMenuToggle" type="button" aria-expanded="${state.userMenuOpen}" aria-haspopup="menu" aria-label="Open user menu">${icon('user')}<span>${esc(adminDisplayName(state.user))}</span>${icon('arrowRight')}</button>${state.userMenuOpen ? `<div class="admin-user-menu__panel" role="menu"><div class="admin-user-menu__identity"><strong>${esc(adminDisplayName(state.user))}</strong><small>${esc(state.user?.role ?? 'Staff account')}</small></div><button type="button" data-module="profile" role="menuitem">${icon('user')}My account</button><button type="button" data-module="settings" role="menuitem">${icon('settings')}General settings</button><button type="button" id="menuLogout" role="menuitem" class="is-danger">${icon('logout')}Sign out</button></div>` : ''}</div>
            ${state.accessDenied ? '' : `<button class="button button--icon" id="openSettings" type="button" aria-label="Open settings" title="Settings">${icon('settings')}</button>`}
            ${state.accessDenied ? '' : `<button type="button" class="button button--ghost button--with-icon" id="refresh">${icon('refresh')}Refresh</button>`}
            <button type="button" class="button button--ghost button--with-icon" id="logout">${icon('logout')}Logout</button>
          </div>
        </header>

        ${content()}
      </section>
    </div>`;

  wire();

  const profileDialog = document.querySelector('.profile-dialog');
  if (profileDialog && !profileDialog.open) {
    profileDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      state.profileDialog = '';
      if (state.profilePhotoDraftUrl) URL.revokeObjectURL(state.profilePhotoDraftUrl);
      state.profilePhotoDraftUrl = '';
      state.profilePhotoDraftFile = null;
      render();
    }, { once: true });
    profileDialog.addEventListener('click', (event) => {
      if (event.target !== profileDialog) return;
      profileDialog.close();
      state.profileDialog = '';
      if (state.profilePhotoDraftUrl) URL.revokeObjectURL(state.profilePhotoDraftUrl);
      state.profilePhotoDraftUrl = '';
      state.profilePhotoDraftFile = null;
      render();
    });
    profileDialog.showModal();
  }

  if (!state.accessDenied && !state.loading && !state.error) {
    void hydrateAdminMap();
  }
}

async function hydrateAdminMap() {
  const container = document.querySelector('#adminLiveMap');
  if (!container) return;

  const tripId = container.dataset.tripId;
  const origin = container.dataset.origin;
  const destination = container.dataset.destination;

  if (!tripId || !origin || !destination) return;

  const mapOptions = {};
  await renderJourneyMapWithLoader(container, async () => {
    const [journey, locationPayload] = await Promise.all([
      mapJourney(origin, destination),
      requestJson(`/trips/${tripId}/location`).catch(() => ({ data: null })),
    ]);
    mapOptions.driverLocation = locationPayload?.data ?? null;
    return journey;
  }, mapOptions);
}

async function loadModule() {
  const requestId = ++latestLoadRequest;
  state.loading = true;
  state.error = '';
  render();

  try {
    if (!state.dashboard) {
      state.dashboard = await api.dashboard();
    }
    if (requestId !== latestLoadRequest) return;

    if (state.module === 'incidents') {
      state.incidents = await api.incidents();
    }

    if (state.module === 'schedules') {
      state.schedules = await api.schedules();
    }

    if (state.module === 'packages') {
      state.packages = await api.packages();
    }
    if (state.module === 'tickets') {
      const ticketsResult = await api.tickets(state.ticketFilters);
      state.tickets = ticketsResult.items;
      state.ticketMeta = ticketsResult.meta;
    }

    if (state.module === 'routes') {
      state.routes = await api.routes();
    }
    if (state.module === 'website') {
      [state.websiteContent, state.websiteMedia] = await Promise.all([api.websiteContent(), api.websiteMedia()]);
      if (!state.websiteContent.draft?.sections || !Object.keys(state.websiteContent.draft.sections).length) state.websiteContent.draft = blankWebsiteContent();
    }

    if (state.module === 'drivers') {
      state.drivers = await api.drivers();
    }

    if (state.module === 'vehicles') {
      state.vehicles = await api.vehicles();
    }

    if (state.module === 'vehicles') {
      state.vehicleStatus = await api.vehicleStatus();
    }

    if (state.module === 'reports') {
      state.reportData = await api.report(state.reportType, { from: state.reportFrom, to: state.reportTo });
    }

    if (state.module === 'users' || state.module === 'customers') {
      const usersResult = await api.users(userDirectoryFilters());
      state.users = usersResult.items;
      state.userMeta = usersResult.meta;
      if (state.module === 'users' && (state.permissions.includes('roles.view') || state.permissions.includes('roles.manage'))) state.roles = await api.roles();
      if (state.module === 'users' && (state.permissions.includes('permissions.view') || state.permissions.includes('permissions.assign'))) state.permissionCatalog = await api.permissions();
    }
    if (state.module === 'roles') {
      [state.roles, state.permissionCatalog] = await Promise.all([api.roles(), api.permissions()]);
    }
    if (state.module === 'permissions') state.permissionCatalog = await api.permissions();
    if (state.module === 'settings') state.generalSettings = await api.settings();

    if (requestId !== latestLoadRequest) return;
    state.loading = false;
  } catch (error) {
    if (requestId !== latestLoadRequest) return;
    state.loading = false;
    state.error = error.message;
  }

  if (requestId !== latestLoadRequest) return;
  render();
}

async function openUserDetail(userId, tab = 'general', page = 1) {
  state.userDetailLoading = true;
  state.userDetailError = '';
  state.userDetail = state.userDetail?.user?.id === Number(userId)
    ? { ...state.userDetail, tab, data: [] }
    : { user: null, tab, data: [], meta: {} };
  render();
  try {
    const user = state.userDetail.user ?? await api.userDetail(userId);
    let data = [];
    let meta = {};
    if (['bookings', 'tickets', 'packages', 'activity'].includes(tab)) {
      const result = await api.userDetailTab(userId, tab, page);
      data = result.items;
      meta = result.meta;
    } else if (tab === 'permissions') {
      data = await api.userPermissions(userId);
    }
    state.userDetail = { user, tab, data, meta };
    state.userDetailMeta = meta;
    state.userDetailLoading = false;
  } catch (error) {
    state.userDetailLoading = false;
    state.userDetailError = error.message;
  }
  render();
}

function wire() {
  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem('encore_admin_sidebar_collapsed', state.sidebarCollapsed ? '1' : '0');
    render();
  });

  document.querySelectorAll('[data-nav-toggle]').forEach((button) => button.addEventListener('click', () => {
    const group = button.dataset.navToggle;
    if (!group) return;
    state.navGroups[group] = state.navGroups[group] === false;
    localStorage.setItem('encore_admin_nav_groups_v2', JSON.stringify(state.navGroups));
    render();
  }));

  document.querySelector('[data-nav-expand-all]')?.addEventListener('click', () => {
    document.querySelectorAll('[data-nav-toggle]').forEach((button) => { state.navGroups[button.dataset.navToggle] = true; });
    localStorage.setItem('encore_admin_nav_groups_v2', JSON.stringify(state.navGroups));
    render();
  });

  document.querySelector('[data-nav-collapse-all]')?.addEventListener('click', () => {
    document.querySelectorAll('[data-nav-toggle]').forEach((button) => { state.navGroups[button.dataset.navToggle] = false; });
    localStorage.setItem('encore_admin_nav_groups_v2', JSON.stringify(state.navGroups));
    render();
  });

  document.querySelectorAll('.cms-library-item img, .cms-image-preview img, .route-image-preview img, .admin-driver-photo').forEach((image) => image.addEventListener('error', () => {
    image.hidden = true;
    image.parentElement?.classList.add('image-fallback');
  }, { once: true }));

  document.querySelectorAll('[data-profile-avatar-photo]').forEach((photo) => photo.addEventListener('error', () => {
    photo.hidden = true;
    const fallback = photo.parentElement?.querySelector('[data-profile-avatar-fallback]');
    if (fallback) fallback.hidden = false;
    state.profilePhotoMessage = 'The saved profile image could not be loaded.';
  }, { once: true }));

  document.querySelector('[data-profile-photo-input]')?.addEventListener('change', async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = '';
      state.profilePhotoMessage = 'Choose a JPG, PNG or WebP image under 5 MB.';
      render();
      return;
    }
    state.profilePhotoMessage = 'Uploading photo…';
    const localPreview = URL.createObjectURL(file);
    state.user = { ...state.user, avatar_url: localPreview };
    render();
    try {
      const photo = await optimizeImageForUpload(file);
      const user = await api.uploadProfilePhoto(photo);
      state.user = { ...state.user, ...(user ?? {}) };
      URL.revokeObjectURL(localPreview);
      state.profilePhotoMessage = 'Photo saved.';
      render();
    } catch (error) {
      state.profilePhotoMessage = error?.message ?? 'Photo upload failed. Please try again.';
      render();
    }
  });

  document.querySelectorAll('#profileForm input[name="name"], #profileForm input[name="phone"]').forEach((input) => input.addEventListener('input', () => {
    state.profileDirty = true;
    const button = document.querySelector('#profileForm button[type="submit"]');
    const message = document.querySelector('#profileMessage');
    if (button) button.disabled = false;
    if (message) message.textContent = 'Unsaved changes';
  }));
  document.querySelector('#profileForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#profileMessage');
    if (message) message.textContent = 'Saving profile…';
    try {
      state.user = { ...state.user, ...(await api.updateProfile({ name: form.get('name'), phone: form.get('phone') })) };
      const photo = form.get('photo');
      if (photo instanceof File && photo.size) state.user = { ...state.user, ...(await api.uploadProfilePhoto(await optimizeImageForUpload(photo))) };
      state.profileDirty = false;
      if (message) message.textContent = 'Profile saved.';
      state.profileDialog = 'saved';
      render();
    } catch (error) { if (message) message.textContent = error?.message ?? 'Profile could not be saved.'; }
  });
  document.querySelectorAll('#changeProfilePhoto, #changeProfilePhotoSecondary').forEach((button) => button.addEventListener('click', () => {
    state.profileDialog = 'photo';
    state.profilePhotoDraftUrl = '';
    state.profilePhotoDraftFile = null;
    state.profilePhotoZoom = 1;
    render();
  }));
  document.querySelector('#profilePhotoDialogInput')?.addEventListener('change', (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      const message = document.querySelector('#profilePhotoDialogMessage');
      if (message) message.textContent = 'Choose a JPG, PNG or WebP image under 5 MB.';
      return;
    }
    if (state.profilePhotoDraftUrl) URL.revokeObjectURL(state.profilePhotoDraftUrl);
    state.profilePhotoDraftFile = file;
    state.profilePhotoDraftUrl = URL.createObjectURL(file);
    state.profilePhotoZoom = 1;
    render();
  });
  document.querySelector('#profilePhotoZoom')?.addEventListener('input', (event) => {
    state.profilePhotoZoom = Number(event.currentTarget.value || 1);
    const preview = document.querySelector('.photo-dialog-preview');
    if (preview) preview.style.setProperty('--photo-zoom', state.profilePhotoZoom);
  });
  document.querySelector('#applyProfilePhoto')?.addEventListener('click', async () => {
    if (!state.profilePhotoDraftFile) return;
    const message = document.querySelector('#profilePhotoDialogMessage');
    if (message) message.textContent = 'Saving photo…';
    try {
      state.user = { ...state.user, ...(await api.uploadProfilePhoto(await cropProfileImage(state.profilePhotoDraftFile, state.profilePhotoZoom))) };
      if (state.profilePhotoDraftUrl) URL.revokeObjectURL(state.profilePhotoDraftUrl);
      state.profilePhotoDraftUrl = ''; state.profilePhotoDraftFile = null; state.profileDialog = '';
      state.profilePhotoMessage = 'Photo saved.';
      render();
    } catch (error) { if (message) message.textContent = error?.message ?? 'Photo upload failed. Please try again.'; }
  });
  document.querySelector('#deleteProfile')?.addEventListener('click', () => { state.profileDialog = 'delete'; render(); });
  document.querySelector('#deleteConfirmation')?.addEventListener('input', (event) => {
    const button = document.querySelector('#confirmDeleteProfile');
    if (button) button.disabled = event.currentTarget.value.trim() !== 'DELETE';
  });
  document.querySelector('#confirmDeleteProfile')?.addEventListener('click', async () => {
    const message = document.querySelector('#deleteProfileMessage');
    if (message) message.textContent = 'Deleting account…';
    try { await api.deleteProfile(); sessionStorage.removeItem('encore_api_token'); location.href = '/login/'; }
    catch (error) { if (message) message.textContent = error?.message ?? 'Account could not be deleted.'; }
  });
  document.querySelector('#profileLogout')?.addEventListener('click', async () => {
    try { await logout(); } finally { sessionStorage.removeItem('encore_api_token'); location.href = '/login/'; }
  });
  document.querySelector('#profileClose')?.addEventListener('click', () => { state.module = 'dashboard'; void loadModule(); });
  document.querySelector('#adminUserMenuToggle')?.addEventListener('click', () => { state.userMenuOpen = !state.userMenuOpen; render(); });
  document.querySelector('#adminNotificationsToggle')?.addEventListener('click', () => { state.notificationsOpen = !state.notificationsOpen; state.userMenuOpen = false; render(); });
  document.querySelector('#markAllNotifications')?.addEventListener('click', async () => { await markAllNotificationsRead().catch(() => {}); state.notifications = state.notifications.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })); state.notificationsUnread = 0; render(); });
  document.querySelectorAll('[data-notification-id]').forEach((button) => button.addEventListener('click', async () => {
    await markNotificationRead(button.dataset.notificationId).catch(() => {});
    state.notifications = state.notifications.map((item) => String(item.id) === String(button.dataset.notificationId) ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item);
    state.notificationsUnread = state.notifications.filter((item) => !item.read_at).length;
    render();
  }));
  document.querySelector('#menuLogout')?.addEventListener('click', async () => {
    try { await logout(); } finally { sessionStorage.removeItem('encore_api_token'); location.href = '/login/'; }
  });
  document.querySelectorAll('.profile-dialog [value="cancel"]').forEach((button) => button.addEventListener('click', () => {
    state.profileDialog = ''; state.profilePhotoDraftUrl = ''; state.profilePhotoDraftFile = null; render();
  }));

  document.querySelector('#exportReportCsv')?.addEventListener('click', () => downloadReport('csv'));
  document.querySelector('#exportReportJson')?.addEventListener('click', () => downloadReport('json'));
  document.querySelector('#printReport')?.addEventListener('click', () => window.print());

  document.querySelectorAll('[data-module]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.accessDenied) return;

      const mapContainer = document.querySelector('#adminLiveMap');
      if (mapContainer) destroyRealMap(mapContainer);

      state.module = button.dataset.module;
      state.userMenuOpen = false;
      state.reportData = null;
      void loadModule();
    });
  });

  document.querySelector('#refresh')?.addEventListener('click', () => {
    state.dashboard = null;
    void loadModule();
  });

  document.querySelector('#openSettings')?.addEventListener('click', () => {
    if (state.accessDenied) return;
    state.module = 'settings';
    state.reportData = null;
    void loadModule();
  });

  document.querySelector('#retry')?.addEventListener('click', loadModule);

  document.querySelectorAll('[data-save-incident]').forEach((button) => button.addEventListener('click', async () => {
    const id = button.dataset.saveIncident;
    const field = (name) => document.querySelector(`[data-incident-${name}="${CSS.escape(id)}"]`);
    const changes = {
      status: field('status')?.value,
      severity: field('severity')?.value,
      title: field('title')?.value,
      description: field('description')?.value,
    };
    try {
      const updated = await api.updateIncident(id, changes);
      state.incidents = state.incidents.map((item) => String(item.id) === String(id) ? updated : item);
      render();
      void api.incidents().then((items) => { state.incidents = items; render(); }).catch(() => {});
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));

  document.querySelectorAll('[data-cancel-booking]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Cancel this unpaid booking and release its seats?')) return;
    try {
      await api.cancelBooking(button.dataset.cancelBooking);
      state.dashboard = await api.dashboard();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));

  document.querySelectorAll('[data-view-booking]').forEach((button) => button.addEventListener('click', async () => {
    const dialog = document.querySelector('#bookingDetailsDialog');
    const content = document.querySelector('#bookingDetailsContent');
    if (!dialog || !content) return;
    dialog.showModal();
    content.innerHTML = '<div class="booking-detail-loading" role="status">Loading booking details…</div>';
    try {
      const booking = await api.bookingDetails(button.dataset.viewBooking);
      content.innerHTML = bookingDetailsView(booking);
      content.querySelector('[data-close-booking-details]')?.addEventListener('click', () => dialog.close());
    } catch (error) {
      content.innerHTML = `<div class="booking-detail-error" role="alert"><strong>Booking details could not be loaded.</strong><p>${esc(error.message)}</p><button class="button button--ghost" type="button" data-close-booking-details>Close</button></div>`;
      content.querySelector('[data-close-booking-details]')?.addEventListener('click', () => dialog.close());
    }
  }));

  document.querySelector('#emailSettingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#emailSettingsMessage');
    try {
      state.generalSettings = await api.saveEmailSettings({
        mail_from_address: form.get('mail_from_address'),
        mail_from_name: form.get('mail_from_name'),
      });
      if (message) message.textContent = 'Email sender settings saved.';
      render();
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });

  document.querySelector('#logout')?.addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      redirectLogin();
    }
  });

  document.querySelector('#reportType')?.addEventListener('change', (event) => {
    state.reportType = event.target.value;
    state.reportData = null;
    void loadModule();
  });

  document.querySelector('#applyReportFilters')?.addEventListener('click', () => {
    state.reportFrom = document.querySelector('#reportFrom')?.value ?? '';
    state.reportTo = document.querySelector('#reportTo')?.value ?? '';
    state.reportData = null;
    void loadModule();
  });

  document.querySelector('#addSchedule')?.addEventListener('click', () => {
    state.scheduleFormOpen = true;
    state.scheduleEditingId = null;
    state.scheduleForm = {
      driver_id: '', bus_id: '', trip_id: '',
      work_date: new Date().toISOString().slice(0, 10),
      starts_at: '08:00', ends_at: '09:00', status: 'scheduled', notes: '',
    };
    render();
  });
  document.querySelector('#cancelSchedule')?.addEventListener('click', () => {
    state.scheduleFormOpen = false;
    state.scheduleEditingId = null;
    state.scheduleForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-schedule]').forEach((button) => button.addEventListener('click', () => {
    const schedule = state.schedules.find((item) => String(item.id) === String(button.dataset.editSchedule));
    if (!schedule) return;
    state.scheduleFormOpen = true;
    state.scheduleEditingId = schedule.id;
    state.scheduleForm = {
      ...schedule,
      work_date: String(schedule.work_date ?? '').slice(0, 10),
      starts_at: String(schedule.starts_at ?? '').slice(0, 5),
      ends_at: String(schedule.ends_at ?? '').slice(0, 5),
    };
    render();
  }));
  document.querySelector('#scheduleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      driver_id: Number(form.get('driver_id')),
      bus_id: form.get('bus_id') ? Number(form.get('bus_id')) : null,
      trip_id: form.get('trip_id') ? Number(form.get('trip_id')) : null,
      work_date: form.get('work_date'),
      starts_at: form.get('starts_at'),
      ends_at: form.get('ends_at'),
      status: form.get('status'),
      notes: form.get('notes') || null,
    };
    try {
      await api.saveSchedule(data, state.scheduleEditingId);
      state.scheduleFormOpen = false;
      state.scheduleEditingId = null;
      state.scheduleForm = null;
      render();
      void api.schedules().then((items) => { state.schedules = items; render(); }).catch(() => {});
    } catch (error) {
      const message = document.querySelector('#scheduleMessage');
      if (message) message.textContent = error.message;
    }
  });

  document.querySelector('#addTrip')?.addEventListener('click', () => {
    state.tripFormOpen = true;
    state.tripEditingId = null;
    state.tripForm = {
      transport_route_id: '', bus_id: '', driver_id: '',
      departure_date: new Date().toISOString().slice(0, 10),
      departure_time: '08:00', arrival_time: '09:00', price_per_passenger: '',
    };
    render();
  });
  document.querySelector('#cancelTripForm')?.addEventListener('click', () => {
    state.tripFormOpen = false;
    state.tripEditingId = null;
    state.tripForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-trip]').forEach((button) => button.addEventListener('click', () => {
    const trip = (state.dashboard?.trips ?? []).find((item) => String(item.id) === String(button.dataset.editTrip));
    if (!trip) return;
    state.tripFormOpen = true;
    state.tripEditingId = trip.id;
    state.tripForm = {
      transport_route_id: trip.transport_route_id,
      bus_id: trip.bus_id,
      driver_id: trip.driver_id,
      departure_date: String(trip.departure_date ?? '').slice(0, 10),
      departure_time: String(trip.departure_time ?? '').slice(0, 5),
      arrival_time: String(trip.arrival_time ?? '').slice(0, 5),
      price_per_passenger: trip.price_per_passenger ?? '',
    };
    render();
  }));
  document.querySelectorAll('[data-cancel-trip]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Cancel this trip? Held or confirmed bookings must be resolved first.')) return;
    try {
      await api.cancelTrip(button.dataset.cancelTrip);
      state.dashboard = await api.dashboard();
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  }));
  document.querySelector('#tripForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      transport_route_id: Number(form.get('transport_route_id')),
      bus_id: Number(form.get('bus_id')),
      driver_id: Number(form.get('driver_id')),
      departure_date: form.get('departure_date'),
      departure_time: form.get('departure_time'),
      arrival_time: form.get('arrival_time'),
      price_per_passenger: Number(form.get('price_per_passenger')),
    };
    try {
      await api.saveTrip(data, state.tripEditingId);
      state.dashboard = await api.dashboard();
      state.tripFormOpen = false;
      state.tripEditingId = null;
      state.tripForm = null;
      render();
    } catch (error) {
      const message = document.querySelector('#tripMessage');
      if (message) message.textContent = error.message;
    }
  });

  document.querySelector('#addUser')?.addEventListener('click', () => {
    state.userFormOpen = true;
    state.userEditingId = null;
    state.userForm = { name: '', email: '', phone: '', role: 'passenger', active: true, role_ids: [], permission_grants: {} };
    render();
  });
  document.querySelector('#userFilters')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.userFilters = {
      ...state.userFilters,
      q: String(form.get('q') ?? '').trim(),
      role: String(form.get('role') ?? ''),
      active: String(form.get('active') ?? ''),
      date_from: String(form.get('date_from') ?? ''),
      date_to: String(form.get('date_to') ?? ''),
      page: 1,
    };
    void loadModule();
  });
  document.querySelector('#clearUserFilters')?.addEventListener('click', () => {
    state.userFilters = { q: '', role: '', active: '', date_from: '', date_to: '', page: 1, per_page: 25 };
    void loadModule();
  });
  document.querySelector('#customerFilters')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.userFilters = { ...state.userFilters, q: String(form.get('q') ?? '').trim(), role: 'passenger', active: String(form.get('active') ?? ''), page: 1 };
    void loadModule();
  });
  document.querySelector('#clearCustomerFilters')?.addEventListener('click', () => {
    state.userFilters = { q: '', role: 'passenger', active: '', date_from: '', date_to: '', page: 1, per_page: 25 };
    void loadModule();
  });
  document.querySelectorAll('[data-customers-page]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.customersPage === 'next' ? 1 : -1;
    const page = Math.max(1, Math.min(state.userMeta.last_page, state.userMeta.current_page + direction));
    if (page === state.userMeta.current_page) return;
    state.userFilters = { ...state.userFilters, role: 'passenger', page };
    void loadModule();
  }));
  document.querySelectorAll('[data-open-user]').forEach((button) => button.addEventListener('click', () => {
    void openUserDetail(button.dataset.openUser);
  }));
  document.querySelector('#closeUserDetail')?.addEventListener('click', () => {
    state.userDetail = null;
    state.userDetailError = '';
    render();
  });
  document.querySelectorAll('[data-user-detail-tab]').forEach((button) => button.addEventListener('click', () => {
    const userId = state.userDetail?.user?.id;
    if (!userId || state.userDetailLoading) return;
    void openUserDetail(userId, button.dataset.userDetailTab, 1);
  }));
  document.querySelectorAll('[data-user-detail-page]').forEach((button) => button.addEventListener('click', () => {
    const meta = state.userDetailMeta;
    const direction = button.dataset.userDetailPage === 'next' ? 1 : -1;
    const page = Math.max(1, Math.min(meta.last_page ?? 1, (meta.current_page ?? 1) + direction));
    if (page === meta.current_page) return;
    void openUserDetail(state.userDetail?.user?.id, state.userDetail?.tab, page);
  }));
  document.querySelectorAll('[data-users-page]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.usersPage === 'next' ? 1 : -1;
    const page = Math.max(1, Math.min(state.userMeta.last_page, state.userMeta.current_page + direction));
    if (page === state.userMeta.current_page) return;
    state.userFilters = { ...state.userFilters, page };
    void loadModule();
  }));
  document.querySelector('#ticketFilters')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.ticketFilters = { ...state.ticketFilters, q: String(form.get('q') ?? '').trim(), lifecycle: String(form.get('lifecycle') ?? ''), status: String(form.get('status') ?? ''), page: 1 };
    void loadModule();
  });
  document.querySelector('#clearTicketFilters')?.addEventListener('click', () => { state.ticketFilters = { q: '', status: '', lifecycle: '', page: 1, per_page: 25 }; void loadModule(); });
  document.querySelectorAll('[data-tickets-page]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.ticketsPage === 'next' ? 1 : -1;
    const page = Math.max(1, Math.min(state.ticketMeta.last_page, state.ticketMeta.current_page + direction));
    if (page === state.ticketMeta.current_page) return;
    state.ticketFilters = { ...state.ticketFilters, page };
    void loadModule();
  }));
  document.querySelectorAll('[data-view-ticket]').forEach((button) => button.addEventListener('click', async () => {
    try { state.ticketDetail = await api.ticketDetail(button.dataset.viewTicket); render(); } catch (error) { state.error = error.message; render(); }
  }));
  document.querySelector('#closeTicketDetail')?.addEventListener('click', () => { state.ticketDetail = null; render(); });
  document.querySelectorAll('[data-ticket-transition]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm(`Set ticket to ${button.dataset.ticketStatus}?`)) return;
    try { await api.transitionTicket(button.dataset.ticketTransition, button.dataset.ticketStatus); const result = await api.tickets(state.ticketFilters); state.tickets = result.items; state.ticketMeta = result.meta; render(); } catch (error) { state.error = error.message; render(); }
  }));
  document.querySelector('#cancelUser')?.addEventListener('click', () => {
    state.userFormOpen = false;
    state.userEditingId = null;
    state.userForm = null;
    render();
  });
  document.querySelectorAll('[data-edit-user]').forEach((button) => button.addEventListener('click', () => {
    const user = state.users.find((item) => String(item.id) === String(button.dataset.editUser));
    if (!user) return;
    state.userFormOpen = true;
    state.userEditingId = user.id;
    state.userForm = { ...user, role_ids: (user.roles ?? []).map((role) => role.id), permission_grants: Object.fromEntries((user.direct_permissions ?? []).map((permission) => [permission.key, permission.pivot?.granted === true || permission.pivot?.granted === 1 || permission.pivot?.granted === '1'])) };
    render();
  }));
  document.querySelectorAll('[data-disable-user]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Disable this user account?')) return;
    try { await api.disableUser(button.dataset.disableUser); const usersResult = await api.users(userDirectoryFilters()); state.users = usersResult.items; state.userMeta = usersResult.meta; render(); } catch (error) { state.error = error.message; render(); }
  }));
  document.querySelectorAll('[data-user-role], [data-role-permission]').forEach((button) => button.addEventListener('click', () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('is-on', enabled);
    button.textContent = button.hasAttribute('data-user-role')
      ? (enabled ? 'Assigned' : 'Not assigned')
      : (enabled ? 'Enabled' : 'Disabled');
  }));
  document.querySelectorAll('[data-access-filter]').forEach((input) => input.addEventListener('input', () => {
    const list = document.querySelector(`[data-access-list="${CSS.escape(input.dataset.accessFilter)}"]`);
    const query = input.value.trim().toLowerCase();
    list?.querySelectorAll('[data-access-item]').forEach((item) => {
      item.hidden = query.length > 0 && !item.dataset.accessItem.includes(query);
    });
  }));
  document.querySelector('#userForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleIds = [...document.querySelectorAll('[data-user-role][aria-pressed="true"]')].map((button) => Number(button.dataset.userRole));
    const grants = Object.fromEntries([...document.querySelectorAll('[data-user-permission]')].map((input) => [input.dataset.userPermission, input.value === 'inherit' ? null : input.value === 'allow']));
    const data = { name: form.get('name'), email: form.get('email'), phone: form.get('phone'), active: form.get('active') === '1' };
    if (state.permissions.includes('roles.manage')) {
      data.role = form.get('role');
      data.role_ids = roleIds;
    }
    if (state.permissions.includes('permissions.assign')) data.permission_grants = grants;
    if (String(form.get('password') ?? '').trim()) data.password = form.get('password');
    try { await api.saveUser(data, state.userEditingId); const usersResult = await api.users(userDirectoryFilters()); state.users = usersResult.items; state.userMeta = usersResult.meta; state.userFormOpen = false; state.userEditingId = null; state.userForm = null; render(); } catch (error) { const message = document.querySelector('#userMessage'); if (message) message.textContent = error.message; }
  });
  document.querySelectorAll('[data-edit-role]').forEach((button) => button.addEventListener('click', () => { state.roleEditingId = button.dataset.editRole; render(); }));
  document.querySelector('#cancelRole')?.addEventListener('click', () => { state.roleEditingId = null; render(); });
  document.querySelector('#roleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const permissionKeys = [...document.querySelectorAll('[data-role-permission][aria-pressed="true"]')].map((button) => button.dataset.rolePermission);
    try { await api.updateRole(state.roleEditingId, { label: form.get('label'), permission_keys: permissionKeys }); state.roles = await api.roles(); state.roleEditingId = null; render(); } catch (error) { const message = document.querySelector('#roleMessage'); if (message) message.textContent = error.message; }
  });

  document.querySelectorAll('[data-report-widget]').forEach((widget) => {
    const index = [...document.querySelectorAll('[data-report-widget]')].indexOf(widget);
    widget.querySelector('[data-report-move="up"]')?.toggleAttribute('disabled', index <= 0);
    widget.querySelector('[data-report-move="down"]')?.toggleAttribute('disabled', index >= document.querySelectorAll('[data-report-widget]').length - 1);
    widget.querySelectorAll('[data-report-move]').forEach((button) => button.addEventListener('click', () => {
      moveReportWidget(widget, button.dataset.reportMove === 'up' ? -1 : 1);
    }));
    widget.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', widget.dataset.reportWidget ?? '');
      widget.classList.add('is-dragging');
    });
    widget.addEventListener('dragend', () => widget.classList.remove('is-dragging'));
    widget.addEventListener('dragover', (event) => event.preventDefault());
    widget.addEventListener('drop', (event) => {
      event.preventDefault();
      const source = event.dataTransfer?.getData('text/plain');
      const target = widget.dataset.reportWidget;
      if (!source || !target || source === target) return;
      const order = [...document.querySelectorAll('[data-report-widget]')].map((item) => item.dataset.reportWidget);
      const from = order.indexOf(source);
      const to = order.indexOf(target);
      if (from < 0 || to < 0) return;
      order.splice(from, 1);
      order.splice(to, 0, source);
      saveReportWidgetOrder(order);
    });
  });

  const routeForm = document.querySelector('#routeForm');
  routeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(routeForm);
    const id = String(form.get('id') ?? '').trim() || null;
    let stops = [];
    let segments = [];
    const message = document.querySelector('#routeMessage');
    try {
      stops = JSON.parse(String(form.get('stops') ?? '[]'));
      segments = JSON.parse(String(form.get('segments') ?? '[]'));
      if (!Array.isArray(stops) || stops.length < 2) throw new Error('Add at least two ordered stops.');
      if (stops.some((stop) => !stop.name)) throw new Error('Every stop needs a name.');
      await api.saveRoute({
        origin: form.get('origin'),
        destination: form.get('destination'),
        distance_km: Number(form.get('distance_km')),
        active: form.get('active') === '1',
        stops,
        segments,
      }, id);
      const routeImage = form.get('route_image');
      if (id && routeImage instanceof File && routeImage.size > 0) await api.uploadRouteImage(id, await optimizeImageForUpload(routeImage));
      message.textContent = 'Route saved.';
      state.routes = await api.routes();
      state.routeFormOpen = false;
      state.routeEditingId = null;
      state.routeEditor = null;
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelector('#addRoute')?.addEventListener('click', () => {
    state.routeFormOpen = true;
    state.routeEditingId = null;
    state.routeEditor = routeEditorFrom();
    render();
  });

  document.querySelector('#cancelRoute')?.addEventListener('click', () => {
    state.routeFormOpen = false;
    state.routeEditingId = null;
    state.routeEditor = null;
    render();
  });

  document.querySelectorAll('[data-edit-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const route = state.routes.find((item) => String(item.id) === button.dataset.editRoute);
      if (!route) return;
      state.routeFormOpen = true;
      state.routeEditingId = route.id;
      state.routeEditor = routeEditorFrom(route);
      render();
      const form = document.querySelector('#routeForm');
      form.elements.id.value = route.id;
      form.elements.origin.value = route.origin ?? '';
      form.elements.destination.value = route.destination ?? '';
      form.elements.distance_km.value = route.distance_km ?? 0;
      form.elements.active.value = route.active ? '1' : '0';
      syncRouteEditorPayload();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-deactivate-route]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Deactivate this route? Historical trips will be preserved.')) return;
      try {
        await api.deactivateRoute(button.dataset.deactivateRoute);
        state.routes = await api.routes();
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });

  bindRouteEditor();

  document.querySelector('#routeImageInput')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector('#routeImagePreview');
    if (!file || !preview) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      preview.textContent = 'Choose a JPG, PNG or WebP image under 5 MB.';
      return;
    }
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview of selected route image" />`;
  });
  document.querySelector('#removeRouteImage')?.addEventListener('click', async () => {
    const message = document.querySelector('#routeMessage');
    try { await api.deleteRouteImage(state.routeEditingId); state.routes = await api.routes(); state.routeEditingId = null; state.routeFormOpen = false; render(); }
    catch (error) { if (message) message.textContent = error.message; }
  });

  document.querySelectorAll('[data-cms-key]').forEach((input) => input.addEventListener('input', () => {
    const section = state.websiteContent.draft.sections[input.dataset.cmsKey];
    section[input.dataset.cmsField] = input.value;
    if (Number(section.order ?? 0) === 0) {
      const title = document.querySelector('.cms-preview h3');
      const description = document.querySelector('.cms-preview p');
      if (title) title.textContent = section.title || 'Section title';
      if (description) description.textContent = section.description || 'Your published content will keep the current website design.';
    }
    const message = document.querySelector('#cmsMessage');
    if (message) message.textContent = 'Unsaved changes · preview the wording here before publishing.';
  }));
  document.querySelector('#cmsImageSection')?.addEventListener('change', (event) => { state.cmsImageSection = event.target.value; render(); });
  document.querySelectorAll('[data-cms-image-section]').forEach((button) => button.addEventListener('click', () => {
    state.cmsImageSection = button.dataset.cmsImageSection;
    render();
    document.querySelector('.cms-media')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  document.querySelector('#cmsImageInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    const message = document.querySelector('#cmsMessage');
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      if (message) message.textContent = 'Choose a JPG, PNG or WebP image under 5 MB.';
      return;
    }
    try {
      const section = state.websiteContent.draft.sections[state.cmsImageSection];
      const optimized = await optimizeImageForUpload(file);
      const uploaded = await api.uploadWebsiteMedia(state.cmsImageSection, optimized);
      if (section.image_path && section.image_path !== uploaded.image_path) state.cmsPendingMediaDeletes.push(section.image_path);
      section.image_path = uploaded.image_path;
      section.image_url = uploaded.image_url;
      state.websiteMedia = [uploaded, ...state.websiteMedia.filter((asset) => asset.image_path !== uploaded.image_path)];
      const preview = document.querySelector('#cmsImagePreview');
      if (preview) preview.innerHTML = `<img src="${esc(publicAssetUrl(uploaded.image_url))}" alt="Website section preview" />`;
      render();
      const status = document.querySelector('#cmsMessage');
      if (status) status.textContent = 'Image uploaded. Save the draft or publish the section to use it on the website.';
    } catch (error) { if (message) message.textContent = error.message; }
  });
  document.querySelector('#cmsRemoveImage')?.addEventListener('click', () => {
    const section = state.websiteContent.draft.sections[state.cmsImageSection];
    if (section?.image_path) state.cmsPendingMediaDeletes.push(section.image_path);
    if (section) { section.image_path = null; section.image_url = null; }
    render();
  });
  document.querySelectorAll('[data-cms-use-media]').forEach((button) => button.addEventListener('click', () => {
    const asset = state.websiteMedia.find((item) => item.image_path === button.dataset.cmsUseMedia);
    const section = state.websiteContent.draft.sections[state.cmsImageSection];
    if (!asset || !section) return;
    if (section.image_path && section.image_path !== asset.image_path) state.cmsPendingMediaDeletes.push(section.image_path);
    section.image_path = asset.image_path;
    section.image_url = publicAssetUrl(asset.image_url);
    render();
    const message = document.querySelector('#cmsMessage');
    if (message) message.textContent = 'Library image selected. Save the draft or publish to apply it.';
  }));
  document.querySelectorAll('[data-cms-delete-media]').forEach((button) => button.addEventListener('click', async () => {
    const imagePath = button.dataset.cmsDeleteMedia;
    const message = document.querySelector('#cmsMessage');
    const referencedInDraft = Object.values(state.websiteContent.draft.sections ?? {}).some((section) => section.image_path === imagePath);
    if (referencedInDraft) {
      if (message) message.textContent = 'Remove this image from each draft section and publish before deleting it from the library.';
      return;
    }
    try {
      await api.deleteWebsiteMedia(imagePath);
      state.websiteMedia = state.websiteMedia.filter((asset) => asset.image_path !== imagePath);
      render();
      const status = document.querySelector('#cmsMessage');
      if (status) status.textContent = 'Image deleted from the library.';
    } catch (error) { if (message) message.textContent = error.message; }
  }));
  document.querySelectorAll('[data-cms-enabled]').forEach((input) => input.addEventListener('change', () => { state.websiteContent.draft.sections[input.dataset.cmsEnabled].enabled = input.checked; }));
  document.querySelectorAll('[data-cms-faq]').forEach((input) => input.addEventListener('input', () => { state.websiteContent.draft.faqs[Number(input.dataset.index)][input.dataset.cmsFaq] = input.value; }));
  document.querySelectorAll('[data-cms-faq-visible]').forEach((input) => input.addEventListener('change', () => { state.websiteContent.draft.faqs[Number(input.dataset.cmsFaqVisible)].enabled = input.checked; }));
  document.querySelectorAll('[data-cms-move]').forEach((button) => button.addEventListener('click', () => {
    const ordered = Object.entries(state.websiteContent.draft.sections).sort((a,b)=>Number(a[1].order??0)-Number(b[1].order??0));
    const i = ordered.findIndex(([key]) => key === button.dataset.cmsMove);
    const j = i + Number(button.dataset.direction);
    if (j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    ordered.forEach(([, section], order) => { section.order = order; });
    render();
  }));
  document.querySelector('#cmsAddFaq')?.addEventListener('click', () => { state.websiteContent.draft.faqs.push({ question: '', answer: '', enabled: true }); render(); });
  document.querySelectorAll('[data-cms-faq-remove]').forEach((button) => button.addEventListener('click', () => { state.websiteContent.draft.faqs.splice(Number(button.dataset.cmsFaqRemove), 1); render(); }));
  document.querySelector('#cmsReload')?.addEventListener('click', async () => {
    const button = document.querySelector('#cmsReload');
    if (button) { button.disabled = true; button.textContent = 'Loading…'; }
    try {
      state.websiteContent = await api.websiteContent();
      state.websiteMedia = await api.websiteMedia();
      state.cmsPendingMediaDeletes = [];
      render();
    } catch (error) {
      const message = document.querySelector('#cmsMessage');
      if (message) message.textContent = error.message;
      if (button) { button.disabled = false; button.textContent = 'Reload content'; }
    }
  });
  document.querySelector('#cmsDiscard')?.addEventListener('click', async () => { state.websiteContent = await api.websiteContent(); state.cmsPendingMediaDeletes = []; render(); });
  const saveCms = async (publish) => {
    const message = document.querySelector('#cmsMessage');
    try {
      state.websiteContent.draft = publish
        ? await api.publishWebsiteContent(state.websiteContent.draft)
        : await api.saveWebsiteDraft(state.websiteContent.draft);
      if (publish) state.websiteContent.published = state.websiteContent.draft;
      if (publish && state.cmsPendingMediaDeletes.length) {
        const pending = [...new Set(state.cmsPendingMediaDeletes)];
        state.cmsPendingMediaDeletes = [];
        for (const imagePath of pending) {
          try {
            await api.deleteWebsiteMedia(imagePath);
            state.websiteMedia = state.websiteMedia.filter((asset) => asset.image_path !== imagePath);
          }
          catch {}
        }
      }
      if (message) message.textContent = publish ? 'Website content published.' : 'Draft saved. It is not public yet.';
    } catch (error) { if (message) message.textContent = error.message; }
  };
  document.querySelector('#cmsSave')?.addEventListener('click', () => saveCms(false));
  document.querySelector('#cmsPublish')?.addEventListener('click', () => saveCms(true));

  document.querySelector('#driverForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#driverMessage');
    try {
      const id = String(form.get('id') ?? '').trim() || null;
      const driver = await api.saveDriver({
        name: form.get('name'),
        license_number: form.get('license_number'),
        status: form.get('status'),
      }, id);
      const photo = form.get('photo');
      if (photo instanceof File && photo.size > 0) await api.uploadDriverPhoto(driver.id, photo);
      state.drivers = await api.drivers();
      state.driverFormOpen = false;
      state.driverEditingId = null;
      render();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.querySelector('#addDriver')?.addEventListener('click', () => {
    state.driverFormOpen = true;
    state.driverEditingId = null;
    render();
  });

  document.querySelector('#cancelDriverForm')?.addEventListener('click', () => {
    state.driverFormOpen = false;
    state.driverEditingId = null;
    render();
  });

  document.querySelectorAll('[data-edit-driver]').forEach((button) => {
    button.addEventListener('click', () => {
      const driver = state.drivers.find((item) => String(item.id) === button.dataset.editDriver);
      if (!driver) return;
      state.driverFormOpen = true;
      state.driverEditingId = driver.id;
      render();
      const form = document.querySelector('#driverForm');
      form.elements.name.value = driver.name ?? '';
      form.elements.license_number.value = driver.license_number ?? '';
      form.elements.status.value = driver.status ?? 'pending';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-deactivate-driver]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Deactivate this driver? Their history will be preserved.')) return;
      try {
        await api.deactivateDriver(button.dataset.deactivateDriver);
        state.drivers = await api.drivers();
        render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
  });

  document.querySelector('#generateVehicleLayout')?.addEventListener('click', () => {
    const draft = captureVehicleDraft() ?? {};
    const capacity = Number(document.querySelector('#vehicleCapacity')?.value ?? 0);
    const perRow = Number(document.querySelector('#vehiclePositionsPerRow')?.value ?? 4);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
      const message = document.querySelector('#vehicleMessage');
      if (message) message.textContent = 'Enter a capacity from 1 to 500 before generating seat numbers.';
      return;
    }
    state.vehicleSeatLayout = Array.from({ length: capacity }, (_, index) => ({
      seat_number: String(index + 1), row_number: Math.floor(index / perRow) + 1,
      position_index: index % perRow + 1, seat_class: 'standard', seat_type: 'seat',
      active: true, window: false, aisle: false, accessible: false, blocked: false,
    }));
    draft.capacity = capacity;
    state.vehicleDraft = draft;
    render();
  });
  document.querySelector('#addVehicleSeat')?.addEventListener('click', () => {
    const draft = captureVehicleDraft() ?? {};
    const next = (state.vehicleSeatLayout?.length ?? 0) + 1;
    const perRow = Number(document.querySelector('#vehiclePositionsPerRow')?.value ?? 4);
    state.vehicleSeatLayout.push({ seat_number: String(next), row_number: Math.ceil(next / perRow), position_index: (next - 1) % perRow + 1, seat_class: 'standard', seat_type: 'seat', active: true, window: false, aisle: false, accessible: false, blocked: false });
    draft.capacity = next;
    state.vehicleDraft = draft;
    render();
  });
  document.querySelectorAll('[data-vehicle-seat]').forEach((input) => input.addEventListener(input.type === 'text' ? 'input' : 'change', () => {
    const seat = state.vehicleSeatLayout[Number(input.dataset.vehicleSeat)];
    if (!seat) return;
    const field = input.dataset.seatField;
    if (field === 'accessible_flag') seat.accessible = input.checked;
    else if (['active', 'window', 'aisle', 'blocked'].includes(field)) seat[field] = input.checked;
    else if (['row_number', 'position_index'].includes(field)) seat[field] = Number(input.value);
    else seat[field] = input.value;
  }));
  document.querySelectorAll('[data-remove-vehicle-seat]').forEach((button) => button.addEventListener('click', () => {
    const draft = captureVehicleDraft() ?? {};
    state.vehicleSeatLayout.splice(Number(button.dataset.removeVehicleSeat), 1);
    draft.capacity = state.vehicleSeatLayout.length;
    state.vehicleDraft = draft;
    render();
  }));
  document.querySelector('#cancelVehicleEdit')?.addEventListener('click', () => {
    state.vehicleEditingId = null;
    state.vehicleSeatLayout = [];
    state.vehicleDraft = null;
    render();
  });
  document.querySelectorAll('[data-edit-vehicle]').forEach((button) => button.addEventListener('click', () => {
    const bus = state.vehicles.find((item) => String(item.id) === String(button.dataset.editVehicle));
    if (!bus) return;
    state.vehicleEditingId = bus.id;
    state.vehicleSeatLayout = (bus.seats ?? []).map((seat) => ({ ...seat }));
    state.vehicleDraft = { code: bus.code, plate: bus.plate, status: bus.status, capacity: bus.seats?.length ?? bus.capacity, positionsPerRow: '4' };
    render();
    document.querySelector('#vehicleForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  document.querySelector('#vehicleForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = document.querySelector('#vehicleMessage');
    try {
      if (!state.vehicleSeatLayout.length) throw new Error('Add or generate at least one seat before saving this vehicle.');
      const vehicle = await api.saveVehicle({
        code: form.get('code'),
        plate: form.get('plate'),
        capacity: state.vehicleSeatLayout.length,
        status: form.get('status'),
        seats: state.vehicleSeatLayout.map(({ seat_number, row_number, position_index, seat_class, seat_type, active, window, aisle, accessible, blocked }) => ({ seat_number: String(seat_number).trim(), row_number: Number(row_number), position_index: Number(position_index), seat_class, seat_type, active, window, aisle, accessible, blocked })),
      }, state.vehicleEditingId);
      state.vehicles = await api.vehicles();
      state.vehicleEditingId = null;
      state.vehicleSeatLayout = [];
      state.vehicleDraft = null;
      render();
    } catch (error) {
      if (message) message.textContent = error.message;
    }
  });
}

const isAdmin = await ensureAdmin();

if (isAdmin) {
  await loadModule();
} else if (!location.pathname.startsWith('/login')) {
  render();
}
