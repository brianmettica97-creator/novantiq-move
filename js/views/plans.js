// Vista "Planes y plantillas": biblioteca con filtros, detalle y aplicación a una semana.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, emptyState, openDialog, closeDialog, confirmDialog, toast, requestRender } from '../ui.js';
import { getState } from '../state.js';
import { today, startOfWeek, addDays, formatRange, formatWeekday } from '../utils/dates.js';
import { filterTemplates, describeTemplate, getTemplate, previewApplication, applyTemplate, DURATION_FILTERS } from '../templates.js';
import { TEMPLATES, LEVELS, GOALS, EQUIPMENT } from '../../data/activity-templates.js';
import { CATEGORIES, getCategory } from '../../data/categories.js';
import { isRest } from '../activities.js';
import { showWeek } from './week.js';

export const title = 'Planes y plantillas';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const labelOf = (list, id) => list.find((item) => item.id === id)?.label ?? '';

// Filtros elegidos: estado de interfaz, no se guarda.
const EMPTY_FILTERS = { activity: '', level: '', duration: '', goal: '', equipment: '' };
let filters = { ...EMPTY_FILTERS };

// Solo se ofrecen las actividades que aparecen en alguna plantilla
const activityOptions = CATEGORIES.filter((c) => TEMPLATES.some((t) => describeTemplate(t).categories.includes(c.id)));

function filterSelect(name, label, options) {
  return html`
    <div class="field">
      <label class="field__label" for="filter-${name}">${label}</label>
      <select class="field__input" id="filter-${name}" data-change="filter" name="${name}">
        <option value="">Todas</option>
        ${options.map((o) => html`<option value="${o.id}" ${filters[name] === o.id ? 'selected' : ''}>${o.label}</option>`)}
      </select>
    </div>`;
}

