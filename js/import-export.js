// Exportar e importar los datos locales como archivo JSON.
//
// El archivo exportado tiene esta forma:
//   { app: 'NOVANTIQ Move', schemaVersion, exportedAt, data: { ...estado } }
// Al importar se valida todo antes de tocar nada: un archivo de otra app, dañado o
// de una versión más nueva se rechaza con un mensaje claro. Los registros inválidos se descartan.

import { getState, SCHEMA_VERSION } from './state.js';
import { CATEGORIES } from '../data/categories.js';
import { isValidISODate, today } from './utils/dates.js';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB: muy por encima de lo que ocupa un año de uso

export function exportFileName() {
  return `novantiq-move-datos-${today()}.json`;
}

export function buildExport(state = getState()) {
  return JSON.stringify({ app: 'NOVANTIQ Move', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Descarga el archivo en el dispositivo (todo ocurre en el navegador, nada se envía a internet). */
export function downloadExport() {
  const blob = new Blob([buildExport()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isText = (v, max = 2000) => typeof v === 'string' && v.length <= max;
const validCategory = new Set(CATEGORIES.map((c) => c.id));

/** Actividad mínima válida: el resto de los campos se normaliza al mostrarla. */
function isValidActivity(a) {
  return isObject(a) && isText(a.id, 100) && isText(a.name, 200) && a.name.trim() && validCategory.has(a.category)
    && isValidISODate(a.date) && ['pending', 'completed', 'rescheduled'].includes(a.status);
}

/**
 * Valida el texto de un archivo exportado.
 * Devuelve { ok: true, data, summary, discarded } o { ok: false, message }.
 */
export function parseImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: 'El archivo no es un JSON válido.' };
  }
  if (!isObject(parsed) || parsed.app !== 'NOVANTIQ Move' || !isObject(parsed.data)) {
    return { ok: false, message: 'El archivo no parece una exportación de NOVANTIQ Move.' };
  }
  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, message: 'El archivo es de una versión más nueva de la app. Actualizá la página e intentá de nuevo.' };
  }

  const data = { ...parsed.data };
  const activities = Array.isArray(data.activities) ? data.activities : [];
  data.activities = activities.filter(isValidActivity).map((a) => ({ ...a, tasks: Array.isArray(a.tasks) ? a.tasks.filter((t) => isObject(t) && isText(t.text, 200)) : [] }));
  data.shoppingList = (Array.isArray(data.shoppingList) ? data.shoppingList : []).filter((i) => isObject(i) && isText(i.id, 100) && isText(i.name, 200));
  data.habits = (Array.isArray(data.habits) ? data.habits : []).filter((h) => isObject(h) && isText(h.id, 100) && isText(h.name, 100));
  data.habitLogs = (Array.isArray(data.habitLogs) ? data.habitLogs : []).filter((l) => isObject(l) && isValidISODate(l.date));
  data.templateApplications = (Array.isArray(data.templateApplications) ? data.templateApplications : []).filter((a) => isObject(a) && isValidISODate(a.weekStart));
  data.mealPlan = Object.fromEntries(Object.entries(isObject(data.mealPlan) ? data.mealPlan : {})
    .filter(([date, slots]) => isValidISODate(date) && isObject(slots)));

  const meals = Object.values(data.mealPlan).reduce((n, slots) => n + Object.keys(slots).length, 0);
  return {
    ok: true,
    data,
    discarded: activities.length - data.activities.length,
    summary: { activities: data.activities.length, meals, shopping: data.shoppingList.length, habits: data.habits.length, exportedAt: parsed.exportedAt },
  };
}
