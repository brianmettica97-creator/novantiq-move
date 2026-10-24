// Lógica de recetas y preferencias alimentarias: consultas, filtros y alérgenos.

import { setState } from './state.js';
import { RECIPES, INGREDIENTS, ALLERGENS } from '../data/recipes.js';

export function getRecipe(id) {
  return RECIPES.find((r) => r.id === id) ?? null;
}

/** Ingredientes de una receta con su nombre resuelto desde el catálogo. */
export function getRecipeIngredients(recipe) {
  return recipe.ingredients.map((item) => ({
    ...item,
    name: INGREDIENTS[item.id]?.name ?? item.id,
    allergens: INGREDIENTS[item.id]?.allergens ?? [],
    warning: INGREDIENTS[item.id]?.warning ?? '',
  }));
}

/** Ingredientes cuya composición depende de la marca y conviene revisar. */
export function getRecipeWarnings(recipe) {
  return getRecipeIngredients(recipe).filter((i) => i.warning);
}

/** Alérgenos presentes según los ingredientes LISTADOS (no garantiza ausencia de trazas). */
export function getRecipeAllergens(recipe) {
  const ids = new Set(getRecipeIngredients(recipe).flatMap((i) => i.allergens));
  return ALLERGENS.filter((a) => ids.has(a.id));
}

export const isQuick = (recipe) => recipe.prepMinutes <= 15;

export const TIME_FILTERS = [
  { id: 'quick', label: 'Hasta 15 min', test: (m) => m <= 15 },
  { id: 'medium', label: '16 a 30 min', test: (m) => m > 15 && m <= 30 },
  { id: 'long', label: 'Más de 30 min', test: (m) => m > 30 },
];

// ---------- Preferencias ----------

export const NUTRITION_GOALS = [
  { id: 'variety', label: 'Comer de manera más variada' },
  { id: 'organize', label: 'Organizar las comidas de la semana' },
  { id: 'save-time', label: 'Ahorrar tiempo al cocinar', recipeTest: isQuick },
  { id: 'vegetarian', label: 'Encontrar recetas vegetarianas', recipeTest: (r) => r.tags.includes('vegetarian') },
  { id: 'budget', label: 'Buscar opciones económicas', recipeTest: (r) => r.tags.includes('budget') },
  // Se registran como preferencia, pero no cambian nada automáticamente
  { id: 'body-composition', label: 'Cuidar mi composición corporal', informational: true },
  { id: 'performance', label: 'Acompañar mi rendimiento deportivo', informational: true },
];

export function setNutritionGoals(goals) {
  const valid = goals.filter((g) => NUTRITION_GOALS.some((n) => n.id === g));
  setState((s) => ({ ...s, nutritionPrefs: { ...s.nutritionPrefs, goals: valid } }));
}

/** Preferencias que sí sirven para sugerir recetas (vegetariana, económica, rápida). */
export function getRecipePreferenceTests(prefs) {
  return NUTRITION_GOALS.filter((g) => g.recipeTest && prefs.goals.includes(g.id));
}

// ---------- Filtros ----------

/**
 * Filtra recetas. Cada filtro vacío ('') significa "todas".
 * `matchPrefs`: muestra solo las que cumplen TODAS las preferencias con efecto en recetas.
 */
export function filterRecipes({ mealType = '', time = '', diet = '', matchPrefs = false } = {}, prefs = { goals: [] }) {
  const prefTests = matchPrefs ? getRecipePreferenceTests(prefs) : [];
  return RECIPES.filter((recipe) => {
    if (mealType && !recipe.mealTypes.includes(mealType)) return false;
    if (time && !TIME_FILTERS.find((t) => t.id === time)?.test(recipe.prepMinutes)) return false;
    if (diet && !recipe.tags.includes(diet)) return false;
    return prefTests.every((p) => p.recipeTest(recipe));
  });
}
