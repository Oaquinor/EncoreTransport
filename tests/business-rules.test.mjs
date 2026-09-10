import assert from 'node:assert/strict';
import { calculateTripPrice, canTransitionTrip, getAvailableSeats, nextDriverState, reserveSeats, searchTrips } from '../packages/shared/business-rules.mjs';
import { driverStatuses, tripStatuses } from '../packages/shared/domain.mjs';
import { mockTrips } from '../packages/shared/mock-data.mjs';

const targetTrip = mockTrips[0];

assert.equal(calculateTripPrice(targetTrip, 2), 665);
assert.equal(searchTrips(mockTrips, { origin: 'Ciudad', destination: 'Puebla', date: '2026-09-12', passengers: 2 }).length, 1);
assert.ok(getAvailableSeats(targetTrip).length > 0);
assert.equal(canTransitionTrip(tripStatuses.boarding, tripStatuses.inProgress), true);
assert.equal(canTransitionTrip(tripStatuses.completed, tripStatuses.boarding), false);
assert.equal(nextDriverState(driverStatuses.next), driverStatuses.active);

const reservation = reserveSeats(targetTrip, ['1A', '1B']);
assert.equal(reservation.unavailableSeats.length, 0);
assert.equal(reservation.updatedTrip.seatsAvailable, targetTrip.seatsAvailable - 2);

console.log('Business rules tests passed');