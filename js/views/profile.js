// Vista "Mi perfil".
// Etapa 2: nombre visible. Etapa 5: preferencias, exportar y borrar datos locales.

import { html, icon } from '../utils/dom.js';
import { sectionBanner, toast, showFieldErrors } from '../ui.js';
import { setState } from '../state.js';

export const title = 'Mi perfil';

const NAME_MAX = 40;

export function render(state) {
  return html`
    <div class="stack">
      ${sectionBanner({
        eyebrow: 'Mi perfil',
        title: 'Tu espacio',
        text: 'Ajustá cómo querés usar NOVANTIQ Move.',
        image: 'assets/images/sections/profile.webp',
        alt: 'Piernas de una persona corriendo con zapatillas deportivas',
      })}

      <section class="card">
        <div class="card__header"><h2 class="card__title">${icon('user')} Datos básicos</h2></div>
        <form class="form" data-form="profile" novalidate>
          <div class="field">
            <label class="field__label" for="p-name">Nombre visible</label>
            <input class="field__input" id="p-name" name="displayName" type="text" maxlength="${NAME_MAX}"
              value="${state.profile.displayName}" autocomplete="nickname" aria-describedby="p-name-hint error-displayName">
            <p class="field__hint" id="p-name-hint">Se usa solo para saludarte. Podés dejarlo vacío.</p>
            <p class="field__error" id="error-displayName"></p>
          </div>
          <p class="card__text">La semana comienza el lunes.</p>
          <div class="btn-row"><button type="submit" class="btn btn--primary">${icon('check')} Guardar</button></div>
        </form>
      </section>

      <p class="notice">${icon('info')}<span>Tus datos se guardan solo en este navegador. Todavía no hay cuentas ni sincronización entre dispositivos.</span></p>
    </div>
  `;
}

export const forms = {
  profile(form) {
    const displayName = form.elements.displayName.value.trim();
    if (displayName.length > NAME_MAX) {
      showFieldErrors(form, { displayName: `Usá como máximo ${NAME_MAX} caracteres.` });
      return;
    }
    setState((s) => ({ ...s, profile: { ...s.profile, displayName } }));
    toast(displayName ? `Listo, ${displayName}.` : 'Nombre eliminado.');
  },
};
