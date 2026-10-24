// Vista "Nutrición": planificador de comidas, recetas, lista de compras y preferencias.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, emptyState, openDialog, closeDialog, confirmDialog, toast, showFieldErrors, requestRender } from '../ui.js';
import { getState } from '../state.js';
import { today, startOfWeek, addDays, weekDays, weeksBetween, formatRange, formatWeekday, formatDayNumber, formatLongDate } from '../utils/dates.js';
import { MEAL_SLOTS, NOTE_MAX, getMeal, setMeal, removeMeal, describeMeal, getWeekMeals, copyWeek, countCopyConflicts } from '../meals.js';
import {
  getRecipe, getRecipeIngredients, getRecipeAllergens, getRecipeWarnings, filterRecipes, getRecipePreferenceTests,
  TIME_FILTERS, NUTRITION_GOALS, setNutritionGoals,
} from '../recipes.js';
import { addItem, addRecipeIngredients, toggleItem, removeItem, removeCheckedItems, LIMITS as SHOP_LIMITS } from '../shopping-list.js';
import { RECIPES, MEAL_TYPES, DIET_TAGS } from '../../data/recipes.js';

export const title = 'Nutrición';

const TABS = [
  { id: 'planner', label: 'Planificador', icon: 'calendar' },
  { id: 'recipes', label: 'Recetas', icon: 'utensils' },
  { id: 'shopping', label: 'Compras', icon: 'check' },
  { id: 'prefs', label: 'Preferencias', icon: 'target' },
];

// Estado de interfaz (no se guarda)
let activeTab = 'planner';
let plannerWeek = null;
const EMPTY_FILTERS = { mealType: '', time: '', diet: '', matchPrefs: false };
let recipeFilters = { ...EMPTY_FILTERS };

const labelOf = (list, id) => list.find((item) => item.id === id)?.label ?? '';
const currentWeek = (state) => startOfWeek(today(), state.profile.weekStart);
const shownWeek = (state) => plannerWeek ?? currentWeek(state);

/** Abre Nutrición en una pestaña concreta (lo usa el inicio). */
export function showTab(tab) {
  activeTab = tab;
}

// ---------- Vista ----------

