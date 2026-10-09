import { appConfig } from './app-config.mjs';

const TOKEN_KEY='encore_api_token';
export const getApiToken=()=>sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY) ?? '';
export const setApiToken=(token,{persistent=false}={})=>{
  sessionStorage.removeItem(TOKEN_KEY);localStorage.removeItem(TOKEN_KEY);
  if(token)(persistent?localStorage:sessionStorage).setItem(TOKEN_KEY,token);
};

export class ApiError extends Error{
  constructor(message,status=0,payload=null){super(message);this.name='ApiError';this.status=status;this.payload=payload;}
}

export async function requestJson(path,options={}){
  const headers=new Headers(options.headers??{});headers.set('Accept','application/json');
  if(options.body && !(options.body instanceof FormData))headers.set('Content-Type','application/json');
  const token=options.token===false?'':(options.token??getApiToken());if(token)headers.set('Authorization',`Bearer ${token}`);
  let response;
  try{response=await fetch(`${appConfig.apiBaseUrl}${path}`,{...options,headers});}
  catch(error){throw new ApiError('Unable to reach Encore Transport. Check your connection and try again.',0,{cause:error?.message});}
  let payload=null;try{payload=await response.json();}catch{payload=null;}
  if(!response.ok){const validation=payload?.errors?Object.values(payload.errors).flat().join(' '):'';throw new ApiError(validation||payload?.message||`Request failed (${response.status}).`,response.status,payload);}
  return payload;
}

export async function health(){return requestJson('/health',{token:false});}

export async function login(email,password,persistent=false){const payload=await requestJson('/auth/login',{method:'POST',token:false,body:JSON.stringify({email,password})});setApiToken(payload.token,{persistent});return payload;}
export async function register(body){const payload=await requestJson('/auth/register',{method:'POST',token:false,body:JSON.stringify(body)});setApiToken(payload.token);return payload;}
export async function logout(){try{await requestJson('/auth/logout',{method:'POST'});}finally{setApiToken('');}}
export async function me(){return requestJson('/auth/me');}

export async function fetchRoutes(){const p=await requestJson('/routes',{token:false});return p.data??[];}
export async function fetchRoute(id){const p=await requestJson(`/routes/${encodeURIComponent(id)}`,{token:false});return p.data??p;}
export async function fetchPassengerSearch(filters={}){const q=new URLSearchParams();if(filters.origin)q.set('origin',filters.origin);if(filters.destination)q.set('destination',filters.destination);if(filters.date)q.set('date',filters.date);q.set('passengers',String(filters.passengers??1));const p=await requestJson(`/trips/search?${q}`,{token:false});const trips=p.data??[];return{filters,trips,total:trips.length};}
export async function fetchTripDetails(id){const p=await requestJson(`/trips/${encodeURIComponent(id)}`,{token:false});return p.data??p;}
export async function fetchTripSeats(id){const p=await requestJson(`/trips/${encodeURIComponent(id)}/seats`,{token:false});return p.data??[];}
export async function quoteTrip(id,passengers){const p=await requestJson(`/trips/${encodeURIComponent(id)}/quote?passengers=${encodeURIComponent(passengers)}`,{token:false});return p.data??p;}
export async function mapJourney(origin,destination){const q=new URLSearchParams({origin,destination});const p=await requestJson(`/maps/journey?${q}`,{token:false});return p.data??p;}

