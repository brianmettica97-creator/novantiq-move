// Vista "Mi semana" y formulario de nueva actividad.
// Etapa 2: muestra los 7 días de la semana actual y permite agregar actividades.
// Etapa 3: navegación entre semanas, edición, eliminación, mover y completar.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, openDialog, closeDialog, toast, showFieldErrors } from '../ui.js';
import { today, startOfWeek, weekDays, formatRange, formatWeekday, formatDayNumber } from '../utils/dates.js';
import { createActivity, getActivitiesForDate, INTENSITIES, LIMITS, STATUS_LABELS } from '../activities.js';
import { CATEGORIES, getCategory } from '../../data/categories.js';

export const title = 'Mi semana';

export function render(state) {
  const todayIso = today();
  const days = weekDays(startOfWeek(todayIso, state.profile.weekStart));

  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Mi semana',
        title: 'Tu semana, día por día',
        text: 'Planificá entrenamientos, deportes, caminatas y también tus días de descanso.',
        image: 'assets/images/sections/week.webp',
        alt: 'Agenda abierta junto a una taza de café',
      })}

      <div class="week-heading">
        <h2 class="week-heading__range">Semana actual · ${formatRange(days[0], days[6])}</h2>
        <button type="button" class="btn btn--primary" data-action="add-activity">${icon('plus')} Agregar actividad</button>
      </div>

      <ol class="day-list">
        ${days.map((date) => renderDay(state, date, date === todayIso))}
      </ol>
    </div>
  `;
}

function renderDay(state, date, isToday) {
  const activities = getActivitiesForDate(state, date);
  const isRestDay = activities.length > 0 && activities.every((a) => a.category === 'rest');
  const dayLabel = `${formatWeekday(date, 'long')} ${formatDayNumber(date)}`;

  return html`
    <li class="day" data-today="${isToday}">
      <div class="day__header">
        <h3 class="day__title">
          ${dayLabel}
          ${isToday ? html`<span class="badge badge--accent">Hoy</span>` : ''}
          ${isRestDay ? html`<span class="badge">${icon('cat-rest', 'icon--sm')} Descanso</span>` : ''}
        </h3>
        <button type="button" class="btn btn--ghost btn--icon" data-action="add-activity" data-date="${date}"
          aria-label="Agregar actividad el ${dayLabel}">${icon('plus')}</button>
      </div>
      ${activities.length
        ? html`<ul class="day__items">${activities.map(renderActivityRow)}</ul>`
        : html`<p class="day__empty">Sin actividades.</p>`}
    </li>
  `;
}

export function renderActivityRow(activity) {
  const category = getCategory(activity.category);
  return html`
    <li class="activity-row" data-status="${activity.status}">
      <span class="activity-row__icon">${icon(category.icon)}</span>
      <div class="activity-row__body">
        <p class="activity-row__name">${activity.name}</p>
        <p class="meta">
          <span>${category.short}</span>
          ${activity.time ? html`<span class="meta__item">${icon('clock', 'icon--sm')}${activity.time}</span>` : ''}
          ${activity.durationMin ? html`<span>${activity.durationMin} min</span>` : ''}
        </p>
      </div>
      ${category.isRest ? '' /* el descanso no queda "pendiente": es parte del plan */
        : html`<span class="badge badge--${activity.status}">${STATUS_LABELS[activity.status]}</span>`}
    </li>
  `;
}

// ---------- Formulario de nueva actividad ----------

/** Abre el formulario. `date` precarga el día elegido (por defecto, hoy). */
export function openActivityForm(date = today()) {
  openDialog({
    title: 'Nueva actividad',
    content: html`
      <form class="form" novalidate>
        <div class="field">
          <label class="field__label" for="f-name">Nombre</label>
          <input class="field__input" id="f-name" name="name" type="text" maxlength="${LIMITS.name}"
            required autocomplete="off" placeholder="Ej.: Fútbol con amigos" aria-describedby="error-name">
          <p class="field__error" id="error-name"></p>
        </div>

        <div class="field">
          <label class="field__label" for="f-category">Categoría</label>
          <select class="field__input" id="f-category" name="category" required aria-describedby="error-category">
            <option value="">Elegí una categoría</option>
            ${CATEGORIES.map((c) => html`<option value="${c.id}">${c.label}</option>`)}
          </select>
          <p class="field__error" id="error-category"></p>
        </div>

        <div class="form-row">
          <div class="field">
            <label class="field__label" for="f-date">Fecha</label>
            <input class="field__input" id="f-date" name="date" type="date" value="${date}" required aria-describedby="error-date">
            <p class="field__error" id="error-date"></p>
          </div>
          <div class="field">
            <label class="field__label" for="f-time">Hora <span class="field__optional">(opcional)</span></label>
            <input class="field__input" id="f-time" name="time" type="time" aria-describedby="error-time">
            <p class="field__error" id="error-time"></p>
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label class="field__label" for="f-duration">Duración en min <span class="field__optional">(opcional)</span></label>
            <input class="field__input" id="f-duration" name="durationMin" type="number" inputmode="numeric"
              min="1" max="${LIMITS.maxDuration}" step="1" aria-describedby="error-durationMin">
            <p class="field__error" id="error-durationMin"></p>
          </div>
          <div class="field">
            <label class="field__label" for="f-intensity">Intensidad <span class="field__optional">(opcional)</span></label>
            <select class="field__input" id="f-intensity" name="intensity" aria-describedby="error-intensity">
              <option value="">Sin indicar</option>
              ${INTENSITIES.map((i) => html`<option value="${i.id}">${i.label}</option>`)}
            </select>
            <p class="field__error" id="error-intensity"></p>
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="f-description">Descripción <span class="field__optional">(opcional)</span></label>
          <textarea class="field__input" id="f-description" name="description" maxlength="${LIMITS.description}"
            aria-describedby="error-description"></textarea>
          <p class="field__error" id="error-description"></p>
        </div>

        <div class="dialog__footer">
          <button type="button" class="btn btn--ghost" data-dialog-close>Cancelar</button>
          <button type="submit" class="btn btn--primary">${icon('check')} Guardar</button>
        </div>
      </form>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(form));
        const result = createActivity(input);
        if (!result.ok) {
          showFieldErrors(form, result.errors);
          return;
        }
        closeDialog();
        toast(`"${result.activity.name}" quedó agendada.`);
      });
    },
  });
}
