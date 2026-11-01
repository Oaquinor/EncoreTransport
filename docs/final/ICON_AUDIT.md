# Auditoría de iconografía

Se sustituyeron los placeholders visuales de Website y Package Register por SVG inline con `viewBox`, trazo y tamaño controlados. Los iconos de acciones y estados usan etiquetas accesibles o `aria-hidden` cuando son decorativos.

Validación Playwright en 1440×900:

- Website: 0 iconos con ancho o alto superior a 32 px.
- Package Register: 0 iconos con ancho o alto superior a 32 px.
- Sintaxis JavaScript y contratos responsive: OK.

Las flechas usadas dentro de nombres de rutas (`Origen → Destino`) permanecen como texto semántico y no como iconos decorativos.