export async function listBookings(){const p=await requestJson('/bookings');return p.data??[];}
export async function createBooking(body){const p=await requestJson('/bookings',{method:'POST',body:JSON.stringify(body)});return p.data??p;}
export async function fetchBooking(id){const p=await requestJson(`/bookings/${encodeURIComponent(id)}`);return p.data??p;}
export async function cancelBooking(id){const p=await requestJson(`/bookings/${encodeURIComponent(id)}/cancel`,{method:'POST'});return p.data??p;}
export async function listBookingPayments(id){const p=await requestJson(`/bookings/${encodeURIComponent(id)}/payments`);return p.data??[];}
export async function initiatePayment(id,idempotencyKey){return requestJson(`/bookings/${encodeURIComponent(id)}/payments`,{method:'POST',body:JSON.stringify({idempotency_key:idempotencyKey})});}
export async function fetchTicket(id){const p=await requestJson(`/bookings/${encodeURIComponent(id)}/ticket`);return p.data??p;}
export async function validateTicket(publicId,token){const p=await requestJson('/tickets/validate',{method:'POST',body:JSON.stringify({public_id:publicId,token})});return p.data??p;}

export async function fetchDriverProfile(){const p=await requestJson('/driver/me');return p.data??p;}
export async function fetchDriverTrip(){const p=await requestJson('/driver/trips/current');return p.data??null;}
export async function fetchDriverPassengers(tripId){const p=await requestJson(`/driver/trips/${tripId}/passengers`);return p.data??[];}
export async function startDriverTrip(tripId){const p=await requestJson(`/driver/trips/${tripId}/start`,{method:'POST'});return p.data??p;}
export async function completeDriverTrip(tripId){const p=await requestJson(`/driver/trips/${tripId}/complete`,{method:'POST'});return p.data??p;}
export async function boardPassenger(tripId,passengerId){const p=await requestJson(`/driver/trips/${tripId}/passengers/${passengerId}/board`,{method:'POST'});return p.data??p;}
export async function sendDriverLocation(payload){const p=await requestJson('/driver/locations',{method:'POST',body:JSON.stringify(payload)});return p.data??p;}
export async function createIncident(payload){const p=await requestJson('/driver/incidents',{method:'POST',body:JSON.stringify(payload)});return p.data??p;}
export async function fetchDriverSchedule(){const p=await requestJson('/driver/schedule');return p.data??[];}
export async function updateVehicleStatus(payload){const p=await requestJson('/driver/vehicle-status',{method:'POST',body:JSON.stringify(payload)});return p.data??p;}
export async function createPackage(payload){const p=await requestJson('/driver/packages',{method:'POST',body:JSON.stringify(payload)});return p.data??p;}
export async function updatePackageStatus(id,status,notes=''){const p=await requestJson(`/driver/packages/${id}/status`,{method:'POST',body:JSON.stringify({status,notes})});return p.data??p;}
export async function publicTrackPackage(token){const p=await requestJson(`/packages/track/${encodeURIComponent(token)}`,{token:false});return p.data??p;}

export async function fetchAdminDashboard(){const p=await requestJson('/admin/dashboard');return p.data??p;}
export async function fetchAdminReport(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports?${q}`);return p.data??p;}
export async function fetchTravelReport(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports/travel?${q}`);return p.data??p;}
export async function fetchVehicleReport(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports/vehicles?${q}`);return p.data??p;}
export async function fetchTripReport(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports/trips?${q}`);return p.data??p;}
export async function fetchTripCostReport(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports/trip-costs?${q}`);return p.data??p;}
export async function fetchAdminIncidents(){const p=await requestJson('/admin/incidents');return p.data??[];}
export async function updateAdminIncident(id,status){const p=await requestJson(`/admin/incidents/${id}`,{method:'PATCH',body:JSON.stringify({status})});return p.data??p;}
export async function fetchAdminSchedules(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/driver-schedules?${q}`);return p.data??[];}
export async function saveAdminSchedule(payload,id=null){const path=id?`/admin/driver-schedules/${id}`:'/admin/driver-schedules';const p=await requestJson(path,{method:id?'PUT':'POST',body:JSON.stringify(payload)});return p.data??p;}
export async function fetchAdminPackages(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/packages?${q}`);return p.data??[];}
export async function fetchVehicleStatuses(params={}){const q=new URLSearchParams(params);const p=await requestJson(`/admin/vehicle-status?${q}`);return p.data??[];}
