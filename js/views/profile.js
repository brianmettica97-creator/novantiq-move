// Vista "Mi perfil": datos básicos, configuración de la semana, actividades favoritas,
// preferencias de visualización y gestión de los datos guardados en este navegador.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, toast, showFieldErrors, confirmDialog } from '../ui.js';
import { getState, setState, resetState, SCHEMA_VERSION } from '../state.js';
import { today } from '../utils/dates.js';
import { CATEGORIES } from '../../data/categories.js';
import { NUTRITION_GOALS } from '../recipes.js';
import { showTab } from './nutrition.js';

export const title = 'Mi perfil';

const NAME_MAX = 40;

export function render(state) {
  const { profile } = state;
  const goals = NUTRITION_GOALS.filter((g) => state.nutritionPrefs.goals.includes(g.id));
  const counts = {
    activities: state.activities.length,
    meals: Object.values(state.mealPlan).reduce((n, day) => n + Object.keys(day).length, 0),
    shopping: state.shoppingList.length,
    habits: state.habits.length,
  };
  const hasData = Object.values(counts).some(Boolean) || profile.displayName;

  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Mi perfil',
        title: 'Tu espacio',
        text: 'Ajustá cómo querés usar NOVANTIQ Move.',
        image: 'assets/images/sections/profile.webp',
        alt: 'Piernas de una persona corriendo con zapatillas deportivas',
      })}

      <form class="stack" data-form="profile" novalidate>
        <section class="card">
          <div class="card__header"><h2 class="card__title">${icon('user')} Datos básicos</h2></div>
          <div class="field">
            <label class="field__label" for="p-name">Nombre visible</label>
            <input class="field__input" id="p-name" name="displayName" type="text" maxlength="${NAME_MAX}"
              value="${profile.displayName}" autocomplete="nickname" aria-describedby="p-name-hint error-displayName">
            <p class="field__hint" id="p-name-hint">Se usa solo para saludarte. Podés dejarlo vacío.</p>
            <p class="field__error" id="error-displayName"></p>
          </div>
        </section>

        <section class="card">
          <div class="card__header"><h2 class="card__title">${icon('calendar')} Configuración de la semana</h2></div>
          <fieldset class="choice">
            <legend class="field__label">La semana empieza el</legend>
            <label class="choice__item"><input type="radio" name="weekStart" value="monday" ${profile.weekStart === 'monday' ? 'checked' : ''}> Lunes</label>
            <label class="choice__item"><input type="radio" name="weekStart" value="sunday" ${profile.weekStart === 'sunday' ? 'checked' : ''}> Domingo</label>
          </fieldset>
          <p class="field__hint">Cambia cómo se agrupan los días en Mi semana, Nutrición y Progreso. Tus actividades no se mueven.</p>
        </section>

        <section class="card">
          <div class="card__header"><h2 class="card__title">${icon('target')} Actividades favoritas</h2></div>
          <p class="card__text">Aparecen primero al agregar una actividad.</p>
          <div class="fav-grid">
            ${CATEGORIES.filter((c) => !c.isRest).map((c) => html`
              <label class="fav">
                <input type="checkbox" name="favoriteActivities" value="${c.id}" ${profile.favoriteActivities.includes(c.id) ? 'checked' : ''}>
                <span class="fav__box">${icon(c.icon, 'icon--sm')} ${c.short}</span>
              </label>`)}
          </div>
        </section>

        <section class="card">
          <div class="card__header"><h2 class="card__title">${icon('info')} Visualización</h2></div>
          <div class="check-group">
            <label class="check-field">
              <input type="checkbox" name="largeText" ${profile.display.largeText ? 'checked' : ''}>
              <span>Texto más grande</span>
            </label>
            <label class="check-field">
              <input type="checkbox" name="reduceMotion" ${profile.display.reduceMotion ? 'checked' : ''}>
              <span>Reducir animaciones
                <small>Si tu dispositivo ya pide menos movimiento, la app lo respeta automáticamente.</small></span>
            </label>
          </div>
        </section>

        <div class="btn-row"><button type="submit" class="btn btn--primary">${icon('check')} Guardar cambios</button></div>
      </form>

      <section class="card">
        <div class="card__header"><h2 class="card__title">${icon('utensils')} Preferencias alimentarias</h2></div>
        <p class="card__text">${goals.length ? goals.map((g) => g.label).join(' · ') : 'Todavía no elegiste preferencias.'}</p>
        <div class="btn-row card__actions">
          <a class="btn btn--secondary" href="#/nutricion" data-action="open-nutrition-prefs">Editar en Nutrición ${icon('arrow-right', 'icon--sm')}</a>
        </div>
      </section>

      <section class="card" aria-labelledby="data-title">
        <div class="card__header"><h2 class="card__title" id="data-title">${icon('layers')} Tus datos</h2></div>
        <p class="card__text">Todo se guarda solo en este navegador. Todavía no hay cuentas ni sincronización entre dispositivos: si borrás los datos del navegador o usás otro dispositivo, no vas a ver esta información.</p>
        <ul class="data-summary">
          <li>${counts.activities} actividades</li>
          <li>${counts.meals} comidas planificadas</li>
          <li>${counts.shopping} productos en compras</li>
          <li>${counts.habits} hábitos</li>
        </ul>
        <div class="btn-row card__actions">
          <button type="button" class="btn btn--secondary" id="export-data" data-action="export-data">Exportar mis datos (JSON)</button>
          <button type="button" class="btn btn--ghost btn--danger-text" id="delete-data" data-action="delete-data" ${hasData ? '' : 'disabled'}>Borrar mis datos</button>
        </div>
      </section>
    </div>
  `;
}

export const forms = {
  profile(form) {
    const data = new FormData(form);
    const displayName = (data.get('displayName') ?? '').trim();
    if (displayName.length > NAME_MAX) {
      showFieldErrors(form, { displayName: `Usá como máximo ${NAME_MAX} caracteres.` });
      return;
    }
    const weekStart = data.get('weekStart') === 'sunday' ? 'sunday' : 'monday';
    const favoriteActivities = data.getAll('favoriteActivities').filter((id) => CATEGORIES.some((c) => c.id === id));
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        displayName,
        weekStart,
        favoriteActivities,
        display: { largeText: data.has('largeText'), reduceMotion: data.has('reduceMotion') },
      },
    }));
    toast('Cambios guardados.');
  },
};

export const actions = {
  'open-nutrition-prefs': () => showTab('prefs'), // el enlace navega; esto elige la pestaña

  'export-data': () => {
    const payload = { app: 'NOVANTIQ Move', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: getState() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novantiq-move-datos-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Archivo de datos descargado.');
  },

  'delete-data': async () => {
    const ok = await confirmDialog({
      title: 'Borrar mis datos',
      message: 'Se van a borrar de este navegador todas tus actividades, comidas, lista de compras, hábitos y preferencias. Esta acción no se puede deshacer. Si querés conservar una copia, exportá tus datos antes.',
      confirmLabel: 'Borrar todo',
      danger: true,
    });
    if (!ok) return;
    const result = await resetState();
    toast(result.ok ? 'Tus datos se borraron.' : 'No se pudieron borrar los datos guardados de este navegador.', { type: result.ok ? 'success' : 'error' });
  },
};
