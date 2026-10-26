const reportColumns = {
  bookings: ['reference', 'created_at', 'trip_date', 'route', 'vehicle', 'passenger', 'passenger_count', 'seats', 'amount', 'status', 'payment_status'],
  revenue: ['payment_reference', 'paid_at', 'booking_reference', 'route', 'amount', 'currency', 'gateway'],
  incidents: ['id', 'reported_at', 'route', 'driver', 'title', 'severity', 'status', 'resolved_at'],
  packages: ['reference', 'created_at', 'route', 'driver', 'status', 'delivered_at'],
  schedules: ['date', 'starts_at', 'ends_at', 'driver', 'vehicle', 'route', 'status'],
  travel: ['trip_id', 'date', 'route', 'vehicle', 'driver', 'occupied_seats', 'status'],
  vehicles: ['code', 'plate', 'trips', 'completed_trips', 'latest_vehicle_status', 'status', 'capacity'],
  trips: ['id', 'date', 'departure_time', 'arrival_time', 'route', 'bus', 'driver', 'status', 'available_seats', 'bookings', 'incidents'],
};

function executiveRows(data) {
  const rows = [
    ['Overview', 'Period', `${data.period?.from ?? ''} – ${data.period?.to ?? ''}`],
    ['Trips', 'Total', data.trips?.total ?? 0],
    ['Trips', 'Completed', data.trips?.completed ?? 0],
    ['Trips', 'Cancelled', data.trips?.cancelled ?? 0],
    ['Bookings', 'Total', data.bookings?.total ?? 0],
    ['Bookings', 'Confirmed', data.bookings?.confirmed ?? 0],
    ['Bookings', 'Pending', data.bookings?.pending ?? 0],
    ['Bookings', 'Cancelled', data.bookings?.cancelled ?? 0],
    ['Payments', 'Paid transactions', data.payments?.paid ?? 0],
    ['Payments', 'Revenue minor units', data.payments?.revenue_minor ?? 0],
    ['Occupancy', 'Rate percent', data.occupancy?.rate ?? ''],
    ['Occupancy', 'Occupied seats', data.occupancy?.occupied ?? 0],
    ['Occupancy', 'Available seats', data.occupancy?.available ?? 0],
    ['Occupancy', 'Capacity', data.occupancy?.capacity ?? 0],
    ['Fleet', 'Active vehicles', data.fleet?.active ?? 0],
    ['Fleet', 'Total vehicles', data.fleet?.total ?? 0],
    ['Incidents', 'Total', data.incidents ?? 0],
    ['Packages', 'Received', data.cargo?.received ?? 0],
    ['Packages', 'In transit', data.cargo?.in_transit ?? 0],
    ['Packages', 'Delivered', data.cargo?.delivered ?? 0],
  ];
  for (const day of data.daily ?? []) {
    rows.push(['Daily activity', day.date, JSON.stringify({ trips: day.trips, bookings: day.bookings, revenue_minor: day.revenue_minor })]);
  }
  for (const trip of data.upcoming ?? []) {
    rows.push(['Upcoming departure', `${trip.date ?? ''} ${trip.time ?? ''}`, JSON.stringify({ route: trip.route, vehicle: trip.vehicle, driver: trip.driver, available_seats: trip.available_seats, status: trip.status })]);
  }
  return { headers: ['Section', 'Metric', 'Value'], rows };
}

function cellValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${item ?? ''}`).join('; ');
  return String(value);
}

export function reportExportTable(type, data = {}) {
  if (type === 'executive') return executiveRows(data);
  if (type === 'trip-costs') {
    return {
      headers: ['Period from', 'Period to', 'Available', 'Missing cost sources', 'Message'],
      rows: [[data.period?.from ?? '', data.period?.to ?? '', data.available ? 'yes' : 'no', (data.missing_sources ?? []).join(', '), data.message ?? '']],
    };
  }
  const columns = reportColumns[type] ?? Object.keys(data.items?.[0] ?? {});
  return {
    headers: columns,
    rows: (data.items ?? []).map((item) => columns.map((key) => cellValue(item[key]))),
  };
}

function csvField(value) {
  let text = cellValue(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportToCsv(type, data = {}) {
  const { headers, rows } = reportExportTable(type, data);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n')}`;
}

export function reportToJson(type, data = {}) {
  return JSON.stringify({ report: type, generated_at: new Date().toISOString(), ...data }, null, 2);
}

export function reportFilename(type, extension) {
  const safeType = String(type).replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'report';
  return `encore-${safeType}-report.${extension}`;
}
