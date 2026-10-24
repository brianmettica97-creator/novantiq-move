// Vista "Mi semana": calendario semanal, detalle de actividades y formularios
// para crear, editar, mover, completar y eliminar.

import { html, icon } from '../utils/dom.js';
import {
  sectionBanner, openDialog, closeDialog, confirmDialog, toast, showFieldErrors, requestRender, weekNavigator, stepWeek,
} from '../ui.js';
import { getState } from '../state.js';
import { today, startOfWeek, weekDays, formatWeekday, formatDayNumber, formatLongDate } from '../utils/dates.js';
import {
  createActivity, updateActivity, deleteActivity, moveActivity, toggleCompleted, toggleTask,
  getActivity, getActivitiesForDate, isRest, INTENSITIES, LIMITS, STATUS_LABELS,
} from '../activities.js';
import { getApplicationsForWeek, removeTemplateApplication, countApplicationActivities, getTemplate } from '../templates.js';
import { CATEGORIES, getCategory } from '../../data/categories.js';

export const title = 'Mi semana';

// Semana que se está mirando. Es estado de interfaz (no se guarda): null = semana actual.
let shownWeekStart = null;

function currentWeekStart(state) {
  return startOfWeek(today(), state.profile.weekStart);
}

function getShownWeekStart(state) {
  return shownWeekStart ?? currentWeekStart(state);
}

/** Permite que otras vistas abran "Mi semana" en una semana concreta (por ejemplo, al aplicar una plantilla). */
export function showWeek(weekStartIso) {
  shownWeekStart = weekStartIso;
}

// ---------- Vista ----------

