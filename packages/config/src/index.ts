export const appConfig = {
  appName: 'Encore Transport',
  passengerAppName: 'Encore Passenger',
  apiBaseUrl: import.meta.env.VITE_ENCORE_API_URL ?? '/api/v1',
  demoMode: (import.meta.env.VITE_ENCORE_DEMO_MODE ?? 'false') === 'true'
};
