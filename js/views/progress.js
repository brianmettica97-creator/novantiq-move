// Vista "Mi progreso": estadísticas derivadas de los registros reales y hábitos opcionales.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, emptyState, confirmDialog, toast, showFieldErrors, requestRender, weekNavigator, stepWeek } from '../ui.js';
import { getState } from '../state.js';
import { today, startOfWeek, addDays, weekDays, formatRange, formatShortDate, formatWeekday, formatDayNumber } from '../utils/dates.js';
import {
  getWeekSummary, getCategoryBreakdown, getWeeklyHistory,
  addHabit, removeHabit, toggleHabit, isHabitDone, HABIT_LIMITS, HABIT_SUGGESTIONS,
} from '../progress.js';

export const title = 'Mi progreso';

let shownWeekStart = null; // estado de interfaz: null = semana actual

const currentWeek = (state) => startOfWeek(today(), state.profile.weekStart);
const shownWeek = (state) => shownWeekStart ?? currentWeek(state);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function render(state) {
  const weekStart = shownWeek(state);
  const weekEnd = addDays(weekStart, 6);
  const summary = getWeekSummary(state, weekStart);
  const hasAnyActivity = state.activities.length > 0;

  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Mi progreso',
        title: 'Tu constancia, a la vista',
        text: 'Todo se calcula a partir de lo que registrás: lo planificado y lo que marcaste como completado.',
        image: 'assets/images/sections/progress.webp',
        alt: 'Persona tocando un reloj inteligente en su muñeca',
      })}

      ${weekNavigator({ idPrefix: 'progress-week', action: 'progress-week', weekStart, currentWeekStart: currentWeek(state) })}

      ${hasAnyActivity ? html`
        <div class="stats stats--4">
          <p class="stat"><span class="stat__value">${summary.completed}</span><span class="stat__label">Sesiones completadas</span></p>
          <p class="stat"><span class="stat__value">${summary.planned}</span><span class="stat__label">Sesiones planificadas</span></p>
          <p class="stat"><span class="stat__value">${summary.minutesCompleted}</span><span class="stat__label">Minutos registrados</span></p>
          <p class="stat"><span class="stat__value">${summary.activeDays}</span><span class="stat__label">Días con actividad</span></p>
        </div>

        <div class="progress-grid">
          ${renderCompletion(summary)}
          ${renderCategories(state, weekStart, weekEnd)}
        </div>

        ${renderHistory(state, weekStart)}
      ` : html`
        <section class="card">${emptyState({
          iconName: 'chart',
          title: 'Todavía no hay registros',
          text: 'Cuando agendes actividades y las marques como completadas, acá vas a ver tu semana, tus actividades por categoría y tu historial.',
          actions: html`<a class="btn btn--primary" href="#/semana">${icon('calendar', 'icon--sm')} Ir a mi semana</a>
            <a class="btn btn--secondary" href="#/planes">Ver plantillas</a>`,
        })}</section>
      `}

      ${renderHabits(state, weekStart)}

      <p class="notice">${icon('info')}<span>No estimamos calorías ni comparamos tu actividad con la de otras personas. Los días de descanso y los días sin actividad también son parte de tu semana: nunca cuentan como un fracaso.</span></p>
    </div>
  `;
}

// ---------- Cumplimiento de la planificación ----------

function renderCompletion(summary) {
  const header = html`<div class="card__header"><h2 class="card__title">${icon('target')} Tu plan de la semana</h2></div>`;
  if (summary.completionRate === null) {
    return html`<section class="card">${header}
      <p class="card__text">No hay sesiones planificadas en esta semana${summary.restDays ? `, solo ${plural(summary.restDays, 'día', 'días')} de descanso` : ''}.</p>
    </section>`;
  }
  const percent = Math.round(summary.completionRate * 100);
  return html`
    <section class="card">
      ${header}
      <p class="completion__text">Completaste <strong>${summary.completed}</strong> de <strong>${summary.planned}</strong> ${summary.planned === 1 ? 'sesión planificada' : 'sesiones planificadas'}.</p>
      <div class="meter" role="img" aria-label="${percent}% de las sesiones planificadas completadas">
        <span class="meter__fill" style="width: ${percent}%"></span>
      </div>
      <p class="meter__caption"><span>${percent}%</span>
        ${summary.restDays ? html`<span>${icon('cat-rest', 'icon--sm')} ${plural(summary.restDays, 'día', 'días')} de descanso planificado</span>` : ''}</p>
    </section>`;
}

// ---------- Actividades por categoría (barras horizontales, una serie) ----------

function renderCategories(state, from, to) {
  const rows = getCategoryBreakdown(state, from, to);
  const header = html`<div class="card__header"><h2 class="card__title">${icon('layers')} Por categoría</h2></div>`;
  if (!rows.length) {
    return html`<section class="card">${header}<p class="card__text">Cuando completes actividades esta semana, vas a ver acá en qué se repartió tu tiempo.</p></section>`;
  }
  // Si ninguna actividad completada tiene duración, se compara por cantidad de sesiones
  const byMinutes = rows.some((r) => r.minutes > 0);
  const max = Math.max(...rows.map((r) => (byMinutes ? r.minutes : r.sessions)));
  return html`
    <section class="card">
      ${header}
      <p class="card__text">${byMinutes ? 'Minutos completados en la semana.' : 'Sesiones completadas en la semana.'}</p>
      <ul class="hbars">
        ${rows.map((r) => {
          const value = byMinutes ? r.minutes : r.sessions;
          return html`
            <li class="hbar">
              <span class="hbar__label">${icon(r.category.icon, 'icon--sm')} ${r.category.short}</span>
              <span class="hbar__track"><span class="hbar__fill" style="width: ${Math.max(4, (value / max) * 100)}%"></span></span>
              <span class="hbar__value">${byMinutes ? `${r.minutes} min` : ''}${byMinutes ? ' · ' : ''}${plural(r.sessions, 'sesión', 'sesiones')}</span>
            </li>`;
        })}
      </ul>
    </section>`;
}

// ---------- Historial semanal (columnas: planificadas como pista, completadas como relleno) ----------

function renderHistory(state, lastWeekStart) {
  const weeks = getWeeklyHistory(state, lastWeekStart, 8);
  const max = Math.max(1, ...weeks.map((w) => w.planned));
  const label = (w) => `Semana del ${formatRange(w.weekStart, addDays(w.weekStart, 6))}: ${w.completed} de ${plural(w.planned, 'sesión planificada', 'sesiones planificadas')} completadas, ${w.minutesCompleted} minutos`;

  return html`
    <section class="card" aria-labelledby="history-title">
      <div class="card__header">
        <h2 class="card__title" id="history-title">${icon('chart')} Últimas 8 semanas</h2>
      </div>
      <ul class="legend" aria-hidden="true">
        <li><span class="legend__swatch legend__swatch--done"></span> Completadas</li>
        <li><span class="legend__swatch legend__swatch--planned"></span> Planificadas</li>
      </ul>
      <ol class="columns" style="--max: ${max}">
        ${weeks.map((w, i) => html`
          <li class="column" tabindex="0" aria-label="${label(w)}" data-current="${i === weeks.length - 1}">
            <span class="column__plot">
              ${i === weeks.length - 1 && w.planned ? html`<span class="column__value" style="bottom: calc(${(w.planned / max) * 100}% + 4px)">${w.completed}/${w.planned}</span>` : ''}
              <span class="column__track" style="height: ${(w.planned / max) * 100}%">
                <span class="column__fill" style="height: ${w.planned ? (w.completed / w.planned) * 100 : 0}%"></span>
              </span>
            </span>
            <span class="column__label">${formatShortDate(w.weekStart)}</span>
            <span class="column__tip" aria-hidden="true">
              <strong>${formatRange(w.weekStart, addDays(w.weekStart, 6))}</strong>
              ${w.completed} de ${w.planned} completadas<br>${w.minutesCompleted} min
            </span>
          </li>`)}
      </ol>
      <details class="table-view">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th scope="col">Semana</th><th scope="col">Planificadas</th><th scope="col">Completadas</th><th scope="col">Minutos</th></tr></thead>
          <tbody>
            ${weeks.map((w) => html`<tr><th scope="row">${formatRange(w.weekStart, addDays(w.weekStart, 6))}</th><td>${w.planned}</td><td>${w.completed}</td><td>${w.minutesCompleted}</td></tr>`)}
          </tbody>
        </table>
      </details>
    </section>`;
}

// ---------- Hábitos opcionales ----------

function renderHabits(state, weekStart) {
  const days = weekDays(weekStart);
  const canAdd = state.habits.length < HABIT_LIMITS.max;
  const unusedSuggestions = HABIT_SUGGESTIONS.filter((s) => !state.habits.some((h) => h.name === s));

  return html`
    <section class="card" aria-labelledby="habits-title">
      <div class="card__header">
        <h2 class="card__title" id="habits-title">${icon('check')} Hábitos <span class="field__optional">(opcional)</span></h2>
      </div>

      ${state.habits.length ? html`
        <div class="habit-table-wrap">
          <table class="habit-table">
            <thead>
              <tr>
                <th scope="col"><span class="visually-hidden">Hábito</span></th>
                ${days.map((d) => html`<th scope="col"><span class="habit-table__day">${formatWeekday(d)}</span><span class="habit-table__num">${formatDayNumber(d)}</span></th>`)}
                <th scope="col"><span class="visually-hidden">Total y acciones</span></th>
              </tr>
            </thead>
            <tbody>
              ${state.habits.map((habit) => {
                const done = days.filter((d) => isHabitDone(state, habit.id, d)).length;
                return html`
                  <tr>
                    <th scope="row" class="habit-table__name">${habit.name}</th>
                    ${days.map((d) => html`
                      <td>
                        <label class="habit-check">
                          <input type="checkbox" id="habit-${habit.id}-${d}" data-change="toggle-habit" data-habit="${habit.id}" data-date="${d}"
                            ${isHabitDone(state, habit.id, d) ? 'checked' : ''}>
                          <span class="visually-hidden">${habit.name}, ${formatWeekday(d, 'long')} ${formatDayNumber(d)}</span>
                        </label>
                      </td>`)}
                    <td class="habit-table__end">
                      <span class="habit-table__count">${done}/7</span>
                      <button type="button" class="btn btn--ghost btn--icon" data-action="remove-habit" data-id="${habit.id}" aria-label="Eliminar el hábito ${habit.name}">${icon('x', 'icon--sm')}</button>
                    </td>
                  </tr>`;
              })}
            </tbody>
          </table>
        </div>` : html`<p class="card__text">Sumá pequeños hábitos que quieras sostener y tildalos cada día. Son opcionales y no afectan tus estadísticas.</p>`}

      ${canAdd ? html`
        <form class="form habit-form" data-form="add-habit" novalidate>
          <div class="field">
            <label class="field__label" for="habit-name">Nuevo hábito</label>
            <input class="field__input" id="habit-name" name="name" type="text" maxlength="${HABIT_LIMITS.name}" autocomplete="off" placeholder="Ej.: Tomar agua" aria-describedby="error-name">
            <p class="field__error" id="error-name"></p>
          </div>
          <button type="submit" class="btn btn--secondary">${icon('plus')} Agregar</button>
        </form>
        ${unusedSuggestions.length ? html`
          <div class="chips" aria-label="Sugerencias">
            ${unusedSuggestions.map((s) => html`<button type="button" class="chip" data-action="suggest-habit" data-name="${s}">${icon('plus', 'icon--sm')} ${s}</button>`)}
          </div>` : ''}
      ` : html`<p class="field__hint">Llegaste al máximo de ${HABIT_LIMITS.max} hábitos. Eliminá alguno para sumar otro.</p>`}
    </section>`;
}

// ---------- Eventos ----------

export const actions = {
  'progress-week': (button) => {
    const step = Number(button.dataset.step);
    shownWeekStart = stepWeek(shownWeek(getState()), step);
    requestRender();
    if (step === 0) document.getElementById('progress-week-next')?.focus();
  },
  'suggest-habit': (button) => {
    const result = addHabit(getState(), button.dataset.name);
    if (result.ok) toast(`Hábito "${button.dataset.name}" agregado.`);
    document.getElementById('habit-name')?.focus();
  },
  'remove-habit': async (button) => {
    const habit = getState().habits.find((h) => h.id === button.dataset.id);
    if (!habit) return;
    const ok = await confirmDialog({
      title: 'Eliminar hábito',
      message: `Se eliminará "${habit.name}" y todos sus registros.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    removeHabit(habit.id);
    toast('Hábito eliminado.');
  },
};

export const changes = {
  'toggle-habit': (input) => toggleHabit(input.dataset.habit, input.dataset.date),
};

export const forms = {
  'add-habit': (form) => {
    const name = form.elements.name.value;
    const result = addHabit(getState(), name);
    if (!result.ok) {
      showFieldErrors(form, result.errors);
      return;
    }
    toast(`Hábito "${name.trim()}" agregado.`);
    document.getElementById('habit-name')?.focus();
  },
};
