// Datos de ejemplo para conocer la app sin cargar nada a mano.
//
// Cada registro creado acá lleva `sample: true`. Así "Borrar datos de ejemplo" quita
// solo esos registros y conserva cualquier cosa que la persona haya agregado después.
// Las fechas se calculan a partir de hoy, para que el ejemplo siempre esté "al día".

import { getState, setState, createId } from './state.js';
import { buildActivity } from './activities.js';
import { getTemplate, buildTemplateActivities } from './templates.js';
import { getRecipe, getRecipeIngredients } from './recipes.js';
import { today, startOfWeek, addDays, currentTime } from './utils/dates.js';

/** ¿Hay datos propios (no de ejemplo)? Se usa para ofrecer el ejemplo solo con la app vacía. */
export function hasOwnData(state = getState()) {
  return state.activities.some((a) => !a.sample)
    || Object.values(state.mealPlan).some((day) => Object.values(day).some((entry) => !entry.sample))
    || state.shoppingList.some((i) => !i.sample)
    || state.habits.some((h) => !h.sample);
}

export function hasSampleData(state = getState()) {
  return Boolean(state.sampleData);
}

/** Marca como completadas, de forma determinista, alrededor de 3 de cada 4 sesiones ya pasadas. */
function completePast(activities, todayIso) {
  const now = currentTime();
  return activities.map((a, i) => {
    const isPast = a.date < todayIso || (a.date === todayIso && a.time && a.time < now);
    if (!isPast || a.category === 'rest' || i % 4 === 3) return a;
    return { ...a, status: 'completed', completedAt: new Date(`${a.date}T20:00:00`).toISOString() };
  });
}

export function loadSampleData() {
  const state = getState();
  if (hasSampleData(state)) return { ok: false };

  const todayIso = today();
  const thisWeek = startOfWeek(todayIso, state.profile.weekStart);
  const mark = { sample: true };

  // Actividades: 3 semanas anteriores y la actual con plantillas, más dos actividades propias
  const weeks = [-3, -2, -1, 0].map((n) => addDays(thisWeek, n * 7));
  const plan = [
    ['tpl-general', weeks[0]], ['tpl-home', weeks[1]], ['tpl-multisport', weeks[2]], ['tpl-general', weeks[3]],
  ];
  const applications = [];
  let activities = [];
  plan.forEach(([templateId, weekStart]) => {
    const applicationId = createId();
    applications.push({ id: applicationId, templateId, weekStart, appliedAt: new Date().toISOString(), ...mark });
    activities = activities.concat(buildTemplateActivities(getTemplate(templateId), weekStart, applicationId, mark));
  });
  activities.push(
    buildActivity({ name: 'Fútbol con amigos', category: 'football', date: addDays(thisWeek, 3), time: '20:00', durationMin: 60, intensity: 'high', notes: 'Llevar la pechera.' }, mark),
    buildActivity({ name: 'Pádel', category: 'racket', date: addDays(thisWeek, 8), time: '19:00', durationMin: 60, intensity: 'medium' }, mark),
  );
  activities = completePast(activities, todayIso);

  // Comidas de esta semana: algunas recetas y una nota libre
  const meals = [
    [0, 'breakfast', 'rec-avena-banana-cacao'], [0, 'lunch', 'rec-ensalada-garbanzos'], [0, 'dinner', 'rec-sopa-verduras'],
    [1, 'breakfast', 'rec-yogur-granola'], [1, 'dinner', 'rec-tortilla-verduras'],
    [2, 'lunch', 'rec-bowl-arroz-pollo'], [2, 'snack', 'rec-licuado-frutos-rojos'],
    [3, 'dinner', 'rec-fideos-tomate'], [4, 'lunch', 'rec-guiso-lentejas'],
  ];
  const mealPlan = {};
  meals.forEach(([offset, slot, recipeId]) => {
    const date = addDays(thisWeek, offset);
    mealPlan[date] = { ...mealPlan[date], [slot]: { type: 'recipe', recipeId, ...mark } };
  });
  const saturday = addDays(thisWeek, 5);
  mealPlan[saturday] = { ...mealPlan[saturday], dinner: { type: 'note', text: 'Cena afuera con amigos', ...mark } };

  // Compras: ingredientes de una receta planificada
  const recipe = getRecipe('rec-guiso-lentejas');
  const shoppingList = getRecipeIngredients(recipe).slice(0, 5).map((ingredient, i) => ({
    id: createId(), name: ingredient.name, quantity: ingredient.amount, checked: i < 2,
    recipeId: recipe.id, ingredientId: ingredient.id, createdAt: new Date().toISOString(), ...mark,
  }));

  // Un hábito con algunos días cumplidos (solo días pasados o de hoy)
  const habit = { id: createId(), name: 'Tomar agua', createdAt: new Date().toISOString(), ...mark };
  const habitLogs = [0, 1, 3, 4]
    .map((offset) => addDays(thisWeek, offset))
    .filter((date) => date <= todayIso)
    .map((date) => ({ id: createId(), habitId: habit.id, date, ...mark }));

  setState((s) => ({
    ...s,
    activities: [...s.activities, ...activities],
    templateApplications: [...s.templateApplications, ...applications],
    mealPlan: mergeMealPlans(s.mealPlan, mealPlan),
    shoppingList: [...s.shoppingList, ...shoppingList],
    habits: [...s.habits, habit],
    habitLogs: [...s.habitLogs, ...habitLogs],
    sampleData: { loadedAt: new Date().toISOString() },
  }));
  return { ok: true };
}

/** Agrega las comidas de ejemplo sin pisar las que la persona ya tenga. */
function mergeMealPlans(current, sample) {
  const result = { ...current };
  Object.entries(sample).forEach(([date, slots]) => {
    result[date] = { ...slots, ...current[date] };
  });
  return result;
}

/** Quita todo lo marcado como ejemplo y conserva lo demás. */
export function clearSampleData() {
  setState((s) => {
    const mealPlan = {};
    Object.entries(s.mealPlan).forEach(([date, slots]) => {
      const kept = Object.fromEntries(Object.entries(slots).filter(([, entry]) => !entry.sample));
      if (Object.keys(kept).length) mealPlan[date] = kept;
    });
    return {
      ...s,
      activities: s.activities.filter((a) => !a.sample),
      templateApplications: s.templateApplications.filter((a) => !a.sample),
      mealPlan,
      shoppingList: s.shoppingList.filter((i) => !i.sample),
      habits: s.habits.filter((h) => !h.sample),
      habitLogs: s.habitLogs.filter((l) => !l.sample),
      sampleData: null,
    };
  });
}
