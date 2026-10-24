// Utilidades de fechas.
//
// Regla del proyecto: las fechas se guardan como texto local "YYYY-MM-DD".
// Nunca usamos toISOString() para obtener un día, porque convierte a UTC y
// en Argentina (UTC-3) puede devolver el día siguiente después de las 21 h.

const LOCALE = 'es-AR';
const pad = (n) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" usando la hora local. */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * "YYYY-MM-DD" → Date local.
 * Se crea al mediodía para que los cambios de horario de verano
 * nunca empujen la fecha al día anterior.
 */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value; // descarta 2026-02-31, etc.
}

export function today() {
  return toISODate(new Date());
}

/** Hora local actual como "HH:MM", comparable con el campo time de una actividad. */
export function currentTime() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function addDays(iso, amount) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + amount); // setDate maneja cambios de mes y año
  return toISODate(date);
}

/** Primer día de la semana que contiene `iso`. weekStart: 'monday' | 'sunday'. */
export function startOfWeek(iso, weekStart = 'monday') {
  const day = parseISODate(iso).getDay(); // 0 = domingo
  const offset = weekStart === 'monday' ? (day + 6) % 7 : day;
  return addDays(iso, -offset);
}

/** Los 7 días ("YYYY-MM-DD") de la semana que empieza en `weekStartIso`. */
export function weekDays(weekStartIso) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartIso, i));
}

/** Cantidad de semanas entre dos inicios de semana (negativa si `toIso` es anterior). */
export function weeksBetween(fromIso, toIso) {
  // Math.round absorbe la hora de diferencia que puede haber por horario de verano
  return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / (7 * 24 * 60 * 60 * 1000));
}

// ---------- Formato para mostrar ----------

/** "Semana actual", "Próxima semana", "Hace 3 semanas"… a partir de la diferencia en semanas. */
export function relativeWeekLabel(offset) {
  if (offset === 0) return 'Semana actual';
  if (offset === 1) return 'Próxima semana';
  if (offset === -1) return 'Semana pasada';
  return offset > 0 ? `En ${offset} semanas` : `Hace ${-offset} semanas`;
}

export function formatLongDate(iso) {
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatWeekday(iso, style = 'short') {
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: style }).replace('.', '');
}

export function formatDayNumber(iso) {
  return parseISODate(iso).getDate();
}

/** "26 oct" */
export function formatShortDate(iso) {
  return parseISODate(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }).replace('.', '');
}

/** "26 oct – 1 nov" */
export function formatRange(fromIso, toIso) {
  return `${formatShortDate(fromIso)} – ${formatShortDate(toIso)}`;
}

/** "Hoy", "Mañana" o el día de la semana con fecha. */
export function formatRelativeDay(iso) {
  const base = today();
  if (iso === base) return 'Hoy';
  if (iso === addDays(base, 1)) return 'Mañana';
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '');
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
