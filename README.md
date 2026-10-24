# NOVANTIQ Move

Aplicación web responsive para organizar actividad física, rutinas semanales y alimentación en un solo lugar.
Demo en HTML5, CSS3 y JavaScript moderno (módulos ES), sin frameworks ni dependencias.

## Cómo ejecutarla

Los módulos ES no funcionan abriendo `index.html` con doble clic (`file://`), así que hay que servir la carpeta por HTTP.

Con Node instalado:

```bash
node serve.mjs
```

y abrí <http://localhost:5173>. También sirve cualquier servidor estático (por ejemplo, Live Server de VS Code).

## Estado del proyecto

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Inspección y planificación | ✅ |
| 2 | Interfaz principal, navegación, dashboard, estados vacíos, alta de actividades | ✅ |
| 3 | Calendario completo, edición, completar, reprogramar, plantillas | ✅ |
| 4 | Nutrición: planificador, recetas, lista de compras, preferencias | Pendiente |
| 5 | Progreso, perfil completo, accesibilidad y pulido final | Pendiente |

## Estructura

```
index.html            Estructura base: barra superior, navegación, <main>, diálogo y avisos
serve.mjs             Servidor local de desarrollo (sin dependencias)
css/
  styles.css          Tokens de diseño, base y layout móvil
  components.css      Botones, tarjetas, banners, formularios, diálogo…
  responsive.css      Tablet y escritorio (barra lateral)
js/
  app.js              Arranque, router y delegación de eventos
  router.js           Navegación por hash (#/inicio, #/semana…)
  state.js            Estado único (fuente de verdad) y migraciones
  storage.js          Adaptador de LocalStorage (reemplazable por Supabase)
  ui.js               Diálogo, avisos, banner y estados vacíos
  activities.js       Lógica de actividades (crear, editar, mover, completar, eliminar)
  templates.js        Filtrar, aplicar y quitar plantillas sin duplicar
  progress.js         Estadísticas derivadas de los registros reales
  utils/dates.js      Fechas locales "YYYY-MM-DD" sin errores de zona horaria
  utils/dom.js        Plantillas HTML con escape automático (anti-XSS)
  views/              Una vista por sección
data/
  categories.js       Categorías de actividad
  activity-templates.js  Plantillas semanales de ejemplo (solo lectura)
assets/
  images/             Fotos WebP (ver images/CREDITS.md)
  icons/              Sprite SVG e ícono de la app
```

## Cómo funcionan las plantillas

- Las plantillas de `data/activity-templates.js` nunca se modifican.
- Al aplicar una, se crean **copias** en tu semana con `templateId`, `applicationId` y `sessionKey`.
- Aplicar la misma plantilla dos veces en la misma semana pide confirmación y **reemplaza** sus sesiones
  pendientes; las completadas se conservan y no se duplican.
- Si los días elegidos ya tienen actividades propias, se avisa antes de sumar las sesiones.
- "Quitar plantilla" elimina sus sesiones no completadas; las completadas quedan en tu historial.

## Datos y privacidad

- Los datos se guardan **solo en este navegador** (LocalStorage, clave `novantiq-move:data`).
- No hay cuentas ni sincronización entre dispositivos todavía.
- No se guardan contraseñas ni datos sensibles.
- Si los datos guardados se dañan, la app guarda una copia (`novantiq-move:data:backup-…`) y empieza de cero.

## Aviso

Las plantillas y recetas son ejemplos generales de organización. No reemplazan el asesoramiento
de profesionales de la salud, el deporte o la nutrición.
