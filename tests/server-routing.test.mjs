import assert from 'node:assert/strict';
import { startEncoreServer } from '../server.mjs';

const { server, host, port } = await startEncoreServer({
  port: 0,
  host: '127.0.0.1',
  apiTargetUrl: 'http://127.0.0.1:65534',
  quiet: true,
});

const base = `http://${host}:${port}`;

try {
  const root = await fetch(`${base}/`, {
    redirect: 'manual',
  });

  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/website/');

  const website = await fetch(`${base}/website/`);

  assert.equal(website.status, 200);
  assert.match(
    await website.text(),
    /Encore Transport/i,
  );

  const css = await fetch(`${base}/website/styles.css`);

  assert.equal(css.status, 200);
  assert.match(
    css.headers.get('content-type') ?? '',
    /text\/css/,
  );

  const legacy = await fetch(`${base}/move/`, {
    redirect: 'manual',
  });

  assert.equal(legacy.status, 302);
  assert.equal(
    legacy.headers.get('location'),
    '/passenger/',
  );

  const login = await fetch(`${base}/login/`);
  assert.equal(login.status, 200);

  const tracking = await fetch(`${base}/track-package/`);
  assert.equal(tracking.status, 200);

  const traversal = await fetch(`${base}/website/../../package.json`, {
    redirect: 'manual',
  });

  assert.notEqual(traversal.status, 500);

  console.log('Server routing tests passed');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
