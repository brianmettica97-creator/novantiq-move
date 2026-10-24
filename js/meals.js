// Lógica del planificador de comidas.
//
// Estructura en el estado:
//   mealPlan = { 'YYYY-MM-DD': { breakfast: entry, lunch: entry, ... } }
//   entry    = { type: 'recipe', recipeId } | { type: 'note', text }
// Un día o comida sin planificar simplemente no existe en el objeto.

import { setState } from './state.js';
import { getRecipe } from './recipes.js';
import { weekDays, addDays, isValidISODate } from './utils/dates.js';

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch', label: 'Almuerzo' },
  { id: 'snack', label: 'Merienda' },
  { id: 'dinner', label: 'Cena' },
  { id: 'extra', label: 'Colación', optional: true },
];

export const NOTE_MAX = 140;

export function getMeal(state, date, slot) {
  return state.mealPlan[date]?.[slot] ?? null;
}

export function validateMealEntry(entry) {
  if (entry?.type === 'recipe') {
    return getRecipe(entry.recipeId) ? {} : { recipeId: 'Elegí una receta.' };
  }
  if (entry?.type === 'note') {
    const text = (entry.text ?? '').trim();
    if (!text) return { text: 'Escribí qué vas a comer.' };
    if (text.length > NOTE_MAX) return { text: `Usá como máximo ${NOTE_MAX} caracteres.` };
    return {};
  }
  return { type: 'Elegí receta o nota.' };
}

/** Agrega o reemplaza la comida de un día. */
export function setMeal(date, slot, entry) {
  const errors = validateMealEntry(entry);
  if (!isValidISODate(date) || !MEAL_SLOTS.some((s) => s.id === slot)) errors.date = 'Fecha o comida no válida.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const clean = entry.type === 'recipe' ? { type: 'recipe', recipeId: entry.recipeId } : { type: 'note', text: entry.text.trim() };
  setState((s) => ({
    ...s,
    mealPlan: { ...s.mealPlan, [date]: { ...s.mealPlan[date], [slot]: clean } },
  }));
  return { ok: true };
}

export function removeMeal(date, slot) {
  setState((s) => {
    const { [slot]: _removed, ...rest } = s.mealPlan[date] ?? {};
    const mealPlan = { ...s.mealPlan };
    if (Object.keys(rest).length) mealPlan[date] = rest;
    else delete mealPlan[date]; // no guardamos días vacíos
    return { ...s, mealPlan };
  });
}

/** Comidas planificadas en una semana: [{ date, slot, entry }]. */
export function getWeekMeals(state, weekStartIso) {
  return weekDays(weekStartIso).flatMap((date) =>
    MEAL_SLOTS.filter((s) => state.mealPlan[date]?.[s.id]).map((s) => ({ date, slot: s.id, entry: state.mealPlan[date][s.id] })));
}

/** Cuántas comidas de la semana destino se reemplazarían al copiar. */
export function countCopyConflicts(state, fromWeekStart, toWeekStart) {
  return getWeekMeals(state, fromWeekStart)
    .filter(({ date, slot }) => getMeal(state, addDays(toWeekStart, weekDays(fromWeekStart).indexOf(date)), slot)).length;
}

/**
 * Copia la planificación de una semana a otra, día por día (lunes → lunes…).
 * Solo toca las comidas que existen en la semana de origen; el resto de la semana destino queda igual.
 */
export function copyWeek(fromWeekStart, toWeekStart) {
  let copied = 0;
  setState((s) => {
    const mealPlan = { ...s.mealPlan };
    weekDays(fromWeekStart).forEach((fromDate, i) => {
      const source = s.mealPlan[fromDate];
      if (!source) return;
      const toDate = addDays(toWeekStart, i);
      mealPlan[toDate] = { ...mealPlan[toDate], ...structuredClone(source) };
      copied += Object.keys(source).length;
    });
    return { ...s, mealPlan };
  });
  return copied;
}

/** Nombre a mostrar de una comida planificada. */
export function describeMeal(entry) {
  if (!entry) return '';
  if (entry.type === 'note') return entry.text;
  return getRecipe(entry.recipeId)?.name ?? 'Receta no disponible';
}