export function render(state) {
  const todayIso = today();
  const weekStart = getShownWeekStart(state);
  const days = weekDays(weekStart);
  const isCurrentWeek = weekStart === currentWeekStart(state);
  const applications = getApplicationsForWeek(state, weekStart);

  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Mi semana',
        title: 'Tu semana, día por día',
        text: 'Planificá entrenamientos, deportes, caminatas y también tus días de descanso.',
        image: 'assets/images/sections/week.webp',
        alt: 'Agenda abierta junto a una taza de café',
      })}

      ${weekNavigator({
        idPrefix: 'week',
        action: 'week-step',
        weekStart,
        currentWeekStart: currentWeekStart(state),
        extra: html`<button type="button" class="btn btn--primary" data-action="add-activity" data-date="${isCurrentWeek ? todayIso : days[0]}">${icon('plus')} Agregar actividad</button>`,
      })}

      ${applications.length ? html`
        <section class="applied" aria-label="Plantillas aplicadas en esta semana">
          ${applications.map(({ application, template }) => html`
            <p class="applied__item">
              ${icon('layers', 'icon--sm')}
              <span>Plantilla: <strong>${template.name}</strong></span>
              <button type="button" class="btn btn--ghost btn--sm" id="remove-${application.id}"
                data-action="remove-application" data-id="${application.id}">Quitar</button>
            </p>`)}
        </section>` : ''}

      <ol class="day-list">
        ${days.map((date) => renderDay(state, date, date === todayIso))}
      </ol>
    </div>
  `;
}

function renderDay(state, date, isToday) {
  const activities = getActivitiesForDate(state, date);
  const isRestDay = activities.length > 0 && activities.every(isRest);
  const dayLabel = `${formatWeekday(date, 'long')} ${formatDayNumber(date)}`;

  return html`
    <li class="day" data-today="${isToday}" data-has-activities="${activities.length > 0}">
      <div class="day__header">
        <h3 class="day__title">
          ${dayLabel}
          ${isToday ? html`<span class="badge badge--accent">Hoy</span>` : ''}
          ${isRestDay ? html`<span class="badge">${icon('cat-rest', 'icon--sm')} Descanso</span>` : ''}
        </h3>
        <button type="button" class="btn btn--ghost btn--icon" id="add-${date}" data-action="add-activity" data-date="${date}"
          aria-label="Agregar actividad el ${dayLabel}">${icon('plus')}</button>
      </div>
      ${activities.length
        ? html`<ul class="day__items">${activities.map(renderActivityRow)}</ul>`
        : html`<p class="day__empty">Sin actividades.</p>`}
    </li>
  `;
}

export function renderStatusBadge(activity) {
  if (isRest(activity)) return '';
  const statusIcon = { completed: 'check', rescheduled: 'repeat', pending: 'clock' }[activity.status];
  return html`<span class="badge badge--${activity.status}">${icon(statusIcon, 'icon--sm')} ${STATUS_LABELS[activity.status]}</span>`;
}

export function renderActivityRow(activity) {
  const category = getCategory(activity.category);
  const done = activity.status === 'completed';
  return html`
    <li class="activity-row" data-status="${activity.status}">
      ${isRest(activity)
        ? html`<span class="activity-row__icon">${icon(category.icon)}</span>`
        : html`<button type="button" class="check-btn" id="check-${activity.id}" data-action="toggle-complete" data-id="${activity.id}"
            aria-pressed="${done ? 'true' : 'false'}" aria-label="${done ? 'Desmarcar' : 'Marcar como completada'}: ${activity.name}">
            ${icon(done ? 'check' : category.icon)}
          </button>`}
      <div class="activity-row__body">
        <button type="button" class="activity-row__name" id="open-${activity.id}" data-action="open-activity" data-id="${activity.id}">
          ${activity.name}
        </button>
        <p class="meta">
          <span>${category.short}</span>
          ${activity.time ? html`<span class="meta__item">${icon('clock', 'icon--sm')}${activity.time}</span>` : ''}
          ${activity.durationMin ? html`<span>${activity.durationMin} min</span>` : ''}
          ${activity.templateId ? html`<span class="meta__item">${icon('layers', 'icon--sm')}Plantilla</span>` : ''}
        </p>
      </div>
      ${renderStatusBadge(activity)}
    </li>
  `;
}

export const actions = {
  'week-step': (button) => {
    const step = Number(button.dataset.step);
    shownWeekStart = stepWeek(getShownWeekStart(getState()), step);
    requestRender();
    if (step === 0) document.getElementById('week-next')?.focus(); // "Volver a hoy" desaparece
  },
  'remove-application': async (button) => {
    const state = getState();
    const application = state.templateApplications.find((a) => a.id === button.dataset.id);
    if (!application) return;
    const template = getTemplate(application.templateId);
    const { pending, completed } = countApplicationActivities(state, application.id);
    const ok = await confirmDialog({
      title: 'Quitar plantilla',
      message: `Se eliminarán ${pending} ${pending === 1 ? 'actividad no completada' : 'actividades no completadas'} de "${template?.name ?? 'la plantilla'}" en esta semana, incluidas las que hayas editado o movido.`
        + (completed === 1 ? ' La completada se conserva en tu historial.'
          : completed ? ` Las ${completed} completadas se conservan en tu historial.` : ''),
      confirmLabel: 'Quitar plantilla',
      danger: true,
    });
    if (!ok) return;
    removeTemplateApplication(application.id);
    toast('Plantilla quitada de la semana.');
  },
};

// ---------- Acciones compartidas (también se usan desde el inicio) ----------

export function toggleFromList(id) {
  const activity = toggleCompleted(id);
  if (activity) toast(activity.status === 'completed' ? `¡Bien! "${activity.name}" completada.` : `"${activity.name}" volvió a ${STATUS_LABELS[activity.status].toLowerCase()}.`);
}

// ---------- Detalle de una actividad ----------

export function openActivityDetail(id) {
  const activity = getActivity(id);
  if (!activity) {
    closeDialog();
    return;
  }
  const category = getCategory(activity.category);
  const intensity = INTENSITIES.find((i) => i.id === activity.intensity);
  const template = activity.templateId ? getTemplate(activity.templateId) : null;
  const rest = isRest(activity);
  const doneTasks = activity.tasks.filter((t) => t.done).length;

  openDialog({
    title: activity.name,
    content: html`
      <div class="detail">
        <img class="detail__img" src="${category.image}" alt="${category.alt}" width="800" height="520">
        <div class="detail__head">
          ${renderStatusBadge(activity)}
          <span class="badge">${icon(category.icon, 'icon--sm')} ${category.label}</span>
        </div>

        <dl class="detail__facts">
          <div><dt>Fecha</dt><dd>${formatLongDate(activity.date)}</dd></div>
          <div><dt>Hora</dt><dd>${activity.time || 'Sin hora'}</dd></div>
          ${activity.durationMin ? html`<div><dt>Duración</dt><dd>${activity.durationMin} min</dd></div>` : ''}
          ${intensity ? html`<div><dt>Intensidad</dt><dd>${intensity.label}</dd></div>` : ''}
        </dl>

        ${activity.originalDate ? html`<p class="detail__note">${icon('repeat', 'icon--sm')} Reprogramada desde el ${formatLongDate(activity.originalDate)}.</p>` : ''}
        ${template ? html`<p class="detail__note">${icon('layers', 'icon--sm')} De la plantilla "${template.name}". Los cambios solo afectan a tu copia.</p>` : ''}

        ${activity.description ? html`<section><h3 class="detail__subtitle">Descripción</h3><p class="detail__text">${activity.description}</p></section>` : ''}

        ${activity.tasks.length ? html`
          <section>
            <h3 class="detail__subtitle">Ejercicios y tareas <span class="detail__count">${doneTasks}/${activity.tasks.length}</span></h3>
            <ul class="task-list">
              ${activity.tasks.map((task) => html`
                <li>
                  <label class="task">
                    <input type="checkbox" data-task="${task.id}" ${task.done ? 'checked' : ''}>
                    <span>${task.text}</span>
                  </label>
                </li>`)}
            </ul>
          </section>` : ''}

        ${activity.notes ? html`<section><h3 class="detail__subtitle">Notas personales</h3><p class="detail__text">${activity.notes}</p></section>` : ''}

        <div class="detail__actions">
          ${rest ? '' : html`
            <button type="button" class="btn ${activity.status === 'completed' ? 'btn--secondary' : 'btn--primary'} btn--block" data-detail="complete">
              ${icon('check')} ${activity.status === 'completed' ? 'Desmarcar como completada' : 'Marcar como completada'}
            </button>`}
          <div class="detail__secondary">
            <button type="button" class="btn btn--secondary" data-detail="edit">Editar</button>
            <button type="button" class="btn btn--secondary" data-detail="move">${icon('calendar', 'icon--sm')} Mover</button>
            <button type="button" class="btn btn--ghost btn--danger-text" data-detail="delete">Eliminar</button>
          </div>
        </div>
      </div>
    `,
    onOpen(dialogEl) {
      dialogEl.querySelector('.detail').addEventListener('change', (event) => {
        const taskId = event.target.dataset.task;
        if (!taskId) return;
        toggleTask(id, taskId);
        openActivityDetail(id);
        dialogEl.querySelector(`[data-task="${taskId}"]`)?.focus();
      });
      dialogEl.querySelector('.detail__actions').addEventListener('click', async (event) => {
        const action = event.target.closest('[data-detail]')?.dataset.detail;
        if (action === 'complete') {
          toggleFromList(id);
          openActivityDetail(id);
          dialogEl.querySelector('[data-detail="complete"]')?.focus();
        } else if (action === 'edit') {
          openActivityForm({ activity: getActivity(id) });
        } else if (action === 'move') {
          openMoveForm(id);
        } else if (action === 'delete') {
          const ok = await confirmDialog({
            title: 'Eliminar actividad',
            message: `¿Seguro que querés eliminar "${activity.name}"? Esta acción no se puede deshacer.`,
            confirmLabel: 'Eliminar',
            danger: true,
          });
          if (ok) {
            deleteActivity(id);
            toast('Actividad eliminada.');
          } else {
            openActivityDetail(id); // al cancelar, vuelve al detalle
          }
        }
      });
    },
  });
}

// ---------- Mover de día ----------

function openMoveForm(id) {
  const activity = getActivity(id);
  openDialog({
    title: 'Mover actividad',
    content: html`
      <form class="form" novalidate>
        <p class="dialog__message">Elegí el nuevo día para "${activity.name}".</p>
        <div class="form-row">
          <div class="field">
            <label class="field__label" for="m-date">Nueva fecha</label>
            <input class="field__input" id="m-date" name="date" type="date" value="${activity.date}" required aria-describedby="error-date">
            <p class="field__error" id="error-date"></p>
          </div>
          <div class="field">
            <label class="field__label" for="m-time">Hora <span class="field__optional">(opcional)</span></label>
            <input class="field__input" id="m-time" name="time" type="time" value="${activity.time}" aria-describedby="error-time">
            <p class="field__error" id="error-time"></p>
          </div>
        </div>
        <div class="dialog__footer">
          <button type="button" class="btn btn--ghost" data-back>Volver</button>
          <button type="submit" class="btn btn--primary">${icon('check')} Mover</button>
        </div>
      </form>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('form');
      form.querySelector('[data-back]').addEventListener('click', () => openActivityDetail(id));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const { date, time } = Object.fromEntries(new FormData(form));
        if (date === activity.date && time === activity.time) {
          showFieldErrors(form, { date: 'Elegí una fecha u hora distinta.' });
          return;
        }
        const result = moveActivity(id, date, time);
        if (!result.ok) {
          showFieldErrors(form, result.errors);
          return;
        }
        closeDialog();
        toast(`"${activity.name}" se movió al ${formatLongDate(date)}.`);
      });
    },
  });
}

