export const appConfig = Object.freeze({
  country: 'Dominican Republic',
  currency: 'DOP',
  locale: 'en-US',
  timezone: 'America/Santo_Domingo',
  apiBaseUrl: globalThis?.__ENCORE_API_BASE_URL__ ?? '/api/v1',
  passengerAppName: 'Encore Move',
  driverAppName: 'Encore Drive',
  adminAppName: 'Encore Operations Center',
  websiteAppName: 'Encore Transport'
});
