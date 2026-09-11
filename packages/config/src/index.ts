export const appConfig = {
  appName: 'Encore Transport',
  passengerAppName: 'Encore Move',
  apiBaseUrl: import.meta.env.VITE_ENCORE_API_URL ?? '/api/v1',
  useMockApi: (import.meta.env.VITE_ENCORE_USE_MOCK_API ?? 'true') === 'true'
};
