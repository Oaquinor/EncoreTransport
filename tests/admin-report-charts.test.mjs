import assert from 'node:assert/strict';
import { reportView } from '../apps/admin-dashboard/src/views.mjs';

const html = reportView('executive', {
  trips: { total: 12, completed: 8, cancelled: 1 },
  bookings: { total: 24, confirmed: 18, pending: 4, cancelled: 2 },
  payments: { paid: 18, revenue_minor: 128500 },
  occupancy: { occupied: 38, available: 17, capacity: 55, rate: 69.1 },
  fleet: { active: 3 },
  incidents: 2,
  incident_breakdown: {
    severity: { high: 1, medium: 1, low: 0 },
    status: { open: 1, resolved: 1 },
  },
  daily: [
    { date: '2026-10-24', trips: 2, bookings: 5, revenue_minor: 15000 },
    { date: '2026-10-25', trips: 3, bookings: 7, revenue_minor: 23000 },
  ],
  upcoming: [],
  cargo: { received: 1, in_transit: 1, delivered: 0 },
});

assert.match(html, /Trips and bookings by day/);
assert.match(html, /Paid revenue by day/);
assert.match(html, /Booking status mix/);
assert.match(html, /Incident risk and status/);
assert.match(html, /role="img" aria-label="Daily paid revenue"/);
assert.match(html, /Confirmed/);
assert.match(html, /high/);
assert.match(html, /2026-10-25/);
assert.match(html, /class="revenue-bar"/);
assert.match(html, /data-report-move="up"/);
assert.match(html, /data-report-move="down"/);
assert.match(html, /aria-label="Move At a glance up"/);

const emptyHtml = reportView('executive', {
  period: { from: '2026-11-01', to: '2026-11-07' },
  trips: { total: 0, completed: 0, cancelled: 0 },
  bookings: { total: 0, confirmed: 0, pending: 0, cancelled: 0 },
  payments: { paid: 0, revenue_minor: 0 },
  occupancy: { occupied: 0, available: 0, capacity: 0, rate: null },
  incidents: 0,
  daily: [{ date: '2026-11-01', trips: 0, bookings: 0, revenue_minor: 0 }],
  upcoming: [{ date: '2026-11-08', time: '08:00', route: 'Georgetown → New Amsterdam' }],
});
assert.match(emptyHtml, /Activity window/);
assert.match(emptyHtml, /No trip or booking activity in the selected window/);
assert.match(emptyHtml, /No paid revenue in the selected window/);
assert.match(emptyHtml, /1 scheduled/);
console.log('admin-report-charts.test.mjs: OK');
