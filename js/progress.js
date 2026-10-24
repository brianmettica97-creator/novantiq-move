// Estadísticas derivadas de los registros reales del usuario, y hábitos opcionales.
//
// Reglas:
// - Nada se inventa: sin datos, los valores son 0 y la interfaz muestra un estado vacío.
// - "Planificada" y "completada" son cosas distintas: solo cuenta como hecha lo que se marcó.
// - El descanso no cuenta como sesión pendiente ni baja el cumplimiento.
// - No se estiman calorías ni se compara con otras personas.

import { setState, createId } from './state.js';
import { getActivitiesInRange, isRest } from './activities.js';
import { CATEGORIES } from '../data/categories.js';
import { weekDays, addDays } from './utils/dates.js';

/** Resumen de una semana: planificadas vs. completadas y minutos realmente completados. */
export function getWeekSummary(state, weekStartIso) {
  const days = weekDays(weekStartIso);
  const activities = getActivitiesInRange(state, days[0], days[6]);
  const training = activities.filter((a) => !isRest(a)); // el descanso no cuenta como "pendiente"
  const completed = training.filter((a) => a.status === 'completed');

  const daySummaries = days.map((date) => {
    const ofDay = activities.filter((a) => a.date === date);
    const trainingOfDay = ofDay.filter((a) => !isRest(a));
    return {
      date,
      total: trainingOfDay.length,
      completed: trainingOfDay.filter((a) => a.status === 'completed').length,
      isRest: ofDay.length > 0 && trainingOfDay.length === 0,
    };
  });

  return {
    days: daySummaries,
    planned: training.length,
    completed: completed.length,
    minutesCompleted: completed.reduce((sum, a) => sum + (a.durationMin ?? 0), 0),
    activeDays: daySummaries.filter((d) => d.completed > 0).length,
    restDays: daySummaries.filter((d) => d.isRest).length,
    // Cumplimiento solo tiene sentido si hubo algo planificado
    completionRate: training.length ? completed.length / training.length : null,
  };
}

/** Sesiones y minutos completados por categoría en un rango (para el gráfico de barras). */
export function getCategoryBreakdown(state, fromIso, toIso) {
  const completed = getActivitiesInRange(state, fromIso, toIso).filter((a) => a.status === 'completed' && !isRest(a));
  return CATEGORIES
    .map((category) => {
      const ofCategory = completed.filter((a) => a.category === category.id);
      return {
        category,
        sessions: ofCategory.length,
        minutes: ofCategory.reduce((sum, a) => sum + (a.durationMin ?? 0), 0),
      };
    })
    .filter((row) => row.sessions > 0)
    .sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);
}

/** Historial de las `count` semanas que terminan en `lastWeekStart` (de la más vieja a la más nueva). */
export function getWeeklyHistory(state, lastWeekStart, count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const weekStart = addDays(lastWeekStart, (i - count + 1) * 7);
    const { planned, completed, minutesCompleted } = getWeekSummary(state, weekStart);
    return { weekStart, planned, completed, minutesCompleted };
  });
}

// ---------- Hábitos opcionales ----------
// state.habits    = [{ id, name, createdAt }]
// state.habitLogs = [{ id, habitId, date }]   (un registro = ese día se cumplió)

export const HABIT_LIMITS = { name: 40, max: 6 };
export const HABIT_SUGGESTIONS = ['Tomar agua', 'Estirar 5 minutos', 'Caminar después de comer', 'Preparar la comida del día siguiente'];

export function validateHabit(state, name = '') {
  const clean = name.trim();
  if (!clean) return { name: 'Escribí el nombre del hábito.' };
  if (clean.length > HABIT_LIMITS.name) return { name: `Usá como máximo ${HABIT_LIMITS.name} caracteres.` };
  if (state.habits.length >= HABIT_LIMITS.max) return { name: `Podés seguir hasta ${HABIT_LIMITS.max} hábitos.` };
  if (state.habits.some((h) => h.name.toLocaleLowerCase('es-AR') === clean.toLocaleLowerCase('es-AR'))) return { name: 'Ya tenés ese hábito.' };
  return {};
}

export function addHabit(state, name) {
  const errors = validateHabit(state, name);
  if (Object.keys(errors).length) return { ok: false, errors };
  setState((s) => ({ ...s, habits: [...s.habits, { id: createId(), name: name.trim(), createdAt: new Date().toISOString() }] }));
  return { ok: true };
}

/** Elimina el hábito y sus registros. */
export function removeHabit(habitId) {
  setState((s) => ({
    ...s,
    habits: s.habits.filter((h) => h.id !== habitId),
    habitLogs: s.habitLogs.filter((l) => l.habitId !== habitId),
  }));
}

export function isHabitDone(state, habitId, date) {
  return state.habitLogs.some((l) => l.habitId === habitId && l.date === date);
}

export function toggleHabit(habitId, date) {
  setState((s) => {
    const exists = s.habitLogs.some((l) => l.habitId === habitId && l.date === date);
    return {
      ...s,
      habitLogs: exists
        ? s.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date))
        : [...s.habitLogs, { id: createId(), habitId, date }],
    };
  });
}
