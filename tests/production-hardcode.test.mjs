import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const files=['apps/website/index.html','apps/website/app.mjs','apps/passenger/src/passenger-app.tsx','apps/driver-pwa/app.mjs','apps/admin-dashboard/app.mjs','packages/shared/api.mjs'];
const forbidden=['Ricardo Luna','Maria Torres','BUS 203','EN-001','DOP 428K','OpenStreetMap','VisaNet','CardNet','mock-data.mjs'];
for(const file of files){const text=await readFile(new URL(`../${file}`,import.meta.url),'utf8');for(const value of forbidden)assert.equal(text.includes(value),false,`${file} still contains production-facing demo value: ${value}`);}
console.log('Production hardcode guard passed');
