# Configuración pública de EncoreTransport

El footer no inventa la ubicación de la empresa ni sus redes sociales. El servidor de frontend puede inyectar `globalThis.__ENCORE_CONFIG__` antes de cargar `apps/website/app.mjs`:

```html
<script>
  globalThis.__ENCORE_CONFIG__ = {
    businessLocation: {
      name: 'Nombre oficial de la oficina',
      latitude: null,
      longitude: null
    },
    socialLinks: {
      instagram: 'https://instagram.com/cuenta-oficial',
      facebook: 'https://facebook.com/cuenta-oficial',
      whatsapp: 'https://wa.me/numero-oficial'
    }
  };
</script>
```

Sustituye los valores únicamente con datos confirmados por Jamol. Mientras no estén configurados, las redes aparecen deshabilitadas y el mapa informa que la ubicación oficial está pendiente; no se muestran coordenadas ni cuentas ficticias.
