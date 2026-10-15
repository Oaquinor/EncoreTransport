const CACHE_NAME =
  'encore-passenger-shell-v6';

const SHELL = [
  '/passenger/',
  '/passenger/manifest.webmanifest',
];

self.addEventListener(
  'install',
  (event) => {
    self.skipWaiting();

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(
          (cache) =>
            cache.addAll(SHELL),
        ),
    );
  },
);

self.addEventListener(
  'activate',
  (event) => {
    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then(
            (keys) =>
              Promise.all(
                keys
                  .filter(
                    (key) =>
                      key !==
                      CACHE_NAME,
                  )
                  .map(
                    (key) =>
                      caches.delete(
                        key,
                      ),
                  ),
              ),
          ),
        self.clients.claim(),
      ]),
    );
  },
);

self.addEventListener(
  'fetch',
  (event) => {
    const url =
      new URL(
        event.request.url,
      );

    if (
      url.pathname.startsWith(
        '/api/',
      )
    ) {
      event.respondWith(
        fetch(event.request),
      );

      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            event.request.method ===
              'GET' &&
            response.ok
          ) {
            const copy =
              response.clone();

            caches
              .open(
                CACHE_NAME,
              )
              .then(
                (cache) =>
                  cache.put(
                    event.request,
                    copy,
                  ),
              );
          }

          return response;
        })
        .catch(
          () =>
            caches.match(
              event.request,
            ),
        ),
    );
  },
);
