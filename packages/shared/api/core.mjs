import { appConfig } from '../app-config.mjs';

const TOKEN_KEY = 'encore_api_token';

export const getApiToken = () =>
  sessionStorage.getItem(TOKEN_KEY) ??
  localStorage.getItem(TOKEN_KEY) ??
  '';

export function setApiToken(
  token,
  { persistent = false } = {},
) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);

  if (!token) return;

  const storage = persistent
    ? localStorage
    : sessionStorage;

  storage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  constructor(
    message,
    status = 0,
    payload = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildValidationMessage(payload) {
  if (!payload?.errors) return '';

  return Object
    .values(payload.errors)
    .flat()
    .join(' ');
}

export async function requestJson(
  path,
  options = {},
) {
  const headers =
    new Headers(options.headers ?? {});

  headers.set(
    'Accept',
    'application/json',
  );

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  const token =
    options.token === false
      ? ''
      : (
          options.token ??
          getApiToken()
        );

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  let response;

  try {
    response = await fetch(
      `${appConfig.apiBaseUrl}${path}`,
      {
        ...options,
        headers,
      },
    );
  } catch (error) {
    throw new ApiError(
      'Unable to reach Encore Transport. Check your connection and try again.',
      0,
      {
        cause: error?.message,
      },
    );
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const validation =
      buildValidationMessage(payload);

    throw new ApiError(
      validation ||
      payload?.message ||
      `Request failed (${response.status}).`,
      response.status,
      payload,
    );
  }

  return payload;
}
