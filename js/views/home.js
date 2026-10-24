// Vista "Inicio": dashboard personal.
// Todo lo que se muestra sale del estado real; sin datos, se ven estados vacíos.

import { html, icon } from '../utils/dom.js';
import { emptyState } from '../ui.js';
import { today, startOfWeek, formatLongDate, formatWeekday, formatDayNumber, formatRelativeDay, greetingFor } from '../utils/dates.js';
import { getNextActivity } from '../activities.js';
import { getWeekSummary } from '../progress.js';
import { getCategory } from '../../data/categories.js';

export const title = 'Inicio';

export function render(state) {
  const todayIso = today();
  const summary = getWeekSummary(state, startOfWeek(todayIso, state.profile.weekStart));
  const next = getNextActivity(state);
  const name = state.profile.displayName;

  return html`
    <div class="dashboard">
      <section class="hero dashboard__hero" aria-labelledby="view-title">
        <img class="hero__img" src="assets/images/hero/home.webp" alt="" width="1600" height="900" decoding="async">
        <div class="hero__content">
          <p class="hero__date">${formatLongDate(todayIso)}</p>
          <h1 class="hero__title" id="view-title" tabindex="-1">${greetingFor()}${name ? html`, ${name}` : ''}</h1>
          <p class="hero__text">Organizá tu semana, mantené tus hábitos y seguí tu progreso en un solo lugar.</p>
          <div class="btn-row hero__actions">
            <button type="button" class="btn btn--primary" data-action="add-activity">${icon('plus')} Agregar actividad</button>
            ${name ? '' : html`<a class="btn btn--secondary" href="#/perfil">Contanos cómo llamarte</a>`}
          </div>
        </div>
      </section>

      <div class="stack">
        ${renderWeekCard(summary, todayIso)}
        ${renderNextCard(next)}
      </div>

      <div class="stack">
        ${renderMealsCard(state)}
        <a class="feature-card" href="#/planes">
          <img class="feature-card__img" src="assets/images/sections/plans.webp" alt="" loading="lazy" decoding="async">
          <span class="feature-card__body">
            <span class="feature-card__title"><strong>Planes y plantillas</strong> <span class="badge badge--soon">Próximamente</span></span>
            <span class="feature-card__text">Semanas de ejemplo listas para sumar a tu planificación.</span>
          </span>
        </a>
        <a class="feature-card" href="#/progreso">
          <img class="feature-card__img" src="assets/images/sections/progress.webp" alt="" loading="lazy" decoding="async">
          <span class="feature-card__body">
            <span class="feature-card__title"><strong>Mi progreso</strong> ${icon('arrow-right', 'icon--sm')}</span>
            <span class="feature-card__text">${summary.completed
              ? `${summary.completed} ${summary.completed === 1 ? 'sesión completada' : 'sesiones completadas'} esta semana.`
              : 'Tus sesiones completadas aparecerán acá.'}</span>
          </span>
        </a>
      </div>
    </div>
  `;
}

function renderWeekCard(summary, todayIso) {
  const header = html`
    <div class="card__header">
      <h2 class="card__title">${icon('calendar')} Tu semana</h2>
      <a class="link-arrow" href="#/semana">Ver semana ${icon('arrow-right', 'icon--sm')}</a>
    </div>`;

  if (!summary.planned && !summary.days.some((d) => d.isRest)) {
    return html`
      <section class="card">
        ${header}
        ${emptyState({
          iconName: 'calendar',
          title: 'Todavía no planificaste esta semana',
          text: 'Agregá tu primera actividad: puede ser un entrenamiento, un partido, una caminata o un día de descanso.',
          actions: html`<button type="button" class="btn btn--primary" data-action="add-activity">${icon('plus')} Agregar actividad</button>`,
        })}
      </section>`;
  }

  return html`
    <section class="card">
      ${header}
      <div class="stats">
        <p class="stat"><span class="stat__value">${summary.planned}</span><span class="stat__label">Planificadas</span></p>
        <p class="stat"><span class="stat__value">${summary.completed}</span><span class="stat__label">Completadas</span></p>
        <p class="stat"><span class="stat__value">${summary.minutesCompleted}</span><span class="stat__label">Min. hechos</span></p>
      </div>
      <ol class="week-strip" aria-label="Actividades por día">
        ${summary.days.map((day) => renderStripDay(day, todayIso))}
      </ol>
    </section>`;
}

function renderStripDay(day, todayIso) {
  let state = 'empty';
  let marker = '';
  let description = 'sin actividades';
  if (day.isRest) {
    state = 'rest';
    marker = icon('cat-rest', 'icon--sm');
    description = 'día de descanso';
  } else if (day.total) {
    state = day.completed === day.total ? 'done' : 'planned';
    marker = day.completed === day.total ? icon('check', 'icon--sm') : String(day.total);
    description = `${day.total} ${day.total === 1 ? 'actividad' : 'actividades'}, ${day.completed} completada${day.completed === 1 ? '' : 's'}`;
  }
  // El texto oculto describe el día para lectores de pantalla: el estado no depende solo del color
  return html`
    <li class="week-strip__day" data-state="${state}" data-today="${day.date === todayIso}">
      <span class="week-strip__name" aria-hidden="true">${formatWeekday(day.date)}</span>
      <span class="week-strip__num" aria-hidden="true">${formatDayNumber(day.date)}</span>
      <span class="week-strip__marker" aria-hidden="true">${marker}</span>
      <span class="visually-hidden">${formatWeekday(day.date, 'long')} ${formatDayNumber(day.date)}: ${description}</span>
    </li>`;
}

function renderNextCard(next) {
  const header = html`<div class="card__header"><h2 class="card__title">${icon('target')} Próxima actividad</h2></div>`;

  if (!next) {
    return html`
      <section class="card">
        ${header}
        <p class="card__text">No tenés actividades pendientes por delante. Cuando agendes una, la vas a ver acá.</p>
      </section>`;
  }

  const category = getCategory(next.category);
  return html`
    <section class="card">
      ${header}
      <div class="activity-card">
        <img class="activity-card__img" src="${category.image}" alt="${category.alt}" loading="lazy" decoding="async">
        <div>
          <h3 class="activity-card__name">${next.name}</h3>
          <p class="meta">
            <span class="meta__item">${icon('calendar', 'icon--sm')}${formatRelativeDay(next.date)}</span>
            ${next.time ? html`<span class="meta__item">${icon('clock', 'icon--sm')}${next.time}</span>` : ''}
            ${next.durationMin ? html`<span>${next.durationMin} min</span>` : ''}
          </p>
          <p class="meta"><span>${category.label}</span></p>
        </div>
      </div>
    </section>`;
}

function renderMealsCard(state) {
  // El planificador de comidas llega en la Etapa 4; por ahora el estado siempre está vacío.
  const plannedMeals = Object.values(state.mealPlan).reduce((n, day) => n + Object.keys(day).length, 0);
  return html`
    <a class="feature-card" href="#/nutricion">
      <img class="feature-card__img" src="assets/images/sections/meals-preview.webp" alt="" loading="lazy" decoding="async">
      <span class="feature-card__body">
        <span class="feature-card__title"><strong>Comidas de la semana</strong> <span class="badge badge--soon">Próximamente</span></span>
        <span class="feature-card__text">${plannedMeals
          ? `${plannedMeals} comidas planificadas.`
          : 'Planificá desayunos, almuerzos, meriendas y cenas en un solo lugar.'}</span>
      </span>
    </a>`;
}
