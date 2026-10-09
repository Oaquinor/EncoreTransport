import type { AuthResponse, Booking, BookingPassengerInput, Driver, Incident, MapJourney, Passenger, Quote, Route, Seat, Trip, TripSearchFilters, User, Vehicle } from '@encore/types';

export class ApiError extends Error {
  constructor(public status:number, message:string, public payload:unknown=null){ super(message); }
}

export interface EncoreApiClientOptions { baseUrl?:string; token?:string|null; }

export class EncoreApiClient {
  private baseUrl:string;
  private token:string|null;

  constructor(options:EncoreApiClientOptions={}) {
    this.baseUrl=(options.baseUrl??'/api/v1').replace(/\/$/,'');
    this.token=options.token??null;
  }

  setToken(token:string|null){ this.token=token; }
  getToken(){ return this.token; }

  private normalizeTrip(raw:any):Trip {
    return {
      ...raw,
      id:raw.id,
      routeId:String(raw.routeId??raw.transport_route_id??''),
      routeName:raw.routeName??'',
      origin:raw.origin??'',
      destination:raw.destination??'',
      date:raw.date??'',
      departureTime:raw.departureTime??'',
      arrivalTime:raw.arrivalTime??'',
      durationMinutes:Number(raw.durationMinutes??0),
      baseFare:Number(raw.baseFare??raw.price_per_passenger??0),
      demandMultiplier:Number(raw.demandMultiplier??1),
      serviceFee:Number(raw.serviceFee??0),
      occupancy:Number(raw.occupancy??0),
      seatsAvailable:Number(raw.seatsAvailable??raw.availableSeats??0),
      availableSeats:Number(raw.availableSeats??raw.seatsAvailable??0),
      busId:String(raw.busId??raw.bus_id??''),
      driverId:String(raw.driverId??raw.driver_id??''),
      status:raw.status??'scheduled',
      featured:Boolean(raw.featured??false),
      highlights:Array.isArray(raw.highlights)?raw.highlights:[],
      seatMap:Array.isArray(raw.seatMap)?raw.seatMap:[]
    };
  }

  private async request<T>(path:string, init:RequestInit={}):Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept','application/json');
    if(init.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
    if(this.token) headers.set('Authorization',`Bearer ${this.token}`);

    const response = await fetch(`${this.baseUrl}${path}`, {...init, headers});
    const payload = response.status===204 ? null : await response.json().catch(()=>null);

    if(!response.ok) {
      const validation = (payload as any)?.errors
        ? Object.values((payload as any).errors).flat().join(' ')
        : '';
      throw new ApiError(response.status, validation || (payload as any)?.message || `Request failed (${response.status})`, payload);
    }

    return payload as T;
  }

  async register(name:string,email:string,password:string,phone?:string){
    const r=await this.request<AuthResponse>('/auth/register',{method:'POST',body:JSON.stringify({name,email,phone,password,password_confirmation:password})});
    this.token=r.token;
    return r;
  }
  async login(email:string,password:string){ const r=await this.request<AuthResponse>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}); this.token=r.token; return r; }
  me(){ return this.request<{user:User}>('/auth/me'); }
  async logout(){ const r=await this.request<{message:string}>('/auth/logout',{method:'POST'}); this.token=null; return r; }

  routes(){ return this.request<{data:Route[]}>('/routes'); }
  route(id:number|string){ return this.request<{data:Route}>(`/routes/${id}`); }
  async searchTrips(filters:TripSearchFilters){ const p=new URLSearchParams(); if(filters.origin)p.set('origin',filters.origin); if(filters.destination)p.set('destination',filters.destination); if(filters.date)p.set('date',filters.date); p.set('passengers',String(filters.passengers||1)); const r=await this.request<{data:any[]}>(`/trips/search?${p}`); return {data:r.data.map(x=>this.normalizeTrip(x))}; }
  async trip(id:number|string){ const r=await this.request<{data:any}>(`/trips/${id}`); return {data:this.normalizeTrip(r.data)}; }
  seats(id:number|string){ return this.request<{data:Seat[]}>(`/trips/${id}/seats`); }
  quote(id:number|string,passengers:number){ return this.request<{data:Quote}>(`/trips/${id}/quote?passengers=${passengers}`); }
  mapJourney(origin:string,destination:string){ const p=new URLSearchParams({origin,destination}); return this.request<{data:MapJourney}>(`/maps/journey?${p}`); }

  bookings(){ return this.request<{data:Booking[]}>('/bookings'); }
  booking(id:number|string){ return this.request<{data:Booking}>(`/bookings/${id}`); }
  createBooking(tripId:number|string, seatIds:number[], passengers:BookingPassengerInput[]){ return this.request<{data:Booking}>('/bookings',{method:'POST',body:JSON.stringify({trip_id:Number(tripId),seat_ids:seatIds,passengers})}); }
  cancelBooking(id:number|string){ return this.request<{data:Booking}>(`/bookings/${id}/cancel`,{method:'POST'}); }
  bookingPayments(id:number|string){ return this.request(`/bookings/${id}/payments`); }
  initiatePayment(id:number|string,idempotencyKey:string){ return this.request(`/bookings/${id}/payments`,{method:'POST',body:JSON.stringify({idempotency_key:idempotencyKey})}); }
  ticket(id:number|string){ return this.request(`/bookings/${id}/ticket`); }
  validateTicket(publicId:string, token:string){ return this.request('/tickets/validate',{method:'POST',body:JSON.stringify({public_id:publicId,token})}); }
}

export const createEncoreApiClient = (options:EncoreApiClientOptions={}) => new EncoreApiClient(options);
export type { Driver, Incident, Passenger, Route, Trip, Vehicle };
