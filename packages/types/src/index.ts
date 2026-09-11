export type TripStatus = 'scheduled' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
export type DriverStatus = 'next' | 'active' | 'finished';
export type BookingStatus = 'draft' | 'pending_payment' | 'confirmed' | 'cancelled';
export type SeatStatus = 'available' | 'selected' | 'occupied' | 'reserved' | 'unavailable';
export type PaymentStatus = 'idle' | 'initializing' | 'processing' | 'pending' | 'success' | 'failed' | 'cancelled';
export type Role = 'passenger' | 'driver' | 'operations';
export type Permission =
  | 'view_trips'
  | 'manage_trips'
  | 'manage_drivers'
  | 'manage_vehicles'
  | 'view_finance'
  | 'manage_bookings'
  | 'manage_users'
  | 'view_reports';

export interface Route {
  id: string;
  origin: string;
  destination: string;
  durationMinutes: number;
}

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  sequence: number;
  plannedArrivalTime?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  capacity: number;
  features: string[];
  status: string;
}

export interface Driver {
  id: string;
  name: string;
  license: string;
  status: DriverStatus;
}

export interface Passenger {
  id: string;
  name: string;
  idNumber: string;
  status: string;
}

export interface Seat {
  id: string;
  label: string;
  reserved: boolean;
  blocked: boolean;
  window?: boolean;
  aisle?: boolean;
}

export interface SeatMap {
  vehicleId?: string;
  seats: Seat[];
}

export interface Trip {
  id: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  baseFare: number;
  demandMultiplier: number;
  serviceFee: number;
  occupancy: number;
  seatsAvailable: number;
  busId: string;
  driverId: string;
  status: TripStatus;
  featured: boolean;
  highlights: string[];
  seatMap: Seat[];
}

export interface BookingPassenger {
  id?: string;
  name: string;
  email: string;
  phone: string;
  documentId: string;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  tripId: string;
  seatIds: string[];
  passengerCount: number;
  passengers?: BookingPassenger[];
  total: number;
  totalLabel: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

export interface PaymentAttempt {
  id: string;
  bookingId: string;
  provider: string;
  status: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  bookingId: string;
  bookingCode: string;
  passengerName: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatLabel: string;
  status: BookingStatus;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  tripId: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

export interface TripSearchFilters {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

export interface TripSearchResult extends Trip {
  availableSeats: number;
  priceLabel: string;
}
