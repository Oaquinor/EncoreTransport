import { appConfig } from '../app-config.mjs';

const TOKEN_KEY = 'encore_api_token';

export const getApiToken = () =>
  sessionStorage.getItem(TOKEN_KEY) ??
  '';

export function setApiToken(
  token,
  { persistent = false } = {},
) {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);

  if (!token) return;

  // Bearer tokens stay session-scoped to limit the impact of token theft.
  sessionStorage.setItem(TOKEN_KEY, token);
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
  const controller = options.signal ? null : new AbortController();
  const timeout = Number(options.timeoutMs ?? 10000);
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : null;
  const method = String(options.method ?? 'GET').toUpperCase();
  const retryableMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const attempts = retryableMethod ? 2 : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await fetch(
        `${appConfig.apiBaseUrl}${path}`,
        {
          ...options,
          headers,
          signal: options.signal ?? controller?.signal,
        },
      );
      if (retryableMethod && attempt === 0 && [408, 429, 502, 503, 504].includes(response.status)) {
        response.body?.cancel?.();
        await new Promise((resolve) => setTimeout(resolve, 180));
        continue;
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= attempts || options.signal?.aborted || controller?.signal.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
  }

  if (timeoutId) clearTimeout(timeoutId);
  if (!response) {
    throw new ApiError(
      lastError?.name === 'AbortError'
        ? 'The request took too long. Please try again.'
        : 'Unable to reach Encore Transport. Check your connection and try again.',
      0,
      { cause: lastError?.message },
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

    const message = validation || payload?.message || '';
    const safeMessage = response.status >= 500
      ? 'Encore Transport is temporarily unavailable. Please try again shortly.'
      : message || `Request failed (${response.status}).`;

    throw new ApiError(
      safeMessage,
      response.status,
      payload,
    );
  }

  return payload;
}
