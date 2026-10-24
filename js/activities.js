// Lógica de actividades: validación, alta, edición, eliminación, reprogramación,
// finalización y consultas. No toca el DOM; las vistas usan estas funciones.

import { getState, setState, createId } from './state.js';
import { CATEGORIES, getCategory } from '../data/categories.js';
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

export const LIMITS = { name: 60, description: 500, notes: 1000, maxDuration: 600, tasks: 30, taskLength: 120 };

/** Convierte el texto del formulario (una tarea por línea) en una lista limpia. */
export function parseTasksText(text = '') {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

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
  if ((input.notes ?? '').length > LIMITS.notes) {
    errors.notes = `Usá como máximo ${LIMITS.notes} caracteres.`;
  }

  const tasks = parseTasksText(input.tasksText);
  if (tasks.length > LIMITS.tasks) errors.tasksText = `Podés cargar hasta ${LIMITS.tasks} tareas.`;
  else if (tasks.some((t) => t.length > LIMITS.taskLength)) errors.tasksText = `Cada tarea puede tener hasta ${LIMITS.taskLength} caracteres.`;

  return errors;
}

/** Campos editables normalizados a partir de los datos de un formulario. */
function normalizeFields(input, previousTasks = []) {
  // Conserva el estado "hecha" de las tareas que no cambiaron de texto
  const doneByText = new Map(previousTasks.map((t) => [t.text, t.done]));
  return {
    name: input.name.trim(),
    category: input.category,
    date: input.date,
    time: input.time || '',
    durationMin: input.durationMin ? Number(input.durationMin) : null,
    intensity: input.intensity || '',
    description: (input.description ?? '').trim(),
    notes: (input.notes ?? '').trim(),
    tasks: parseTasksText(input.tasksText).map((text) => ({ id: createId(), text, done: doneByText.get(text) ?? false })),
  };
}

/**
 * Construye una actividad completa. Se usa al crear desde el formulario y al aplicar plantillas,
 * para que todas tengan exactamente la misma forma.
 */
export function buildActivity(fields, extra = {}) {
  return {
    id: createId(),
    tasks: [],
    notes: '',
    description: '',
    time: '',
    intensity: '',
    durationMin: null,
    ...fields,
    status: 'pending',
    originalDate: null,   // se completa la primera vez que se reprograma
    templateId: null,     // se completan cuando la actividad viene de una plantilla
    applicationId: null,
    sessionKey: null,
    createdAt: new Date().toISOString(), // instante exacto (no es una fecha de calendario)
    completedAt: null,
    ...extra,
  };
}

// ---------- Acciones ----------

export function getActivity(id, state = getState()) {
  return state.activities.find((a) => a.id === id) ?? null;
}

/** Aplica `changes(activity)` a una actividad y guarda. */
function patchActivity(id, changes) {
  setState((s) => ({
    ...s,
    activities: s.activities.map((a) => (a.id === id ? { ...a, ...changes(a) } : a)),
  }));
}

/** Crea una actividad nueva. Devuelve { ok, activity } o { ok: false, errors }. */
export function createActivity(input) {
  const errors = validateActivity(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const activity = buildActivity(normalizeFields(input));
  setState((s) => ({ ...s, activities: [...s.activities, activity] }));
  return { ok: true, activity };
}

/**
 * Edita una actividad. Si viene de una plantilla, solo cambia la copia del usuario:
 * la plantilla original (en data/) nunca se modifica.
 */
export function updateActivity(id, input) {
  const current = getActivity(id);
  if (!current) return { ok: false, errors: { name: 'La actividad ya no existe.' } };

  const errors = validateActivity(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const fields = normalizeFields(input, current.tasks);
  patchActivity(id, () => ({ ...fields, ...rescheduleFields(current, fields.date) }));
  return { ok: true, activity: getActivity(id) };
}

export function deleteActivity(id) {
  setState((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }));
}

/** Estado resultante de cambiar la fecha de una actividad. */
function rescheduleFields(activity, newDate) {
  if (newDate === activity.date) return {};
  const originalDate = activity.originalDate ?? activity.date;
  // Volver al día original deja de contar como reprogramada
  const backToOriginal = newDate === originalDate;
  return {
    originalDate: backToOriginal ? null : originalDate,
    status: activity.status === 'completed' ? 'completed' : backToOriginal ? 'pending' : 'rescheduled',
  };
}

/** Cambia una actividad de día (y opcionalmente de hora). */
export function moveActivity(id, newDate, newTime) {
  const current = getActivity(id);
  if (!current) return { ok: false, errors: { date: 'La actividad ya no existe.' } };
  if (!isValidISODate(newDate)) return { ok: false, errors: { date: 'Elegí una fecha válida.' } };
  if (newTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) return { ok: false, errors: { time: 'La hora no es válida.' } };

  patchActivity(id, (a) => ({ date: newDate, time: newTime ?? a.time, ...rescheduleFields(a, newDate) }));
  return { ok: true, activity: getActivity(id) };
}

/** Marca como completada o la devuelve a su estado anterior (pendiente o reprogramada). */
export function toggleCompleted(id) {
  patchActivity(id, (a) => (a.status === 'completed'
    ? { status: a.originalDate ? 'rescheduled' : 'pending', completedAt: null }
    : { status: 'completed', completedAt: new Date().toISOString() }));
  return getActivity(id);
}

export function toggleTask(activityId, taskId) {
  patchActivity(activityId, (a) => ({
    tasks: a.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
  }));
}

// ---------- Consultas (funciones puras sobre el estado) ----------

export function isRest(activity) {
  return Boolean(getCategory(activity.category).isRest);
}

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
    .filter((a) => a.status !== 'completed' && !isRest(a))
    .filter((a) => a.date > day || (a.date === day && (!a.time || a.time >= now)))
    .sort(compareActivities)[0] ?? null;
}
