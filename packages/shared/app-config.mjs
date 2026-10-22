/**
 * Runtime application configuration.
 *
 * Production deployments can inject globalThis.__ENCORE_CONFIG__ before
 * loading the applications. Guyana is the current operating configuration.
 * Deployments may override it
 * through the runtime object without rebuilding the frontend.
 */

const runtime =
  globalThis.__ENCORE_CONFIG__ ?? {};

function textSetting(
  key,
  fallback,
) {
  const value =
    runtime[key];

  return typeof value === 'string' &&
    value.trim()
      ? value.trim()
      : fallback;
}

export const appConfig =
  Object.freeze({
    country:
      textSetting(
        'country',
        'Guyana',
      ),
    currency:
      textSetting(
        'currency',
        'GYD',
      ),
    locale:
      textSetting(
        'locale',
        'en-GY',
      ),
    timezone:
      textSetting(
        'timezone',
        'America/Guyana',
      ),
    apiBaseUrl:
      textSetting(
        'apiBaseUrl',
        '/api/v1',
      ),
    passengerAppName:
      textSetting(
        'passengerAppName',
        'Encore Move',
      ),
    driverAppName:
      textSetting(
        'driverAppName',
        'Encore Drive',
      ),
    adminAppName:
      textSetting(
        'adminAppName',
        'Encore Operations Center',
      ),
    websiteAppName:
      textSetting(
        'websiteAppName',
        'Encore Transport',
      ),
  });
