import { requestJson } from '../../../packages/shared/api.mjs';
export const dashboard=async()=>{const p=await requestJson('/admin/dashboard');return p.data??p};
export const incidents=async()=>{const p=await requestJson('/admin/incidents');return p.data??[]};
export const schedules=async()=>{const p=await requestJson('/admin/driver-schedules');return p.data??[]};
export const packages=async()=>{const p=await requestJson('/admin/packages');return p.data??[]};
export const vehicleStatus=async()=>{const p=await requestJson('/admin/vehicle-status');return p.data??[]};
export const report=async(type,params={})=>{const suffix={executive:'',travel:'/travel',vehicles:'/vehicles',trips:'/trips','trip-costs':'/trip-costs'}[type]??'';const q=new URLSearchParams(params);const p=await requestJson(`/admin/reports${suffix}?${q}`);return p.data??p};
