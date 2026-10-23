import assert from 'node:assert/strict';
import {
  startEncoreServer,
} from '../server.mjs';

const {
  server,
  host,
  port,
} = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl:
    'http://127.0.0.1:65534',
  quiet: true,
});

const base =
  `http://${host}:${port}`;

async function expectOk(
  pathname,
  contentType,
) {
  const response =
    await fetch(
      `${base}${pathname}`,
    );

  assert.equal(
    response.status,
    200,
    `${pathname} must return 200`,
  );

  assert.match(
    response.headers.get(
      'content-type',
    ) ?? '',
    contentType,
    `${pathname} must use the expected MIME type`,
  );

  return response;
}

try {
  const root = await fetch(
    `${base}/`,
    {
      redirect: 'manual',
    },
  );

  assert.equal(
    root.status,
    302,
  );

  assert.equal(
    root.headers.get('location'),
    '/website/',
  );

  for (
    const alias
    of [
      '/website',
      '/login',
      '/track-package',
      '/driver',
      '/admin',
    ]
  ) {
    const response =
      await fetch(
        `${base}${alias}`,
        {
          redirect: 'manual',
        },
      );

    assert.equal(
      response.status,
      302,
      `${alias} must normalize to a trailing slash`,
    );

    assert.equal(
      response.headers.get(
        'location',
      ),
      `${alias}/`,
    );
  }

  const website =
    await expectOk(
      '/website/',
      /text\/html/,
    );

  assert.match(
    await website.text(),
    /Encore Transport/i,
  );

  await expectOk(
    '/website/styles.css',
    /text\/css/,
  );

  await expectOk(
    '/website/app.mjs',
    /text\/javascript/,
  );

  const login =
    await expectOk(
      '/login/',
      /text\/html/,
    );

  assert.match(
    await login.text(),
    /Welcome back/i,
  );

  await expectOk(
    '/login/styles.css',
    /text\/css/,
  );

  await expectOk(
    '/login/app.mjs',
    /text\/javascript/,
  );

  const tracking =
    await expectOk(
      '/track-package/',
      /text\/html/,
    );

  assert.match(
    await tracking.text(),
    /Package tracking/i,
  );

  await expectOk(
    '/track-package/styles.css',
    /text\/css/,
  );

  await expectOk(
    '/track-package/app.mjs',
    /text\/javascript/,
  );

  await expectOk(
    '/logo.svg',
    /image\/svg\+xml/,
  );

  const robots = await expectOk('/robots.txt', /text\/plain/);
  assert.match(await robots.text(), /Allow: \/website\//);

  await expectOk(
    '/assets/media/Autobus.png',
    /image\/png/,
  );

  await expectOk(
    '/packages/shared/api.mjs',
    /text\/javascript/,
  );

  await expectOk(
    '/vendor/leaflet/leaflet.css',
    /text\/css/,
  );

  await expectOk(
    '/vendor/leaflet/leaflet.js',
    /text\/javascript/,
  );

  const legacy =
    await fetch(
      `${base}/move/`,
      {
        redirect: 'manual',
      },
    );

  assert.equal(
    legacy.status,
    302,
  );

  assert.equal(
    legacy.headers.get(
      'location',
    ),
    '/passenger/',
  );

  for (
    const privatePath
    of [
      '/package.json',
      '/backend/laravel/.env',
      '/backend/laravel/composer.json',
      '/node_modules/leaflet/dist/leaflet.js',
    ]
  ) {
    const response =
      await fetch(
        `${base}${privatePath}`,
        {
          redirect: 'manual',
        },
      );

    assert.equal(
      response.status,
      404,
      `${privatePath} must never be exposed by the frontend server`,
    );
  }

  const missing =
    await fetch(
      `${base}/does-not-exist`,
      {
        redirect: 'manual',
      },
    );

  assert.equal(
    missing.status,
    404,
  );

  console.log(
    'Server routing tests passed',
  );
} finally {
  await new Promise(
    (resolve, reject) => {
      server.close(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );
}
