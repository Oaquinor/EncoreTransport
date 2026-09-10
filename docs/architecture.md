# Architecture

## Objetivo

El sistema se diseña como una plataforma de transporte con experiencias separadas para público, pasajeros, conductores y administración, consumiendo una API central que concentra la lógica crítica.

## Decisión arquitectónica principal

Se adopta un monorepo con apps independientes y paquetes compartidos. Esta decisión reduce duplicación, facilita reutilización y prepara el camino para una API Laravel real y futuras apps móviles.

## Capas

1. Presentación: website, passenger PWA, driver PWA y admin dashboard.
2. Contratos y reglas compartidas: shapes de datos, validaciones de preview y utilidades comunes.
3. API central futura: Laravel 11 como única autoridad para reglas de negocio.
4. Persistencia: MySQL normalizado y preparado para producción.

## Regla de oro

Las apps cliente no deben decidir reglas críticas por su cuenta. Solo presentan, solicitan y reflejan estados derivados de la API.

## Preparación móvil

La separación de contratos, vistas y reglas permite añadir Android e iOS sin reescribir dominio ni duplicar criterios de negocio.