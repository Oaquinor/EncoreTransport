# QA visual — 2026-11-01

`npm run test:visual-browser` pasó con 36 checks y capturas en Website, Passenger, Driver, Admin, Login y Tracking a 360, 390, 768, 1024, 1440 y 1920 px. La captura actual del Website es `artifacts/visual/website-1440.png`; la comparación anterior queda en `artifacts/website-current-1440.png` y `artifacts/website-ref1-after-1440.png`. También pasó la prueba focal de Website a 1440 px tras corregir la carrera de Leaflet y el estado compartido del mapa. La captura autenticada del Admin depende de credenciales/entorno sembrado y no se declara aceptación de producción.
