# Matriz de implementación

| Superficie | Estado | Evidencia | Backend/endpoint | Prueba |
|---|---|---|---|---|
| Admin > Perfil | IMPLEMENTADA | `artifacts/reference-implementation-20261030/REF_01_ACCOUNT_ADMIN_desktop_1440x900.png` | `/auth/me`, `/auth/profile` | `tools/validate-admin-account-reference.mjs` |
| Admin > Foto | IMPLEMENTADA | `REF_04_MODAL_CAMBIAR_FOTO`, `REF_05_MODAL_RECORTAR_FOTO` | `/auth/profile/photo` | selección + persistencia E2E |
| Admin > Eliminar | IMPLEMENTADA | `REF_06_MODAL_ELIMINAR_CUENTA` | `DELETE /auth/profile` | confirmación `DELETE` |
| Admin > Guardado | IMPLEMENTADA | `REF_07_ESTADO_GUARDADO` | `PATCH /auth/profile` | respuesta exitosa |
| Admin > Menú usuario | IMPLEMENTADA | `REF_08_MENU_USUARIO_1440x900.png` | perfil, configuración y logout existentes | Playwright menu check |
| Admin > Dispositivos | BLOQUEADA | estado honesto “Not available” | No existe endpoint de sesiones | no simulada |
| Admin > Notificaciones | PARCIAL | panel superior + estados leídos/no leídos | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` | backend y UI verificados; canales externos pendientes |
| Website/Passenger/Driver/Tracking/Packages | CONSERVADA | ZIP de auditoría visual | APIs existentes | suite visual previa |
| Mobile nativo | PENDIENTE | `docs/MOBILE_CAPTURE_STATUS.md` | Expo/emulador requerido | typecheck solamente |
