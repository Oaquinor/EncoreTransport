import { appConfig } from './app-config.mjs';

const TOKEN_KEY='encore_api_token';
export const getApiToken=()=>localStorage.getItem(TOKEN_KEY) ?? '';
export const setApiToken=(token)=>token?localStorage.setItem(TOKEN_KEY,token):localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message,status=0,payload=null){super(message);this.name='ApiError';this.status=status;this.payload=payload;}
}

export async function requestJson(path, options={}) {
  const headers=new Headers(options.headers ?? {});
  headers.set('Accept','application/json');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  const token=options.token === false ? '' : (options.token ?? getApiToken());
  if (token) headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${appConfig.apiBaseUrl}${path}`,{...options,headers});
  let payload=null;
  try { payload=await response.json(); } catch { payload=null; }
  if (!response.ok) {
    const validation=payload?.errors ? Object.values(payload.errors).flat().join(' ') : '';
    throw new ApiError(validation || payload?.message || `Request failed (${response.status}).`,response.status,payload);
  }
  return payload;
}

export async function login(email,password){
  const payload=await requestJson('/auth/login',{method:'POST',token:false,body:JSON.stringify({email,password})});
  setApiToken(payload.token);
  return payload;
}
export async function logout(){ try { await requestJson('/auth/logout',{method:'POST'}); } finally { setApiToken(''); } }
export async function me(){ return requestJson('/auth/me'); }
export async function fetchRoutes(){ const p=await requestJson('/routes',{token:false}); return p.data ?? []; }
export async function fetchPassengerSearch(filters){
  const q=new URLSearchParams({origin:filters.origin??'',destination:filters.destination??'',date:filters.date??'',passengers:String(filters.passengers??1)});
  const p=await requestJson(`/trips/search?${q}`,{token:false}); return {filters,trips:p.data??[],total:(p.data??[]).length};
}
export async function fetchTripDetails(id){ const p=await requestJson(`/trips/${encodeURIComponent(id)}`,{token:false}); return p.data ?? p; }
export async function fetchTripSeats(id){ const p=await requestJson(`/trips/${encodeURIComponent(id)}/seats`,{token:false}); return p.data ?? []; }
export async function createBooking(body){ const p=await requestJson('/bookings',{method:'POST',body:JSON.stringify(body)}); return p.data ?? p; }
export async function fetchBooking(id){ const p=await requestJson(`/bookings/${encodeURIComponent(id)}`); return p.data ?? p; }
export async function fetchDriverProfile(){ const p=await requestJson('/driver/me'); return p.data ?? p; }
export async function fetchDriverTrip(){ const p=await requestJson('/driver/trips/current'); return p.data ?? null; }
export async function fetchDriverPassengers(tripId){ const p=await requestJson(`/driver/trips/${tripId}/passengers`); return p.data ?? []; }
export async function startDriverTrip(tripId){ const p=await requestJson(`/driver/trips/${tripId}/start`,{method:'POST'}); return p.data ?? p; }
export async function completeDriverTrip(tripId){ const p=await requestJson(`/driver/trips/${tripId}/complete`,{method:'POST'}); return p.data ?? p; }
export async function boardPassenger(tripId,passengerId){ const p=await requestJson(`/driver/trips/${tripId}/passengers/${passengerId}/board`,{method:'POST'}); return p.data ?? p; }
export async function sendDriverLocation(payload){ return requestJson('/driver/locations',{method:'POST',body:JSON.stringify(payload)}); }
export async function createIncident(payload){ return requestJson('/driver/incidents',{method:'POST',body:JSON.stringify(payload)}); }
export async function fetchAdminDashboard(){ const p=await requestJson('/admin/dashboard'); return p.data ?? p; }
export async function fetchAdminReport(params={}){ const q=new URLSearchParams(params); const p=await requestJson(`/admin/reports?${q}`); return p.data ?? p; }
