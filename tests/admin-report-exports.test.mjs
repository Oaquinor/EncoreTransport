import assert from 'node:assert/strict';
import { reportExportTable, reportFilename, reportToCsv, reportToJson } from '../apps/admin-dashboard/src/report-export.mjs';

const bookings = {
  period: { from: '2026-10-01', to: '2026-10-31' },
  items: [{ reference: '=HYPERLINK("https://example.test")', passenger: 'Martinez, Ana', seats: ['1A', '1B'] }],
};
const csv = reportToCsv('bookings', bookings);
assert.match(csv, /"reference"/);
assert.ok(csv.includes(String.raw`"'=HYPERLINK(""https://example.test"")"`));
assert.match(csv, /"Martinez, Ana"/);
assert.match(csv, /"1A, 1B"/);

const executive = reportExportTable('executive', {
  trips: { total: 4, completed: 3 },
  upcoming: [{ date: '2026-10-28', time: '08:00', route: 'Georgetown → New Amsterdam' }],
});
assert.equal(executive.headers[0], 'Section');
assert.ok(executive.rows.some(([section, metric]) => section === 'Trips' && metric === 'Total'));
assert.ok(executive.rows.some(([section]) => section === 'Upcoming departure'));

assert.equal(JSON.parse(reportToJson('bookings', bookings)).items.length, 1);
assert.equal(reportFilename('../../reports', 'csv'), 'encore-reports-report.csv');

console.log('admin-report-exports.test.mjs: OK');