export function render(state) {
  const panels = { planner: renderPlanner, recipes: renderRecipes, shopping: renderShopping, prefs: renderPrefs };
  const pending = state.shoppingList.filter((i) => !i.checked).length;
  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Nutrición',
        title: 'Tu alimentación, organizada',
        text: 'Planificá tus comidas, encontrá recetas simples y armá tu lista de compras.',
        image: 'assets/images/sections/nutrition.webp',
        alt: 'Recipientes de vidrio con comidas preparadas: arroz, verduras y legumbres',
      })}

      <nav class="tabs" aria-label="Secciones de nutrición">
        ${TABS.map((tab) => html`
          <button type="button" class="tabs__btn" id="tab-${tab.id}" data-action="tab" data-tab="${tab.id}"
            aria-pressed="${tab.id === activeTab ? 'true' : 'false'}">
            ${icon(tab.icon, 'icon--sm')}<span>${tab.label}</span>
            ${tab.id === 'shopping' && pending ? html`<span class="tabs__count" aria-label="${pending} pendientes">${pending}</span>` : ''}
          </button>`)}
      </nav>

      <section class="stack" aria-labelledby="tab-${activeTab}">
        ${panels[activeTab](state)}
      </section>

      <p class="notice">${icon('info')}<span>NOVANTIQ Move no genera dietas, diagnósticos ni objetivos calóricos. Las recetas son ideas generales; para un plan personalizado, consultá con un/a nutricionista.</span></p>
    </div>
  `;
}

// ---------- Planificador ----------

function renderPlanner(state) {
  const weekStart = shownWeek(state);
  const days = weekDays(weekStart);
  const offset = weeksBetween(currentWeek(state), weekStart);
  const planned = getWeekMeals(state, weekStart).length;
  const todayIso = today();

  return html`
    <div class="week-toolbar">
      <div class="week-nav" role="group" aria-label="Cambiar de semana">
        <button type="button" class="btn btn--secondary btn--icon" id="meal-week-prev" data-action="meal-week" data-step="-1" aria-label="Semana anterior">${icon('chevron-left')}</button>
        <h2 class="week-nav__label" aria-live="polite">
          <span class="week-nav__eyebrow">${offset === 0 ? 'Semana actual' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana pasada' : offset > 0 ? `En ${offset} semanas` : `Hace ${-offset} semanas`}</span>
          ${formatRange(days[0], days[6])}
        </h2>
        <button type="button" class="btn btn--secondary btn--icon" id="meal-week-next" data-action="meal-week" data-step="1" aria-label="Semana siguiente">${icon('chevron-right')}</button>
      </div>
      <div class="btn-row">
        ${offset === 0 ? '' : html`<button type="button" class="btn btn--ghost" data-action="meal-week" data-step="0">Volver a hoy</button>`}
        ${planned ? html`<button type="button" class="btn btn--secondary" id="copy-week" data-action="copy-week">${icon('repeat', 'icon--sm')} Copiar semana</button>` : ''}
      </div>
    </div>

    ${planned ? '' : html`<section class="card">${emptyState({
      iconName: 'utensils',
      title: 'Sin comidas planificadas esta semana',
      text: 'Tocá "+" en cualquier comida para elegir una receta o escribir una nota libre.',
      actions: html`<button type="button" class="btn btn--secondary" data-action="tab" data-tab="recipes">Ver recetas</button>`,
    })}</section>`}

    <ol class="day-list">
      ${days.map((date) => renderMealDay(state, date, date === todayIso))}
    </ol>
  `;
}

function renderMealDay(state, date, isToday) {
  const dayLabel = `${formatWeekday(date, 'long')} ${formatDayNumber(date)}`;
  const slots = MEAL_SLOTS.filter((s) => !s.optional || getMeal(state, date, s.id));
  const hasExtra = Boolean(getMeal(state, date, 'extra'));
  return html`
    <li class="day" data-today="${isToday}" data-has-activities="${Boolean(state.mealPlan[date])}">
      <div class="day__header">
        <h3 class="day__title">${dayLabel} ${isToday ? html`<span class="badge badge--accent">Hoy</span>` : ''}</h3>
      </div>
      <ul class="meal-slots">
        ${slots.map((slot) => renderSlot(state, date, slot, dayLabel))}
      </ul>
      ${hasExtra ? '' : html`
        <button type="button" class="btn btn--ghost btn--sm meal-extra" id="meal-${date}-extra" data-action="edit-meal" data-date="${date}" data-slot="extra"
          aria-label="Agregar colación el ${dayLabel}">${icon('plus', 'icon--sm')} Colación</button>`}
    </li>`;
}

function renderSlot(state, date, slot, dayLabel) {
  const entry = getMeal(state, date, slot.id);
  const recipe = entry?.type === 'recipe' ? getRecipe(entry.recipeId) : null;
  const id = `meal-${date}-${slot.id}`;
  return html`
    <li class="meal-slot" data-filled="${Boolean(entry)}">
      <span class="meal-slot__label">${slot.label}</span>
      ${entry
        ? html`<button type="button" class="meal-slot__btn" id="${id}" data-action="edit-meal" data-date="${date}" data-slot="${slot.id}"
            aria-label="${slot.label} del ${dayLabel}: ${describeMeal(entry)}. Editar">
            ${recipe ? html`<img class="meal-slot__img" src="${recipe.image}" alt="" loading="lazy" decoding="async">` : html`<span class="meal-slot__note-icon">${icon('info', 'icon--sm')}</span>`}
            <span class="meal-slot__name">${describeMeal(entry)}</span>
          </button>`
        : html`<button type="button" class="meal-slot__add" id="${id}" data-action="edit-meal" data-date="${date}" data-slot="${slot.id}"
            aria-label="Agregar ${slot.label.toLowerCase()} el ${dayLabel}">${icon('plus', 'icon--sm')}</button>`}
    </li>`;
}

/** Diálogo para elegir receta o escribir una nota en una comida. */
function openMealEditor(date, slotId, presetRecipeId = '') {
  const state = getState();
  const slot = MEAL_SLOTS.find((s) => s.id === slotId);
  const current = getMeal(state, date, slotId);
  const type = presetRecipeId ? 'recipe' : current?.type ?? 'recipe';
  const selectedRecipe = presetRecipeId || (current?.type === 'recipe' ? current.recipeId : '');
  // Las recetas pensadas para esa comida aparecen primero
  const suggested = RECIPES.filter((r) => r.mealTypes.includes(slotId));
  const others = RECIPES.filter((r) => !r.mealTypes.includes(slotId));
  const option = (r) => html`<option value="${r.id}" ${r.id === selectedRecipe ? 'selected' : ''}>${r.name} · ${r.prepMinutes} min</option>`;

  openDialog({
    title: `${slot.label} · ${formatLongDate(date)}`,
    content: html`
      <form class="form" novalidate>
        <fieldset class="choice">
          <legend class="field__label">¿Qué vas a comer?</legend>
          <label class="choice__item"><input type="radio" name="type" value="recipe" ${type === 'recipe' ? 'checked' : ''}> Una receta</label>
          <label class="choice__item"><input type="radio" name="type" value="note" ${type === 'note' ? 'checked' : ''}> Nota libre</label>
        </fieldset>

        <div class="field" data-for="recipe" ${type === 'recipe' ? '' : 'hidden'}>
          <label class="field__label" for="me-recipe">Receta</label>
          <select class="field__input" id="me-recipe" name="recipeId" aria-describedby="error-recipeId">
            <option value="">Elegí una receta</option>
            ${suggested.length ? html`<optgroup label="Sugeridas para ${slot.label.toLowerCase()}">${suggested.map(option)}</optgroup>` : ''}
            ${others.length ? html`<optgroup label="Otras recetas">${others.map(option)}</optgroup>` : ''}
          </select>
          <p class="field__error" id="error-recipeId"></p>
        </div>

        <div class="field" data-for="note" ${type === 'note' ? '' : 'hidden'}>
          <label class="field__label" for="me-text">Nota</label>
          <input class="field__input" id="me-text" name="text" type="text" maxlength="${NOTE_MAX}"
            value="${current?.type === 'note' ? current.text : ''}" placeholder="Ej.: Comer afuera con amigos" aria-describedby="error-text">
          <p class="field__error" id="error-text"></p>
        </div>

        <div class="dialog__footer dialog__footer--split">
          ${current ? html`<button type="button" class="btn btn--ghost btn--danger-text" data-remove>Quitar</button>` : html`<span></span>`}
          <div class="btn-row">
            <button type="button" class="btn btn--ghost" data-dialog-close>Cancelar</button>
            <button type="submit" class="btn btn--primary">${icon('check')} Guardar</button>
          </div>
        </div>
      </form>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('form');
      // Muestra solo el campo del tipo elegido
      form.addEventListener('change', (event) => {
        if (event.target.name !== 'type') return;
        form.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== event.target.value; });
      });
      form.querySelector('[data-remove]')?.addEventListener('click', () => {
        removeMeal(date, slotId);
        closeDialog();
        toast(`${slot.label} quitado.`);
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const entry = data.type === 'recipe' ? { type: 'recipe', recipeId: data.recipeId } : { type: 'note', text: data.text };
        const result = setMeal(date, slotId, entry);
        if (!result.ok) {
          showFieldErrors(form, result.errors);
          return;
        }
        closeDialog();
        toast(`${slot.label} guardado: ${describeMeal(entry)}.`);
      });
    },
  });
}

