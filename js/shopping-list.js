// Lista de compras.
//
// Versión actual: los productos se agregan a mano o desde los ingredientes de una receta.
// Cada producto guarda `ingredientId` cuando viene del catálogo de ingredientes: eso deja
// preparada una futura generación automática a partir de las comidas planificadas
// (ver collectPlannedIngredients), que podrá consolidar ingredientes iguales por id.

import { getState, setState, createId } from './state.js';
import { getMeal, getWeekMeals } from './meals.js';
import { getRecipe, getRecipeIngredients } from './recipes.js';

export const LIMITS = { name: 60, quantity: 40 };

const normalize = (text) => text.trim().toLocaleLowerCase('es-AR');

export function validateItem({ name = '', quantity = '' }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Escribí qué necesitás comprar.';
  else if (name.trim().length > LIMITS.name) errors.name = `Usá como máximo ${LIMITS.name} caracteres.`;
  if (quantity.trim().length > LIMITS.quantity) errors.quantity = `Usá como máximo ${LIMITS.quantity} caracteres.`;
  return errors;
}

/** Busca un producto pendiente (no comprado) con el mismo nombre. */
function findPending(list, name) {
  return list.find((item) => !item.checked && normalize(item.name) === normalize(name));
}

/** Agrega un producto manual. Si ya hay uno pendiente con el mismo nombre, no lo duplica. */
export function addItem({ name, quantity = '' }) {
  const errors = validateItem({ name, quantity });
  if (Object.keys(errors).length) return { ok: false, errors };

  // Se revisa antes de llamar a setState: si no hay cambios, no hace falta redibujar
  if (findPending(getState().shoppingList, name)) return { ok: true, duplicate: true };

  const item = { id: createId(), name: name.trim(), quantity: quantity.trim(), checked: false, recipeId: null, ingredientId: null, createdAt: new Date().toISOString() };
  setState((s) => ({ ...s, shoppingList: [...s.shoppingList, item] }));
  return { ok: true, duplicate: false };
}

/**
 * Agrega ingredientes de una receta. Omite los que ya están pendientes en la lista
 * (por nombre), para no duplicar. No suma cantidades: eso queda para la versión automática.
 */
export function addRecipeIngredients(recipeId, ingredientIds = null) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { added: 0, skipped: 0 };

  const wanted = getRecipeIngredients(recipe).filter((i) => !ingredientIds || ingredientIds.includes(i.id));
  let added = 0;
  let skipped = 0;
  setState((s) => {
    const list = [...s.shoppingList];
    wanted.forEach((ingredient) => {
      if (findPending(list, ingredient.name)) {
        skipped += 1;
        return;
      }
      list.push({
        id: createId(), name: ingredient.name, quantity: ingredient.amount, checked: false,
        recipeId, ingredientId: ingredient.id, createdAt: new Date().toISOString(),
      });
      added += 1;
    });
    return { ...s, shoppingList: list };
  });
  return { added, skipped };
}

export function toggleItem(id) {
  setState((s) => ({ ...s, shoppingList: s.shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) }));
}

export function removeItem(id) {
  setState((s) => ({ ...s, shoppingList: s.shoppingList.filter((i) => i.id !== id) }));
}

export function removeCheckedItems() {
  setState((s) => ({ ...s, shoppingList: s.shoppingList.filter((i) => !i.checked) }));
}

/**
 * PREPARADO PARA UNA ETAPA FUTURA (todavía no se usa en la interfaz):
 * devuelve los ingredientes de las recetas planificadas en una semana, sin consolidar.
 * Consolidar ("2 zanahorias" + "1 zanahoria") requiere unificar unidades primero,
 * por eso por ahora solo se agrupan por ingredientId sin sumar cantidades.
 */
export function collectPlannedIngredients(state, weekStartIso) {
  const byIngredient = new Map();
  getWeekMeals(state, weekStartIso)
    .filter(({ entry }) => entry.type === 'recipe')
    .forEach(({ date, slot }) => {
      const recipe = getRecipe(getMeal(state, date, slot).recipeId);
      if (!recipe) return;
      getRecipeIngredients(recipe).forEach((ingredient) => {
        const group = byIngredient.get(ingredient.id) ?? { ingredientId: ingredient.id, name: ingredient.name, uses: [] };
        group.uses.push({ recipeId: recipe.id, amount: ingredient.amount, date, slot });
        byIngredient.set(ingredient.id, group);
      });
    });
  return [...byIngredient.values()];
}
