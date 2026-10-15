/**
 * Stable API facade.
 *
 * Application code imports from this file so the internal API organization
 * can evolve without forcing every app to change its import paths.
 */

export {
  ApiError,
  getApiToken,
  requestJson,
  setApiToken,
} from './api/core.mjs';

export {
  login,
  logout,
  me,
  register,
} from './api/auth.mjs';

export {
  fetchPassengerSearch,
  fetchRoute,
  fetchRoutes,
  fetchTripDetails,
  fetchTripSeats,
  health,
  mapJourney,
  publicTrackPackage,
  quoteTrip,
} from './api/public.mjs';

export {
  cancelBooking,
  createBooking,
  fetchBooking,
  fetchTicket,
  initiatePayment,
  listBookingPayments,
  listBookings,
  validateTicket,
} from './api/bookings.mjs';

export {
  boardPassenger,
  completeDriverTrip,
  createIncident,
  createPackage,
  fetchDriverPassengers,
  fetchDriverProfile,
  fetchDriverSchedule,
  fetchDriverTrip,
  sendDriverLocation,
  startDriverTrip,
  updatePackageStatus,
  updateVehicleStatus,
} from './api/driver.mjs';

export {
  fetchAdminDashboard,
  fetchAdminIncidents,
  fetchAdminPackages,
  fetchAdminReport,
  fetchAdminSchedules,
  fetchTravelReport,
  fetchTripCostReport,
  fetchTripReport,
  fetchVehicleReport,
  fetchVehicleStatuses,
  saveAdminSchedule,
  updateAdminIncident,
} from './api/admin.mjs';