export function render(state) {
  const results = filterTemplates(filters);
  const hasFilters = Object.values(filters).some(Boolean);
  const thisWeek = startOfWeek(today(), state.profile.weekStart);

  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Planes y plantillas',
        title: 'Semanas listas para empezar',
        text: 'Elegí una plantilla, sumala a tu semana y adaptala a tu ritmo.',
        image: 'assets/images/sections/plans.webp',
        alt: 'Persona levantando una barra en el gimnasio',
      })}

      <section class="card" aria-labelledby="filters-title">
        <div class="card__header">
          <h2 class="card__title" id="filters-title">${icon('filter')} Filtrar</h2>
          ${hasFilters ? html`<button type="button" class="btn btn--ghost btn--sm" id="clear-filters" data-action="clear-filters">Limpiar filtros</button>` : ''}
        </div>
        <div class="filters">
          ${filterSelect('activity', 'Actividad', activityOptions.map((c) => ({ id: c.id, label: c.label })))}
          ${filterSelect('level', 'Nivel', LEVELS)}
          ${filterSelect('duration', 'Duración', DURATION_FILTERS)}
          ${filterSelect('goal', 'Objetivo', GOALS)}
          ${filterSelect('equipment', 'Equipamiento', EQUIPMENT)}
        </div>
      </section>

      <p class="results-count" role="status">${results.length} ${results.length === 1 ? 'plantilla' : 'plantillas'}</p>

      ${results.length
        ? html`<ul class="template-grid">${results.map((t) => renderTemplateCard(t, state, thisWeek))}</ul>`
        : html`<section class="card">${emptyState({
          iconName: 'filter',
          title: 'Ninguna plantilla coincide',
          text: 'Probá quitar alguno de los filtros para ver más opciones.',
          actions: html`<button type="button" class="btn btn--secondary" data-action="clear-filters">Limpiar filtros</button>`,
        })}</section>`}

      <p class="notice">${icon('info')}<span>Las plantillas son ejemplos generales de organización: no son prescripciones médicas ni programas personalizados. Si tenés dudas sobre tu salud, consultá con un profesional.</span></p>
    </div>
  `;
}

function renderTemplateCard(template, state, thisWeek) {
  const info = describeTemplate(template);
  const appliedThisWeek = state.templateApplications.some((a) => a.templateId === template.id && a.weekStart === thisWeek);
  return html`
    <li class="template-card">
      <img class="template-card__img" src="${template.image}" alt="${template.alt}" width="900" height="560" loading="lazy" decoding="async">
      <div class="template-card__body">
        <div class="template-card__badges">
          <span class="badge">${labelOf(LEVELS, template.level)}</span>
          ${appliedThisWeek ? html`<span class="badge badge--accent">${icon('check', 'icon--sm')} En tu semana</span>` : ''}
        </div>
        <h3 class="template-card__title">${template.name}</h3>
        <p class="template-card__text">${template.description}</p>
        <p class="meta">
          <span class="meta__item">${icon('calendar', 'icon--sm')}${info.trainingDays} días activos</span>
          <span class="meta__item">${icon('clock', 'icon--sm')}~${info.avgMinutes} min por sesión</span>
        </p>
        <p class="template-card__icons" aria-label="Actividades: ${info.categories.map((c) => getCategory(c).short).join(', ')}">
          ${info.categories.map((c) => html`<span class="mini-icon" title="${getCategory(c).label}">${icon(getCategory(c).icon, 'icon--sm')}</span>`)}
        </p>
        <button type="button" class="btn btn--secondary btn--block" id="tpl-${template.id}" data-action="open-template" data-id="${template.id}" aria-label="Ver plantilla: ${template.name}">
          Ver plantilla ${icon('arrow-right', 'icon--sm')}
        </button>
      </div>
    </li>`;
}

export const changes = {
  filter(select) {
    filters = { ...filters, [select.name]: select.value };
    requestRender();
  },
};

export const actions = {
  'clear-filters': () => {
    filters = { ...EMPTY_FILTERS };
    requestRender();
    document.getElementById('filter-activity')?.focus();
  },
  'open-template': (button) => openTemplateDetail(button.dataset.id),
};

// ---------- Detalle y aplicación ----------

function weekOptions(state) {
  const first = startOfWeek(today(), state.profile.weekStart);
  const names = ['Esta semana', 'Próxima semana', 'En 2 semanas', 'En 3 semanas'];
  return names.map((name, i) => {
    const start = addDays(first, i * 7);
    return { value: start, label: `${name} (${formatRange(start, addDays(start, 6))})` };
  });
}

function openTemplateDetail(templateId) {
  const template = getTemplate(templateId);
  const info = describeTemplate(template);
  const state = getState();

  openDialog({
    title: template.name,
    content: html`
      <div class="detail">
        <img class="detail__img" src="${template.image}" alt="${template.alt}" width="900" height="560">
        <p class="detail__text">${template.description}</p>

        <dl class="detail__facts">
          <div><dt>Nivel orientativo</dt><dd>${labelOf(LEVELS, template.level)}</dd></div>
          <div><dt>Objetivo</dt><dd>${labelOf(GOALS, template.goal)}</dd></div>
          <div><dt>Equipamiento</dt><dd>${labelOf(EQUIPMENT, template.equipment)}</dd></div>
          <div><dt>Tiempo semanal</dt><dd>~${info.totalMinutes} min en ${info.trainingDays} días</dd></div>
        </dl>

        <section>
          <h3 class="detail__subtitle">Actividades sugeridas</h3>
          <ol class="session-list">
            ${template.sessions.map((s) => html`
              <li class="session" data-rest="${isRest(s)}">
                <span class="session__day">${DAY_NAMES[s.day]}</span>
                <span class="session__icon">${icon(getCategory(s.category).icon, 'icon--sm')}</span>
                <span class="session__name">${s.name}</span>
                <span class="session__min">${s.durationMin ? `${s.durationMin} min` : ''}</span>
              </li>`)}
          </ol>
        </section>

        <form class="form apply-form" novalidate>
          <div class="field">
            <label class="field__label" for="apply-week">Agregar a la semana</label>
            <select class="field__input" id="apply-week" name="week">
              ${weekOptions(state).map((o) => html`<option value="${o.value}">${o.label}</option>`)}
            </select>
            <p class="field__hint">Después vas a poder editar, mover o quitar cada sesión sin modificar la plantilla.</p>
          </div>
          <button type="submit" class="btn btn--primary btn--block">${icon('plus')} Agregar a mi semana</button>
        </form>
      </div>
    `,
    onOpen(dialogEl) {
      const form = dialogEl.querySelector('.apply-form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const weekStart = form.elements.week.value;
        const applied = await confirmAndApply(templateId, weekStart);
        if (applied) {
          showWeek(weekStart);
          location.hash = '#/semana';
        }
      });
    },
  });
}

/** Revisa duplicados y conflictos, pide confirmación si hace falta y aplica. */
async function confirmAndApply(templateId, weekStart) {
  const { template, existing, conflictDays } = previewApplication(getState(), templateId, weekStart);
  const range = formatRange(weekStart, addDays(weekStart, 6));

  if (existing) {
    const ok = await confirmDialog({
      title: 'Esta plantilla ya está en esa semana',
      message: `"${template.name}" ya está aplicada en la semana del ${range}. Si la volvés a aplicar, se reemplazan sus sesiones pendientes (también las que editaste). Las completadas se conservan y no se duplican.`,
      confirmLabel: 'Reemplazar sesiones',
    });
    if (!ok) return reopen(templateId);
  } else if (conflictDays.length) {
    const days = conflictDays.map((d) => formatWeekday(d, 'long')).join(', ');
    const ok = await confirmDialog({
      title: 'Ya tenés actividades esos días',
      message: `En la semana del ${range} ya hay actividades el ${days}. Las sesiones de la plantilla se van a sumar a las que ya tenés; no se borra nada.`,
      confirmLabel: 'Agregar igual',
    });
    if (!ok) return reopen(templateId);
  }

  const result = applyTemplate(templateId, weekStart);
  closeDialog();
  if (result.ok) toast(`Se agregaron ${result.created} actividades a la semana del ${range}.`);
  return result.ok;
}

function reopen(templateId) {
  openTemplateDetail(templateId);
  return false;
}
