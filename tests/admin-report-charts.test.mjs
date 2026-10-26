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
console.log('admin-report-charts.test.mjs: OK');
