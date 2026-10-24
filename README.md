# NOVANTIQ Move

> Organizá tu semana, mantené tus hábitos y seguí tu progreso en un solo lugar.

**👉 Probala acá: <https://brianmettica97-creator.github.io/novantiq-move/>**
Funciona en celular y computadora, y se puede instalar en la pantalla de inicio.

**¿Qué le falta? ¿Algo no anduvo?** [Dejanos una sugerencia o reportá un error](https://github.com/brianmettica97-creator/novantiq-move/issues/new/choose).

Aplicación web responsive de NOVANTIQ para organizar actividad física, rutinas semanales y alimentación.
Esta es la **demo funcional**: HTML5, CSS3 y JavaScript moderno (módulos ES), sin frameworks ni dependencias,
con persistencia local. Está preparada para evolucionar a una app multiusuario con base de datos y cuentas.

## Cómo ejecutarla

Los módulos ES no funcionan abriendo `index.html` con doble clic (`file://`), así que hay que servir la
carpeta por HTTP. Con Node instalado:

```bash
node serve.mjs
```

Después abrí <http://localhost:5173>. También sirve cualquier servidor estático (por ejemplo, Live Server de VS Code).

## Qué incluye

| Sección | Funciones |
|---|---|
| **Inicio** | Saludo, fecha, resumen de la semana, próxima actividad (completar o ver detalle), comidas de hoy y accesos rápidos. Estados vacíos con instrucciones. |
| **Mi semana** | Calendario semanal con navegación (cruza meses y años). Crear, ver detalle, editar, mover de día (queda "Reprogramada"), completar y eliminar con confirmación. Tareas tildables, notas y días de descanso. |
| **Planes y plantillas** | 6 plantillas de ejemplo con filtros por actividad, nivel, duración, objetivo y equipamiento. Se aplican a una semana sin duplicar, con aviso de conflictos, y se pueden quitar. |
| **Nutrición** | Planificador de comidas (receta o nota) con copia entre semanas, 12 recetas con fotos, pasos y alérgenos, lista de compras y preferencias. |
| **Mi progreso** | Completadas vs. planificadas, minutos registrados, días activos, cumplimiento, actividades por categoría, historial de 8 semanas (con tooltip y vista de tabla) y hábitos opcionales. |
| **Mi perfil** | Nombre visible, inicio de semana (lunes o domingo), actividades favoritas, texto grande, reducir animaciones, exportar e importar datos (JSON), datos de ejemplo y borrar datos. |
| **Primer uso** | Bienvenida en 3 pasos y opción de cargar una semana de ejemplo (marcada como tal y fácil de borrar). |
| **App instalable** | Manifiesto, íconos y service worker: se instala en la pantalla de inicio y funciona sin conexión. |

## Cómo instalarla en el celular

- **Android (Chrome):** abrí el link → menú ⋮ → **Instalar app** o **Agregar a pantalla principal**.
- **iPhone (Safari):** abrí el link → botón **Compartir** → **Agregar a inicio**.

Tus datos quedan en ese dispositivo. Para pasarlos a otro, usá **Perfil → Exportar** y después **Importar** en el otro.

## Sugerencias y errores

Las sugerencias se reciben como [issues de GitHub](https://github.com/brianmettica97-creator/novantiq-move/issues/new/choose),
con dos formularios: **💡 Sugerencia** y **🐞 Algo no funciona**. Se necesita una cuenta de GitHub (gratis).
También se llega desde la app: **Perfil → Ayudanos a mejorar**.

## Arquitectura

```
Vistas (js/views/)  →  Lógica de dominio (activities, templates, meals…)  →  state.js  →  storage.js  →  LocalStorage
                                                                                         ↳ futuro: adaptador Supabase
```

- **Una sola fuente de verdad.** `state.js` guarda un único objeto. Las vistas nunca lo modifican directamente:
  llaman a funciones de dominio, que usan `setState(estado => nuevoEstado)`. Cada cambio se guarda y se
  vuelve a dibujar la vista actual.
- **Lógica separada de la interfaz.** Los módulos de `js/` (sin `views/`) no tocan el DOM. Se pueden
  probar y reutilizar sin HTML.
- **Datos de ejemplo de solo lectura.** Las plantillas y recetas viven en `data/`. Al usarlas se crean copias
  en el estado del usuario: editar una copia nunca cambia el original.
- **Render seguro.** `utils/dom.js` ofrece la etiqueta `html\`…\``, que escapa todo valor interpolado.
  Los textos del usuario nunca se interpretan como HTML (protección contra XSS).
- **Eventos delegados.** `app.js` escucha clics (`data-action`), cambios (`data-change`) y envíos de formularios
  (`data-form`) en un único lugar y los deriva a la vista activa.
- **Fechas como texto local `YYYY-MM-DD`.** Nunca se usa `toISOString()` para obtener un día, porque convierte a
  UTC. Todo el cálculo está en `utils/dates.js`.
- **Router por hash** (`#/inicio`, `#/semana`…): funciona en cualquier hosting estático.

## Estructura

```
index.html               Estructura base: barra superior, navegación, <main>, diálogo y avisos
manifest.webmanifest     Datos para instalar la app (nombre, íconos, colores)
sw.js                    Service worker: caché y uso sin conexión
tools/generate-icons.mjs Genera los íconos PNG sin dependencias
serve.mjs                Servidor local de desarrollo (sin dependencias)
css/
  styles.css             Tokens de diseño, base, layout móvil y preferencias de visualización
  components.css         Botones, tarjetas, banners, formularios, diálogo, gráficos…
  responsive.css         Tablet y escritorio (barra lateral)
js/
  app.js                 Arranque, rutas, delegación de eventos y registro del service worker
  config.js              Enlaces públicos (repositorio y sugerencias)
  sample-data.js         Datos de ejemplo (cargar y borrar)
  import-export.js       Exportar e importar datos con validación
  router.js              Navegación por hash
  state.js               Estado único, migraciones y reinicio
  storage.js             Adaptador de LocalStorage (reemplazable)
  ui.js                  Diálogo, confirmación, avisos, banner, estados vacíos, selector de semana
  activities.js          Actividades: crear, editar, mover, completar, eliminar, consultas
  templates.js           Plantillas: filtrar, aplicar sin duplicar, quitar
  meals.js               Planificador de comidas y copia entre semanas
  recipes.js             Recetas: filtros, alérgenos y preferencias alimentarias
  shopping-list.js       Lista de compras
  progress.js            Estadísticas derivadas y hábitos
  utils/dates.js         Fechas locales sin errores de zona horaria
  utils/dom.js           Plantillas HTML con escape automático
  views/                 home, week, plans, nutrition, progress, profile, onboarding
data/
  categories.js          Categorías de actividad
  activity-templates.js  Plantillas semanales de ejemplo
  recipes.js             Recetas, catálogo de ingredientes y alérgenos
assets/
  images/                Fotos WebP de Unsplash (créditos en images/CREDITS.md)
  icons/                 Sprite SVG e ícono de la app
```

## Modelo de datos (LocalStorage, clave `novantiq-move:data`)

```js
{
  schemaVersion: 1,
  profile: { displayName, weekStart: 'monday' | 'sunday', favoriteActivities: [], display: { largeText, reduceMotion } },
  activities: [{ id, name, category, date, time, durationMin, intensity, description, tasks: [{ id, text, done }],
                 notes, status: 'pending' | 'completed' | 'rescheduled', originalDate,
                 templateId, applicationId, sessionKey, createdAt, completedAt }],
  templateApplications: [{ id, templateId, weekStart, appliedAt }],
  mealPlan: { 'YYYY-MM-DD': { breakfast | lunch | snack | dinner | extra: { type: 'recipe', recipeId } | { type: 'note', text } } },
  shoppingList: [{ id, name, quantity, checked, recipeId, ingredientId, createdAt }],
  nutritionPrefs: { goals: [] },
  habits: [{ id, name, createdAt }],
  habitLogs: [{ id, habitId, date }]
}
```

`migrate()` en `state.js` completa los campos que falten en datos guardados con versiones anteriores.

## Reglas de producto que el código respeta

- **Plantillas:** aplicar la misma plantilla dos veces en la misma semana pide confirmación y reemplaza sus
  sesiones pendientes; las completadas se conservan y no se duplican. Si los días ya tienen actividades, se
  avisa antes de sumar. "Quitar plantilla" elimina lo no completado y conserva el historial.
- **Progreso:** solo cuenta como hecho lo marcado como completado. El descanso no es una sesión pendiente
  y no baja el cumplimiento. No se estiman calorías ni se compara con otras personas.
- **Nutrición:** no hay dietas, diagnósticos ni objetivos calóricos. Las preferencias de composición corporal o
  rendimiento solo se registran. Los alérgenos se derivan de los ingredientes listados, con advertencias para
  productos que varían según la marca: es información orientativa y siempre hay que revisar las etiquetas.
- **Lista de compras:** no duplica productos pendientes con el mismo nombre. Cada producto de una receta guarda su
  `ingredientId`, y `collectPlannedIngredients()` deja lista la base para generarla automáticamente.

## Accesibilidad

- HTML semántico, enlace "Saltar al contenido" y un único `h1` por vista. Al navegar, el foco pasa al título.
- Todos los campos tienen etiqueta, y los errores se anuncian junto a cada campo.
- Diálogos nativos (`<dialog>`) con foco atrapado, Escape para cerrar y regreso del foco al cerrar.
- Los estados (pendiente, completada, reprogramada, descanso) se comunican con icono y texto, no solo con color.
- Contraste: todos los textos superan 4.5:1 sobre todas las superficies. Las pistas de los gráficos llegan a 3:1.
- Objetivos táctiles de 44 px. La navegación inferior se puede usar con una sola mano.
- Gráficos con texto alternativo, tooltip con foco de teclado y vista de tabla.
- Respeta `prefers-reduced-motion`. Además, el perfil ofrece "Reducir animaciones" y "Texto más grande".

## Cómo probarla (recorrido sugerido)

1. **Perfil:** cargá tu nombre y elegí actividades favoritas.
2. **Planes:** aplicá una plantilla a esta semana. Aplicala de nuevo para ver el aviso de duplicado.
3. **Mi semana:** completá una sesión, mové otra de día y editá una tercera. Navegá a otras semanas.
4. **Nutrición:** abrí una receta, agregá sus ingredientes a compras y agendala. Copiá la semana a la siguiente.
5. **Progreso:** revisá el cumplimiento, las categorías y el historial, y sumá un hábito.
6. **Perfil:** exportá tus datos y probá "Borrar mis datos".
7. Recargá la página en cualquier momento: todo persiste.

## Próximos pasos: hacia la versión multiusuario

1. **Supabase:** crear un `supabaseAdapter` con la misma interfaz que `localStorageAdapter`
   (`load`, `save`, `clear`). El mapeo camelCase ↔ snake_case va en el adaptador, no en las vistas.
2. **Tablas sugeridas:** `profiles`, `activities`, `template_applications`, `meal_plan_entries`, `shopping_items`,
   `habits` y `habit_logs`, todas con `user_id` y políticas RLS por usuario. Plantillas y recetas pueden quedar
   como datos estáticos o pasar a tablas públicas de solo lectura.
3. **Autenticación** con Supabase Auth. Nunca se guardan credenciales en LocalStorage.
4. **Importar** el JSON exportado desde el perfil para migrar los datos locales a la cuenta.
5. **Freemium (no implementado):** los límites de cada plan y los precios deben validarse con usuarios reales.
   No hay cobros, suscripciones ni funciones premium simuladas en esta demo.

## Datos y privacidad

- Los datos se guardan **solo en este navegador**. No hay cuentas ni sincronización entre dispositivos.
- No se guardan contraseñas ni datos sensibles.
- Si los datos guardados se dañan, la app guarda una copia (`novantiq-move:data:backup-…`) y empieza de cero.

## Aviso

Las plantillas y recetas son ejemplos generales de organización. No reemplazan el asesoramiento de
profesionales de la salud, el deporte o la nutrición.
