import { appConfig } from './app-config.mjs';

export function formatMoney(value, currency = appConfig.currency, locale = appConfig.locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatDate(value, locale = appConfig.locale, timeZone = appConfig.timezone) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone }).format(new Date(value));
}

export function formatTime(value, locale = appConfig.locale, timeZone = appConfig.timezone) {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(value));
}
