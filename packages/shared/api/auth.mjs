import {
  requestJson,
  setApiToken,
} from './core.mjs';

export async function login(
  email,
  password,
  persistent = false,
) {
  const payload =
    await requestJson(
      '/auth/login',
      {
        method: 'POST',
        token: false,
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

  setApiToken(
    payload.token,
    { persistent },
  );

  return payload;
}

export async function register(body) {
  const payload =
    await requestJson(
      '/auth/register',
      {
        method: 'POST',
        token: false,
        body: JSON.stringify(body),
      },
    );

  setApiToken(payload.token);

  return payload;
}

export async function logout() {
  try {
    await requestJson(
      '/auth/logout',
      { method: 'POST' },
    );
  } finally {
    setApiToken('');
  }
}

export function me() {
  return requestJson('/auth/me');
}
