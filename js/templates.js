// Lógica de plantillas: consultar, filtrar, aplicar a una semana y quitar.
//
// Las plantillas originales (data/activity-templates.js) nunca se modifican.
// Al aplicar una, se crean copias en state.activities marcadas con:
//   templateId     → de qué plantilla vienen
//   applicationId  → en qué aplicación se crearon (permite quitar todas juntas)
//   sessionKey     → qué sesión de la plantilla es (evita duplicarla al reaplicar)
// y se registra la aplicación en state.templateApplications.

import { setState, createId } from './state.js';
import { buildActivity, isRest } from './activities.js';
import { TEMPLATES } from '../data/activity-templates.js';
import { addDays, startOfWeek, weekDays } from './utils/dates.js';

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Datos derivados para mostrar y filtrar (se calculan, no se guardan). */
export function describeTemplate(template) {
  const training = template.sessions.filter((s) => !isRest(s));
  const totalMinutes = training.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
  return {
    trainingDays: training.length,
    restDays: template.sessions.length - training.length,
    totalMinutes,
    avgMinutes: training.length ? Math.round(totalMinutes / training.length) : 0,
    categories: [...new Set(training.map((s) => s.category))],
  };
}

export const DURATION_FILTERS = [
  { id: 'short', label: 'Hasta 30 min por sesión', test: (avg) => avg <= 30 },
  { id: 'medium', label: '31 a 45 min por sesión', test: (avg) => avg > 30 && avg <= 45 },
  { id: 'long', label: 'Más de 45 min por sesión', test: (avg) => avg > 45 },
];

/** Filtra plantillas. Cada filtro vacío ('') significa "todas". */
export function filterTemplates({ activity = '', level = '', duration = '', goal = '', equipment = '' } = {}) {
  return TEMPLATES.filter((template) => {
    const info = describeTemplate(template);
    if (activity && !info.categories.includes(activity)) return false;
    if (level && template.level !== level) return false;
    if (goal && template.goal !== goal) return false;
    if (equipment && template.equipment !== equipment) return false;
    if (duration && !DURATION_FILTERS.find((d) => d.id === duration)?.test(info.avgMinutes)) return false;
    return true;
  });
}

/** Fecha de cada sesión: las plantillas usan lunes = 0. */
function sessionDate(weekStartIso, day) {
  return addDays(startOfWeek(weekStartIso, 'monday'), day);
}

/**
 * Analiza qué pasaría al aplicar una plantilla, sin modificar nada:
 *   existing      → aplicación previa de la misma plantilla en esa semana (o null)
 *   conflictDays  → días que ya tienen otras actividades del usuario
 */
export function previewApplication(state, templateId, weekStartIso) {
  const template = getTemplate(templateId);
  const existing = state.templateApplications.find((a) => a.templateId === templateId && a.weekStart === weekStartIso) ?? null;

  const targetDays = new Set(template.sessions.map((s) => sessionDate(weekStartIso, s.day)));
  const conflictDays = weekDays(weekStartIso).filter((date) => targetDays.has(date) && state.activities.some(
    (a) => a.date === date && (!existing || a.applicationId !== existing.id),
  ));

  return { template, existing, conflictDays };
}

/**
 * Aplica una plantilla a la semana que empieza en `weekStartIso`.
 * Si ya estaba aplicada en esa semana, la REEMPLAZA: quita las sesiones pendientes de la
 * aplicación anterior y conserva las completadas, sin volver a crear esas mismas sesiones.
 */
export function applyTemplate(templateId, weekStartIso) {
  const template = getTemplate(templateId);
  if (!template) return { ok: false };

  let created = 0;
  setState((s) => {
    const existing = s.templateApplications.find((a) => a.templateId === templateId && a.weekStart === weekStartIso);
    const kept = existing
      ? s.activities.filter((a) => a.applicationId === existing.id && a.status === 'completed')
      : [];
    const keptKeys = new Set(kept.map((a) => a.sessionKey));
    const applicationId = existing?.id ?? createId();

    const newActivities = template.sessions
      .filter((session) => !keptKeys.has(session.key))
      .map((session) => buildActivity({
        name: session.name,
        category: session.category,
        date: sessionDate(weekStartIso, session.day),
        durationMin: session.durationMin ?? null,
        intensity: session.intensity ?? '',
        description: session.description ?? '',
        tasks: session.tasks.map((text) => ({ id: createId(), text, done: false })),
      }, { templateId, applicationId, sessionKey: session.key }));
    created = newActivities.length;

    const activities = s.activities
      .filter((a) => !existing || a.applicationId !== existing.id || a.status === 'completed')
      .concat(newActivities);

    const templateApplications = existing
      ? s.templateApplications.map((a) => (a.id === existing.id ? { ...a, appliedAt: new Date().toISOString() } : a))
      : [...s.templateApplications, { id: applicationId, templateId, weekStart: weekStartIso, appliedAt: new Date().toISOString() }];

    return { ...s, activities, templateApplications };
  });
  return { ok: true, created };
}

/**
 * Quita una plantilla de la planificación: elimina sus sesiones no completadas
 * (incluidas las editadas). Las completadas se conservan como actividades propias,
 * porque forman parte del historial real del usuario.
 */
export function removeTemplateApplication(applicationId) {
  setState((s) => ({
    ...s,
    activities: s.activities
      .filter((a) => a.applicationId !== applicationId || a.status === 'completed')
      .map((a) => (a.applicationId === applicationId ? { ...a, applicationId: null, sessionKey: null } : a)),
    templateApplications: s.templateApplications.filter((a) => a.id !== applicationId),
  }));
}

export function getApplicationsForWeek(state, weekStartIso) {
  return state.templateApplications
    .filter((a) => a.weekStart === weekStartIso)
    .map((application) => ({ application, template: getTemplate(application.templateId) }))
    .filter(({ template }) => template); // ignora plantillas que ya no existan en los datos
}

/** Cantidad de sesiones pendientes y completadas de una aplicación (para el texto de confirmación). */
export function countApplicationActivities(state, applicationId) {
  const ofApp = state.activities.filter((a) => a.applicationId === applicationId);
  const completed = ofApp.filter((a) => a.status === 'completed').length;
  return { pending: ofApp.length - completed, completed };
}
