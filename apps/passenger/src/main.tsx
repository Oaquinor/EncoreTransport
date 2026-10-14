import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../packages/shared/premium.css';
import './styles.css';
import './premium.css';
import './enhancements.css';
import './visual-gap.css';
import './mandate-motion.css';
import './flow-refresh.css';
import './seat-reference.css';
import { PassengerApp } from './passenger-app';

createRoot(
  document.getElementById('root')!,
).render(
  <React.StrictMode>
    <PassengerApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register(
          '/passenger/service-worker.mjs',
        )
        .catch(() => undefined);
    },
  );
}
