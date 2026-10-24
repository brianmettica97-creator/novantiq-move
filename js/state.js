// Estado de la aplicación: la única fuente de verdad.
//
// Flujo de datos:
//   vista → acción (por ejemplo createActivity) → setState → se guarda → se notifica
//   a los suscriptores → la vista se vuelve a dibujar con el estado nuevo.
//
// Regla: el estado no se modifica "en el lugar". setState recibe una función que
// devuelve un objeto NUEVO. Así es fácil saber cuándo algo cambió y evitar errores.

import { localStorageAdapter } from './storage.js';

export const SCHEMA_VERSION = 1;

function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      displayName: '',
      weekStart: 'monday',
    },
    activities: [],          // actividades programadas (copias propias del usuario)
    templateApplications: [], // registro de plantillas aplicadas (Etapa 3)
    mealPlan: {},             // { 'YYYY-MM-DD': { breakfast, lunch, snack, dinner, extra } }
    shoppingList: [],         // [{ id, name, quantity, checked, recipeId, ingredientId, createdAt }]
    nutritionPrefs: { goals: [] }, // preferencias generales; nunca activan dietas ni restricciones
    habitLogs: [],            // (Etapa 5)
  };
}

let state = createInitialState();
let adapter = localStorageAdapter;
const listeners = new Set();
let onStorageError = () => {};

/**
 * Completa datos guardados con los valores por defecto y los lleva a la versión
 * actual del esquema. Cuando cambie la estructura, acá se agregan migraciones.
 */
function migrate(saved) {
  const base = createInitialState();
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...saved.profile },
    activities: Array.isArray(saved.activities) ? saved.activities : [],
    shoppingList: Array.isArray(saved.shoppingList) ? saved.shoppingList : [],
    mealPlan: saved.mealPlan && typeof saved.mealPlan === 'object' ? saved.mealPlan : {},
    nutritionPrefs: { ...base.nutritionPrefs, ...saved.nutritionPrefs },
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Carga el estado guardado. Devuelve el resultado del adaptador para avisar errores. */
export async function initState() {
  const result = await adapter.load();
  if (result.ok && result.data) state = migrate(result.data);
  // Datos corruptos: el adaptador ya guardó una copia; reemplazamos por un estado limpio
  // para no repetir el aviso en cada recarga.
  if (!result.ok && result.reason === 'corrupt') await adapter.save(state);
  return result;
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStorageErrorHandler(handler) {
  onStorageError = handler;
}

/** Actualiza el estado, notifica a la interfaz y persiste. */
export function setState(updater) {
  state = updater(state);
  listeners.forEach((listener) => listener(state));
  adapter.save(state).then((result) => {
    if (!result.ok) onStorageError(result);
  });
}

/** Identificador estable y único para cualquier registro. */
export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Respaldo para contextos sin randomUUID (por ejemplo, abrir por file://)
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
