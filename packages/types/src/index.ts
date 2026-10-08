export type TripStatus = 'scheduled' | 'boarding' | 'in_progress' | 'completed' | 'cancelled';
export type DriverStatus = 'next' | 'active' | 'finished' | 'upcoming';
export type BookingStatus = 'draft' | 'pending_payment' | 'confirmed' | 'cancelled' | 'expired';
export type SeatStatus = 'available' | 'selected' | 'occupied' | 'reserved' | 'unavailable';
export type PaymentStatus = 'idle' | 'initializing' | 'processing' | 'pending' | 'paid' | 'success' | 'failed' | 'cancelled' | 'refunded';
export type Role = 'passenger' | 'driver' | 'admin' | 'operations';
export type Permission = 'view_trips'|'manage_trips'|'manage_drivers'|'manage_vehicles'|'view_finance'|'manage_bookings'|'manage_users'|'view_reports';

export interface Route { id:string|number; origin:string; destination:string; durationMinutes?:number; distance_km?:number|null; duration_seconds?:number|null; active?:boolean; }
export interface Stop { id:string|number; routeId?:string|number; name:string; sequence:number; plannedArrivalTime?:string; latitude?:number|null; longitude?:number|null; }
export interface Vehicle { id:string|number; plate:string; name?:string; code?:string; capacity:number; features:string[]; status:string; }
export interface Driver { id:string|number; name:string; license?:string; license_number?:string; status:DriverStatus|string; }
export interface Passenger { id:string|number; name:string; idNumber?:string; status:string; }
export interface Seat { id:number|string; label?:string; seat_number?:string; seat_class?:string; reserved:boolean; blocked:boolean; available?:boolean; window?:boolean; aisle?:boolean; }
export interface SeatMap { vehicleId?:string; seats:Seat[]; }
export interface Trip { id:string|number; routeId:string; routeName:string; origin:string; destination:string; date:string; departureTime:string; arrivalTime:string; durationMinutes:number; baseFare:number; demandMultiplier:number; serviceFee:number; occupancy:number; seatsAvailable:number; availableSeats?:number; busId:string; busCode?:string|null; busPlate?:string|null; busCapacity?:number|null; driverId:string; driverName?:string|null; status:TripStatus; featured:boolean; highlights:string[]; seatMap:Seat[]; startedAt?:string|null; completedAt?:string|null; route?:Route; }
export interface BookingPassenger { id?:string|number; name?:string; full_name?:string; email?:string; phone?:string; documentId?:string; document_number?:string; status?:string; boarded_at?:string|null; }
export interface BookingPassengerInput { full_name:string; document_number?:string; email?:string; phone?:string; }
export interface Booking { id:string|number; public_id?:string; reference?:string; status:BookingStatus; tripId?:string|number; trip_id?:number; seatIds?:Array<string|number>; seat_numbers?:string[]; passengerCount?:number; passengers?:BookingPassenger[]; total?:number; total_amount?:number; totalLabel?:string; createdAt?:string; expires_at?:string|null; trip?:Trip; }
export interface Payment { id:string|number; bookingId?:string|number; booking_id?:number; status:PaymentStatus; amount?:number; amount_minor?:number; currency:string; gateway?:string; }
export interface PaymentAttempt { id:string|number; bookingId:string|number; provider:string; status:PaymentStatus; idempotencyKey:string; createdAt:string; }
export interface Ticket { id:string|number; bookingId?:string|number; bookingCode?:string; passengerName?:string; origin?:string; destination?:string; departureTime?:string; seatLabel?:string; status:BookingStatus|string; }
export interface Incident { id:string|number; title?:string; severity?:'low'|'medium'|'high'; type?:string; priority?:string; description?:string; status?:string; tripId?:string|number; trip_id?:number; }
export interface Location { latitude:number; longitude:number; updatedAt?:string; recorded_at?:string; heading?:number|null; speed_kph?:number|null; }
export interface Notification { id:string|number; title:string; body:string; readAt?:string; createdAt:string; }
export interface User { id:number|string; name:string; email:string; role:Role; permissions?:Permission[]; phone?:string|null; active:boolean; }
export interface TripSearchFilters { origin:string; destination:string; date:string; passengers:number; }
export interface TripSearchResult extends Trip { availableSeats:number; priceLabel:string; }
export interface AuthResponse { token:string; token_type:'Bearer'; expires_at:string; user:User; }
export interface Quote { currency:string; base_fare:number; passengers:number; fees:number; discounts:number; taxes:number; subtotal:number; total:number; }
export interface MapJourney { origin:{name?:string|null;latitude:number;longitude:number}; destination:{name?:string|null;latitude:number;longitude:number}; route:{distanceMeters:number;durationSeconds:number;trafficDelaySeconds:number;points:Array<{latitude:number;longitude:number}>}; }
