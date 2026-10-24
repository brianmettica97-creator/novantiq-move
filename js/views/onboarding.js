// Bienvenida de primer uso (3 pasos) y acciones de datos de ejemplo compartidas por varias vistas.

import { html, icon } from '../utils/dom.js';
import { openDialog, closeDialog, confirmDialog, toast } from '../ui.js';
import { getState, setState } from '../state.js';
import { loadSampleData, clearSampleData, hasOwnData } from '../sample-data.js';
import { CATEGORIES } from '../../data/categories.js';

const NAME_MAX = 40;
const TOTAL_STEPS = 3;

function markOnboarded() {
  if (!getState().profile.onboarded) setState((s) => ({ ...s, profile: { ...s.profile, onboarded: true } }));
}

/** Muestra la bienvenida solo la primera vez y con la app vacía. */
export function maybeShowOnboarding() {
  const state = getState();
  if (state.profile.onboarded || hasOwnData(state) || state.sampleData) return;
  showStep(1);
  // Cerrarla de cualquier forma (Escape, X, "Omitir") cuenta como vista: no vuelve a aparecer
  document.getElementById('app-dialog').addEventListener('close', markOnboarded, { once: true });
}

function stepHeader(step) {
  return html`<p class="onboarding__step">Paso ${step} de ${TOTAL_STEPS}</p>`;
}

function showStep(step) {
  const state = getState();
  if (step === 1) {
    openDialog({
      title: 'Te damos la bienvenida a NOVANTIQ Move',
      content: html`
        <div class="onboarding">
          <img class="detail__img" src="assets/images/hero/home.webp" alt="" width="1600" height="900">
          ${stepHeader(1)}
          <ul class="onboarding__list">
            <li>${icon('calendar', 'icon--sm')}<span>Organizá tu semana: entrenamientos, deportes, caminatas y descanso.</span></li>
            <li>${icon('utensils', 'icon--sm')}<span>Planificá tus comidas, encontrá recetas y armá tu lista de compras.</span></li>
            <li>${icon('chart', 'icon--sm')}<span>Seguí tu progreso con lo que realmente completás.</span></li>
          </ul>
          <form class="form" novalidate>
            <div class="field">
              <label class="field__label" for="ob-name">¿Cómo te llamamos? <span class="field__optional">(opcional)</span></label>
              <input class="field__input" id="ob-name" name="displayName" type="text" maxlength="${NAME_MAX}" autocomplete="nickname" value="${state.profile.displayName}">
            </div>
            <div class="dialog__footer dialog__footer--split">
              <button type="button" class="btn btn--ghost" data-dialog-close>Omitir</button>
              <button type="submit" class="btn btn--primary">Siguiente ${icon('arrow-right', 'icon--sm')}</button>
            </div>
          </form>
        </div>`,
      onOpen(dialogEl) {
        dialogEl.querySelector('form').addEventListener('submit', (event) => {
          event.preventDefault();
          const displayName = event.target.elements.displayName.value.trim().slice(0, NAME_MAX);
          setState((s) => ({ ...s, profile: { ...s.profile, displayName } }));
          showStep(2);
        });
      },
    });
  } else if (step === 2) {
    const favorites = state.profile.favoriteActivities;
    openDialog({
      title: '¿Qué actividades hacés o te gustaría hacer?',
      content: html`
        <form class="form onboarding" novalidate>
          ${stepHeader(2)}
          <fieldset class="check-group">
            <legend class="card__text">Elegí todas las que quieras. Van a aparecer primero cuando agregues una actividad.</legend>
            <div class="fav-grid">
              ${CATEGORIES.filter((c) => !c.isRest).map((c) => html`
                <label class="fav">
                  <input type="checkbox" name="favoriteActivities" value="${c.id}" ${favorites.includes(c.id) ? 'checked' : ''}>
                  <span class="fav__box">${icon(c.icon, 'icon--sm')} ${c.short}</span>
                </label>`)}
            </div>
          </fieldset>
          <div class="dialog__footer dialog__footer--split">
            <button type="button" class="btn btn--ghost" data-back>Atrás</button>
            <button type="submit" class="btn btn--primary">Siguiente ${icon('arrow-right', 'icon--sm')}</button>
          </div>
        </form>`,
      onOpen(dialogEl) {
        const form = dialogEl.querySelector('form');
        form.querySelector('[data-back]').addEventListener('click', () => showStep(1));
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const favoriteActivities = new FormData(form).getAll('favoriteActivities');
          setState((s) => ({ ...s, profile: { ...s.profile, favoriteActivities } }));
          showStep(3);
        });
      },
    });
  } else {
    openDialog({
      title: '¿Cómo querés empezar?',
      content: html`
        <div class="onboarding">
          ${stepHeader(3)}
          <div class="start-options">
            <button type="button" class="start-option" data-start="sample">
              ${icon('layers')}<span><strong>Ver un ejemplo</strong><small>Cargamos una semana de ejemplo para que recorras la app. Se borra con un toque.</small></span>
            </button>
            <button type="button" class="start-option" data-start="template">
              ${icon('calendar')}<span><strong>Elegir una plantilla</strong><small>Sumá una semana lista de caminatas, gimnasio, running y más.</small></span>
            </button>
            <button type="button" class="start-option" data-start="blank">
              ${icon('plus')}<span><strong>Empezar de cero</strong><small>Cargá tus propias actividades desde el inicio.</small></span>
            </button>
          </div>
          <div class="dialog__footer dialog__footer--split">
            <button type="button" class="btn btn--ghost" data-back>Atrás</button>
            <span></span>
          </div>
        </div>`,
      onOpen(dialogEl) {
        dialogEl.querySelector('[data-back]').addEventListener('click', () => showStep(2));
        dialogEl.querySelector('.start-options').addEventListener('click', (event) => {
          const choice = event.target.closest('[data-start]')?.dataset.start;
          if (!choice) return;
          markOnboarded();
          closeDialog();
          if (choice === 'sample') startSample();
          else if (choice === 'template') location.hash = '#/planes';
          else location.hash = '#/inicio';
        });
      },
    });
  }
}

// ---------- Datos de ejemplo (acciones compartidas) ----------

export function startSample() {
  if (loadSampleData().ok) {
    toast('Cargamos datos de ejemplo. Podés borrarlos cuando quieras desde el aviso de arriba.');
    location.hash = '#/inicio';
  }
}

export async function confirmClearSample() {
  const ok = await confirmDialog({
    title: 'Borrar datos de ejemplo',
    message: 'Se quitan las actividades, comidas, compras y hábitos de ejemplo, incluidos los que hayas editado. Lo que agregaste vos se conserva.',
    confirmLabel: 'Borrar ejemplo',
    danger: true,
  });
  if (!ok) return;
  clearSampleData();
  toast('Datos de ejemplo borrados.');
}

/** Aviso visible en todas las secciones mientras haya datos de ejemplo. */
export function sampleBanner(state) {
  if (!state.sampleData) return '';
  return html`
    <div class="sample-banner" role="note">
      ${icon('info', 'icon--sm')}
      <span>Estás viendo <strong>datos de ejemplo</strong>.</span>
      <button type="button" class="btn btn--ghost btn--sm" id="sample-banner-clear" data-action="clear-sample">Borrar ejemplo</button>
    </div>`;
}