// ---------- Formulario de alta y edición ----------

/**
 * Abre el formulario.
 *   openActivityForm({ date })      → nueva actividad (fecha precargada; por defecto, hoy)
 *   openActivityForm({ activity })  → editar una actividad existente
 */
export function openActivityForm({ date = today(), activity = null } = {}) {
  const editing = Boolean(activity);
  const values = activity ?? { name: '', category: '', date, time: '', durationMin: '', intensity: '', description: '', notes: '', tasks: [] };
  const selected = (current, value) => (current === value ? 'selected' : '');
  // Las actividades favoritas del perfil aparecen primero
  const favoriteIds = getState().profile.favoriteActivities;
  const favorites = CATEGORIES.filter((c) => favoriteIds.includes(c.id));
  const others = CATEGORIES.filter((c) => !favoriteIds.includes(c.id));
  const categoryOption = (c) => html`<option value="${c.id}" ${selected(values.category, c.id)}>${c.label}</option>`;

  openDialog({
    title: editing ? 'Editar actividad' : 'Nueva actividad',
    content: html`
      <form class="form" novalidate>
        <div class="field">
          <label class="field__label" for="f-name">Nombre</label>
          <input class="field__input" id="f-name" name="name" type="text" maxlength="${LIMITS.name}" value="${values.name}"
            required autocomplete="off" placeholder="Ej.: Fútbol con amigos" aria-describedby="error-name">
          <p class="field__error" id="error-name"></p>
        </div>

        <div class="field">
          <label class="field__label" for="f-category">Categoría</label>
          <select class="field__input" id="f-category" name="category" required aria-describedby="error-category">
            <option value="">Elegí una categoría</option>
            ${favorites.length ? html`
              <optgroup label="Tus favoritas">${favorites.map(categoryOption)}</optgroup>
              <optgroup label="Otras">${others.map(categoryOption)}</optgroup>`
              : CATEGORIES.map(categoryOption)}
          </select>
          <p class="field__error" id="error-category"></p>
        </div>

        <div class="form-row">
          <div class="field">
            <label class="field__label" for="f-date">Fecha</label>
            <input class="field__input" id="f-date" name="date" type="date" value="${values.date}" required aria-describedby="error-date">
            <p class="field__error" id="error-date"></p>
          </div>
          <div class="field">
            <label class="field__label" for="f-time">Hora <span class="field__optional">(opcional)</span></label>
            <input class="field__input" id="f-time" name="time" type="time" value="${values.time}" aria-describedby="error-time">
            <p class="field__error" id="error-time"></p>
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label class="field__label" for="f-duration">Duración en min <span class="field__optional">(opcional)</span></label>
            <input class="field__input" id="f-duration" name="durationMin" type="number" inputmode="numeric" value="${values.durationMin ?? ''}"
              min="1" max="${LIMITS.maxDuration}" step="1" aria-describedby="error-durationMin">
            <p class="field__error" id="error-durationMin"></p>
          </div>
          <div class="field">
            <label class="field__label" for="f-intensity">Intensidad <span class="field__optional">(opcional)</span></label>
            <select class="field__input" id="f-intensity" name="intensity" aria-describedby="error-intensity">
              <option value="">Sin indicar</option>
              ${INTENSITIES.map((i) => html`<option value="${i.id}" ${selected(values.intensity, i.id)}>${i.label}</option>`)}
            </select>
            <p class="field__error" id="error-intensity"></p>
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="f-description">Descripción <span class="field__optional">(opcional)</span></label>
          <textarea class="field__input" id="f-description" name="description" maxlength="${LIMITS.description}"
            aria-describedby="error-description">${values.description}</textarea>
          <p class="field__error" id="error-description"></p>
        </div>

        <div class="field">
          <label class="field__label" for="f-tasks">Ejercicios o tareas <span class="field__optional">(opcional)</span></label>
          <textarea class="field__input" id="f-tasks" name="tasksText" aria-describedby="f-tasks-hint error-tasksText"
            placeholder="Entrada en calor&#10;Sentadillas&#10;Estiramientos">${values.tasks.map((t) => t.text).join('\n')}</textarea>
          <p class="field__hint" id="f-tasks-hint">Escribí uno por línea. Después podés ir tildándolos.</p>
          <p class="field__error" id="error-tasksText"></p>
        </div>

        <div class="field">
          <label class="field__label" for="f-notes">Notas personales <span class="field__optional">(opcional)</span></label>
          <textarea class="field__input" id="f-notes" name="notes" maxlength="${LIMITS.notes}"
            aria-describedby="error-notes">${values.notes}</textarea>
          <p class="field__error" id="error-notes"></p>
        </div>

        <div class="dialog__footer">
          <button type="button" class="btn btn--ghost" data-cancel>Cancelar</button>
          <button type="submit" class="btn btn--primary">${icon('check')} Guardar</button>
        </div>
      </form>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('form');
      // Al editar, "Cancelar" vuelve al detalle; al crear, cierra.
      form.querySelector('[data-cancel]').addEventListener('click', () => (editing ? openActivityDetail(activity.id) : closeDialog()));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = Object.fromEntries(new FormData(form));
        const result = editing ? updateActivity(activity.id, input) : createActivity(input);
        if (!result.ok) {
          showFieldErrors(form, result.errors);
          return;
        }
        if (editing) {
          openActivityDetail(activity.id);
          toast('Cambios guardados.');
        } else {
          closeDialog();
          toast(`"${result.activity.name}" quedó agendada.`);
        }
      });
    },
  });
}