function openCopyWeek() {
  const state = getState();
  const from = shownWeek(state);
  const targets = [1, 2, 3, 4].map((n) => addDays(from, n * 7));

  openDialog({
    title: 'Copiar planificación',
    content: html`
      <form class="form" novalidate>
        <p class="dialog__message">Se copian las comidas de la semana del ${formatRange(from, addDays(from, 6))} día por día (lunes a lunes, martes a martes…).</p>
        <div class="field">
          <label class="field__label" for="copy-target">Copiar a la semana</label>
          <select class="field__input" id="copy-target" name="target">
            ${targets.map((t) => html`<option value="${t}">${formatRange(t, addDays(t, 6))}</option>`)}
          </select>
        </div>
        <div class="dialog__footer">
          <button type="button" class="btn btn--ghost" data-dialog-close>Cancelar</button>
          <button type="submit" class="btn btn--primary">${icon('repeat', 'icon--sm')} Copiar</button>
        </div>
      </form>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const target = form.elements.target.value;
        const conflicts = countCopyConflicts(getState(), from, target);
        if (conflicts) {
          const ok = await confirmDialog({
            title: 'Hay comidas planificadas',
            message: `La semana del ${formatRange(target, addDays(target, 6))} ya tiene ${conflicts === 1 ? '1 comida' : `${conflicts} comidas`} en los mismos días y momentos. ${conflicts === 1 ? 'Se va a reemplazar' : 'Se van a reemplazar'}; el resto queda igual.`,
            confirmLabel: 'Reemplazar y copiar',
          });
          if (!ok) return;
        }
        const copied = copyWeek(from, target);
        closeDialog();
        plannerWeek = target;
        requestRender();
        toast(`Se copiaron ${copied} comidas a la semana del ${formatRange(target, addDays(target, 6))}.`);
      });
    },
  });
}

// ---------- Recetas ----------

function renderRecipes(state) {
  const results = filterRecipes(recipeFilters, state.nutritionPrefs);
  const prefTests = getRecipePreferenceTests(state.nutritionPrefs);
  const hasFilters = Object.values(recipeFilters).some(Boolean);
  const select = (name, label, options) => html`
    <div class="field">
      <label class="field__label" for="rf-${name}">${label}</label>
      <select class="field__input" id="rf-${name}" name="${name}" data-change="recipe-filter">
        <option value="">Todas</option>
        ${options.map((o) => html`<option value="${o.id}" ${recipeFilters[name] === o.id ? 'selected' : ''}>${o.label}</option>`)}
      </select>
    </div>`;

  return html`
    <section class="card" aria-labelledby="rf-title">
      <div class="card__header">
        <h2 class="card__title" id="rf-title">${icon('filter')} Filtrar recetas</h2>
        ${hasFilters ? html`<button type="button" class="btn btn--ghost btn--sm" id="rf-clear" data-action="clear-recipe-filters">Limpiar filtros</button>` : ''}
      </div>
      <div class="filters filters--3">
        ${select('mealType', 'Tipo de comida', MEAL_TYPES)}
        ${select('time', 'Preparación', TIME_FILTERS)}
        ${select('diet', 'Preferencia', DIET_TAGS)}
      </div>
      <label class="check-field">
        <input type="checkbox" id="rf-prefs" name="matchPrefs" data-change="recipe-filter" ${recipeFilters.matchPrefs ? 'checked' : ''} ${prefTests.length ? '' : 'disabled'}>
        <span>Según mis preferencias
          <small>${prefTests.length ? prefTests.map((p) => p.label.toLowerCase()).join(' · ') : 'Elegí preferencias en la pestaña Preferencias para usar este filtro.'}</small>
        </span>
      </label>
    </section>

    <p class="results-count" role="status">${results.length} ${results.length === 1 ? 'receta' : 'recetas'}</p>

    ${results.length
      ? html`<ul class="template-grid">${results.map(renderRecipeCard)}</ul>`
      : html`<section class="card">${emptyState({
        iconName: 'filter',
        title: 'Ninguna receta coincide',
        text: 'Probá quitar alguno de los filtros.',
        actions: html`<button type="button" class="btn btn--secondary" data-action="clear-recipe-filters">Limpiar filtros</button>`,
      })}</section>`}
  `;
}

function renderRecipeCard(recipe) {
  const allergens = getRecipeAllergens(recipe);
  const warnings = getRecipeWarnings(recipe);
  return html`
    <li class="template-card">
      <img class="template-card__img" src="${recipe.image}" alt="${recipe.alt}" width="800" height="500" loading="lazy" decoding="async">
      <div class="template-card__body">
        <div class="template-card__badges">
          ${recipe.mealTypes.map((m) => html`<span class="badge">${labelOf(MEAL_TYPES, m)}</span>`)}
        </div>
        <h3 class="template-card__title">${recipe.name}</h3>
        <p class="template-card__text">${recipe.description}</p>
        <p class="meta">
          <span class="meta__item">${icon('clock', 'icon--sm')}${recipe.prepMinutes} min</span>
          <span>${recipe.servings} ${recipe.servings === 1 ? 'porción' : 'porciones'}</span>
          ${recipe.tags.map((t) => html`<span class="badge badge--accent">${labelOf(DIET_TAGS, t)}</span>`)}
        </p>
        <p class="allergen-line">${allergens.length ? `Contiene: ${allergens.map((a) => a.label).join(', ')}` : 'Sin alérgenos principales en los ingredientes listados'}${warnings.length ? ` · Revisá: ${warnings.map((w) => w.name.toLowerCase()).join(', ')}` : ''}</p>
        <button type="button" class="btn btn--secondary btn--block" id="recipe-${recipe.id}" data-action="open-recipe" data-id="${recipe.id}" aria-label="Ver receta: ${recipe.name}">
          Ver receta ${icon('arrow-right', 'icon--sm')}
        </button>
      </div>
    </li>`;
}

export function openRecipeDetail(recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return;
  const ingredients = getRecipeIngredients(recipe);
  const allergens = getRecipeAllergens(recipe);
  const warnings = getRecipeWarnings(recipe);
  const defaultSlot = recipe.mealTypes[0];

  openDialog({
    title: recipe.name,
    content: html`
      <div class="detail">
        <img class="detail__img" src="${recipe.image}" alt="${recipe.alt}" width="800" height="500">
        <p class="detail__text">${recipe.description}</p>
        <dl class="detail__facts">
          <div><dt>Preparación</dt><dd>${recipe.prepMinutes} min</dd></div>
          <div><dt>Porciones orientativas</dt><dd>${recipe.servings}</dd></div>
        </dl>

        <section class="allergens" aria-labelledby="allergens-title">
          <h3 class="detail__subtitle" id="allergens-title">Alérgenos</h3>
          ${allergens.length
            ? html`<p class="allergens__list">${allergens.map((a) => html`<span class="badge badge--rescheduled">${a.label}</span>`)}</p>`
            : html`<p class="detail__text">No se identificaron alérgenos principales en los ingredientes listados.</p>`}
          ${warnings.length ? html`<ul class="allergens__warnings">${warnings.map((w) => html`<li>${icon('info', 'icon--sm')}<span><strong>${w.name}:</strong> ${w.warning}.</span></li>`)}</ul>` : ''}
          <p class="field__hint">Información orientativa según los ingredientes de la receta. Los productos que uses pueden contener otros alérgenos o trazas: revisá siempre las etiquetas.</p>
        </section>

        <section>
          <div class="detail__subtitle-row">
            <h3 class="detail__subtitle">Ingredientes</h3>
            <button type="button" class="btn btn--secondary btn--sm" data-add-all>${icon('plus', 'icon--sm')} Agregar todos a compras</button>
          </div>
          <ul class="ingredient-list">
            ${ingredients.map((i) => html`
              <li class="ingredient">
                <span><strong>${i.name}</strong> <span class="ingredient__amount">${i.amount}</span></span>
                <button type="button" class="btn btn--ghost btn--icon" data-add-ingredient="${i.id}" aria-label="Agregar ${i.name} a la lista de compras">${icon('plus')}</button>
              </li>`)}
          </ul>
        </section>

        <section>
          <h3 class="detail__subtitle">Pasos</h3>
          <ol class="steps">${recipe.steps.map((step) => html`<li>${step}</li>`)}</ol>
        </section>

        <form class="form apply-form" novalidate>
          <h3 class="detail__subtitle">Planificar esta receta</h3>
          <div class="form-row">
            <div class="field">
              <label class="field__label" for="rp-date">Día</label>
              <input class="field__input" id="rp-date" name="date" type="date" value="${today()}" required>
            </div>
            <div class="field">
              <label class="field__label" for="rp-slot">Comida</label>
              <select class="field__input" id="rp-slot" name="slot">
                ${MEAL_SLOTS.map((s) => html`<option value="${s.id}" ${s.id === defaultSlot ? 'selected' : ''}>${s.label}</option>`)}
              </select>
            </div>
          </div>
          <p class="field__error" id="error-date"></p>
          <button type="submit" class="btn btn--primary btn--block">${icon('calendar', 'icon--sm')} Agregar al planificador</button>
        </form>
      </div>
    `,
    onOpen(dialogEl) {
      dialogEl.querySelector('[data-add-all]').addEventListener('click', () => {
        const { added, skipped } = addRecipeIngredients(recipeId);
        toast(added ? `Se agregaron ${added} ingredientes a compras${skipped ? ` (${skipped} ya estaban)` : ''}.` : 'Todos los ingredientes ya estaban en tu lista.');
      });
      dialogEl.querySelector('.ingredient-list').addEventListener('click', (event) => {
        const id = event.target.closest('[data-add-ingredient]')?.dataset.addIngredient;
        if (!id) return;
        const { added } = addRecipeIngredients(recipeId, [id]);
        const name = ingredients.find((i) => i.id === id).name;
        toast(added ? `${name} agregado a compras.` : `${name} ya estaba en tu lista.`);
      });
      dialogEl.querySelector('.apply-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        const { date, slot } = Object.fromEntries(new FormData(form));
        const slotLabel = MEAL_SLOTS.find((s) => s.id === slot).label;
        const existing = getMeal(getState(), date, slot);
        if (existing) {
          const ok = await confirmDialog({
            title: 'Ya hay algo planificado',
            message: `El ${formatLongDate(date)} ya tenés "${describeMeal(existing)}" en ${slotLabel.toLowerCase()}. ¿Lo reemplazás por "${recipe.name}"?`,
            confirmLabel: 'Reemplazar',
          });
          if (!ok) {
            openRecipeDetail(recipeId);
            return;
          }
        }
        const result = setMeal(date, slot, { type: 'recipe', recipeId });
        if (!result.ok) {
          showFieldErrors(form, result.errors);
          return;
        }
        closeDialog();
        toast(`"${recipe.name}" agregada a ${slotLabel.toLowerCase()} del ${formatLongDate(date)}.`);
      });
    },
  });
}

// ---------- Lista de compras ----------

function renderShopping(state) {
  const pending = state.shoppingList.filter((i) => !i.checked);
  const bought = state.shoppingList.filter((i) => i.checked);

  return html`
    <section class="card">
      <div class="card__header"><h2 class="card__title">${icon('plus')} Agregar producto</h2></div>
      <form class="form shop-form" data-form="shopping-add" novalidate>
        <div class="field">
          <label class="field__label" for="shop-name">Producto</label>
          <input class="field__input" id="shop-name" name="name" type="text" maxlength="${SHOP_LIMITS.name}" autocomplete="off" placeholder="Ej.: Tomates" aria-describedby="error-name">
          <p class="field__error" id="error-name"></p>
        </div>
        <div class="field">
          <label class="field__label" for="shop-qty">Cantidad <span class="field__optional">(opcional)</span></label>
          <input class="field__input" id="shop-qty" name="quantity" type="text" maxlength="${SHOP_LIMITS.quantity}" autocomplete="off" placeholder="Ej.: 1 kg" aria-describedby="error-quantity">
          <p class="field__error" id="error-quantity"></p>
        </div>
        <button type="submit" class="btn btn--primary">${icon('plus')} Agregar</button>
      </form>
      <p class="field__hint shop-hint">También podés sumar ingredientes desde cualquier receta.</p>
    </section>

    ${state.shoppingList.length === 0
      ? html`<section class="card">${emptyState({
        iconName: 'check',
        title: 'Tu lista está vacía',
        text: 'Agregá productos a mano o abrí una receta y tocá "Agregar todos a compras".',
        actions: html`<button type="button" class="btn btn--secondary" data-action="tab" data-tab="recipes">Ver recetas</button>`,
      })}</section>`
      : html`
        <section class="card">
          <div class="card__header"><h2 class="card__title">Por comprar <span class="detail__count">${pending.length}</span></h2></div>
          ${pending.length ? html`<ul class="shop-list">${pending.map(renderShopItem)}</ul>` : html`<p class="card__text">¡Listo! Compraste todo.</p>`}
        </section>
        ${bought.length ? html`
          <section class="card">
            <div class="card__header">
              <h2 class="card__title">Comprados <span class="detail__count">${bought.length}</span></h2>
              <button type="button" class="btn btn--ghost btn--sm btn--danger-text" id="clear-bought" data-action="clear-bought">Eliminar comprados</button>
            </div>
            <ul class="shop-list">${bought.map(renderShopItem)}</ul>
          </section>` : ''}
      `}
  `;
}

function renderShopItem(item) {
  const recipe = item.recipeId ? getRecipe(item.recipeId) : null;
  return html`
    <li class="shop-item" data-checked="${item.checked}">
      <label class="shop-item__label">
        <input type="checkbox" id="shop-${item.id}" data-change="toggle-item" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
        <span>
          <span class="shop-item__name">${item.name}</span>
          ${item.quantity ? html`<span class="shop-item__qty">${item.quantity}</span>` : ''}
          ${recipe ? html`<small class="shop-item__source">Para: ${recipe.name}</small>` : ''}
        </span>
      </label>
      <button type="button" class="btn btn--ghost btn--icon" data-action="remove-item" data-id="${item.id}" aria-label="Eliminar ${item.name} de la lista">${icon('x')}</button>
    </li>`;
}

// ---------- Preferencias ----------

function renderPrefs(state) {
  const goals = new Set(state.nutritionPrefs.goals);
  const checkbox = (g) => html`
    <label class="check-field">
      <input type="checkbox" name="goals" value="${g.id}" ${goals.has(g.id) ? 'checked' : ''}>
      <span>${g.label}</span>
    </label>`;
  return html`
    <section class="card">
      <div class="card__header"><h2 class="card__title">${icon('target')} Tus preferencias</h2></div>
      <form class="form" data-form="nutrition-prefs" novalidate>
        <fieldset class="check-group">
          <legend class="field__label">¿Qué te gustaría lograr con tu alimentación?</legend>
          ${NUTRITION_GOALS.filter((g) => !g.informational).map(checkbox)}
        </fieldset>
        <fieldset class="check-group">
          <legend class="field__label">Otros objetivos <span class="field__optional">(solo se registran)</span></legend>
          ${NUTRITION_GOALS.filter((g) => g.informational).map(checkbox)}
          <p class="field__hint">Estos objetivos quedan anotados como preferencia, pero no cambian recetas ni activan dietas. Para objetivos de composición corporal o rendimiento, lo indicado es consultar con un/a profesional.</p>
        </fieldset>
        <div class="btn-row"><button type="submit" class="btn btn--primary">${icon('check')} Guardar preferencias</button></div>
      </form>
    </section>
  `;
}

// ---------- Eventos ----------

export const actions = {
  tab: (button) => {
    activeTab = button.dataset.tab;
    requestRender();
    document.getElementById(`tab-${activeTab}`)?.focus();
  },
  'meal-week': (button) => {
    const step = Number(button.dataset.step);
    plannerWeek = step === 0 ? null : addDays(shownWeek(getState()), step * 7);
    requestRender();
  },
  'edit-meal': (button) => openMealEditor(button.dataset.date, button.dataset.slot),
  'copy-week': () => openCopyWeek(),
  'open-recipe': (button) => openRecipeDetail(button.dataset.id),
  'clear-recipe-filters': () => {
    recipeFilters = { ...EMPTY_FILTERS };
    requestRender();
    document.getElementById('rf-mealType')?.focus();
  },
  'remove-item': (button) => {
    const item = getState().shoppingList.find((i) => i.id === button.dataset.id);
    removeItem(button.dataset.id);
    if (item) toast(`${item.name} eliminado de la lista.`);
  },
  'clear-bought': async () => {
    const count = getState().shoppingList.filter((i) => i.checked).length;
    const ok = await confirmDialog({
      title: 'Eliminar comprados',
      message: `Se van a eliminar ${count} ${count === 1 ? 'producto comprado' : 'productos comprados'} de la lista.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    removeCheckedItems();
    toast('Productos comprados eliminados.');
  },
};

export const changes = {
  'recipe-filter': (input) => {
    recipeFilters = { ...recipeFilters, [input.name]: input.type === 'checkbox' ? input.checked : input.value };
    requestRender();
  },
  'toggle-item': (input) => toggleItem(input.dataset.id),
};

export const forms = {
  'shopping-add': (form) => {
    const data = Object.fromEntries(new FormData(form));
    const result = addItem(data);
    if (!result.ok) {
      showFieldErrors(form, result.errors);
      return;
    }
    if (result.duplicate) {
      showFieldErrors(form, { name: `"${data.name.trim()}" ya está en tu lista.` });
      return;
    }
    toast(`${data.name.trim()} agregado.`);
    document.getElementById('shop-name')?.focus(); // listo para cargar el siguiente
  },
  'nutrition-prefs': (form) => {
    const goals = new FormData(form).getAll('goals');
    setNutritionGoals(goals);
    toast('Preferencias guardadas.');
  },
};
