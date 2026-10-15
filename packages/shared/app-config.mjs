/**
 * Runtime application configuration.
 *
 * Production deployments can inject globalThis.__ENCORE_CONFIG__ before
 * loading the applications. Defaults intentionally preserve the current
 * repository behavior until the final operating country/currency is approved.
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
        'Dominican Republic',
      ),
    currency:
      textSetting(
        'currency',
        'DOP',
      ),
    locale:
      textSetting(
        'locale',
        'en-US',
      ),
    timezone:
      textSetting(
        'timezone',
        'America/Santo_Domingo',
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
