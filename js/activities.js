// Lógica de actividades: validación, creación y consultas.
// No toca el DOM; las vistas usan estas funciones para leer y modificar datos.
// (Edición, eliminación, mover de día y completar llegan en la Etapa 3.)

import { getState, setState, createId } from './state.js';
import { CATEGORIES } from '../data/categories.js';
import { isValidISODate, today, currentTime } from './utils/dates.js';

export const STATUS_LABELS = {
  pending: 'Pendiente',
  completed: 'Completada',
  rescheduled: 'Reprogramada',
};

export const INTENSITIES = [
  { id: 'low', label: 'Suave' },
  { id: 'medium', label: 'Moderada' },
  { id: 'high', label: 'Intensa' },
];

export const LIMITS = { name: 60, description: 500, maxDuration: 600 };

/** Devuelve un objeto { campo: mensaje } con los errores. Vacío = válido. */
export function validateActivity(input) {
  const errors = {};
  const name = (input.name ?? '').trim();

  if (!name) errors.name = 'Escribí un nombre para la actividad.';
  else if (name.length > LIMITS.name) errors.name = `Usá como máximo ${LIMITS.name} caracteres.`;

  if (!CATEGORIES.some((c) => c.id === input.category)) errors.category = 'Elegí una categoría.';

  if (!isValidISODate(input.date)) errors.date = 'Elegí una fecha válida.';

  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) errors.time = 'La hora no es válida.';

  if (input.durationMin !== '' && input.durationMin != null) {
    const minutes = Number(input.durationMin);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > LIMITS.maxDuration) {
      errors.durationMin = `Ingresá minutos enteros entre 1 y ${LIMITS.maxDuration}.`;
    }
  }

  if (input.intensity && !INTENSITIES.some((i) => i.id === input.intensity)) errors.intensity = 'Intensidad no válida.';

  if ((input.description ?? '').length > LIMITS.description) {
    errors.description = `Usá como máximo ${LIMITS.description} caracteres.`;
  }
  return errors;
}

/** Crea una actividad nueva. Devuelve { ok, activity } o { ok: false, errors }. */
export function createActivity(input) {
  const errors = validateActivity(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const activity = {
    id: createId(),
    name: input.name.trim(),
    category: input.category,
    date: input.date,
    time: input.time || '',
    durationMin: input.durationMin ? Number(input.durationMin) : null,
    intensity: input.intensity || '',
    description: (input.description ?? '').trim(),
    tasks: [],
    notes: '',
    status: 'pending',
    templateId: null,     // se completa cuando la actividad viene de una plantilla
    applicationId: null,
    createdAt: new Date().toISOString(), // instante exacto (no es una fecha de calendario)
    completedAt: null,
  };

  setState((s) => ({ ...s, activities: [...s.activities, activity] }));
  return { ok: true, activity };
}

// ---------- Consultas (funciones puras sobre el estado) ----------

/** Orden: por fecha, luego las que tienen hora, luego por hora. */
export function compareActivities(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
  if (a.time) return -1;
  if (b.time) return 1;
  return 0;
}

export function getActivitiesForDate(state, iso) {
  return state.activities.filter((a) => a.date === iso).sort(compareActivities);
}

export function getActivitiesInRange(state, fromIso, toIso) {
  return state.activities
    .filter((a) => a.date >= fromIso && a.date <= toIso) // "YYYY-MM-DD" se compara bien como texto
    .sort(compareActivities);
}

/** Próxima actividad pendiente (excluye descanso). Una sin hora de hoy cuenta como próxima. */
export function getNextActivity(state = getState()) {
  const day = today();
  const now = currentTime();
  return state.activities
    .filter((a) => a.status !== 'completed' && a.category !== 'rest')
    .filter((a) => a.date > day || (a.date === day && (!a.time || a.time >= now)))
    .sort(compareActivities)[0] ?? null;
}
