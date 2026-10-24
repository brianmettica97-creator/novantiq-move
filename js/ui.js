// Componentes de interfaz compartidos: diálogo, avisos breves y piezas visuales repetidas.

import { html, icon, render } from './utils/dom.js';

// ---------- Diálogo ----------
// Usamos el elemento nativo <dialog>: ya resuelve el foco atrapado, la tecla Escape
// y la capa de fondo, sin librerías.

const dialog = document.getElementById('app-dialog');
let lastFocused = null;

/**
 * Abre el diálogo con un título y un contenido.
 * `onOpen(dialogElement)` permite a quien lo llama conectar sus eventos (por ejemplo, un formulario).
 */
export function openDialog({ title, content, onOpen }) {
  // Si ya hay un diálogo abierto (por ejemplo, del detalle se pasa a "Editar"),
  // se reemplaza el contenido y se conserva el elemento al que volver el foco.
  if (!dialog.open) lastFocused = document.activeElement;
  // Redibujar el mismo diálogo (por ejemplo, al tildar una tarea) conserva el desplazamiento y el foco
  const isRefresh = dialog.open && dialog.dataset.title === title;
  const previousScroll = dialog.scrollTop;
  dialog.dataset.title = title;
  render(dialog, html`
    <header class="dialog__header">
      <h2 class="dialog__title" id="app-dialog-title">${title}</h2>
      <button type="button" class="btn btn--ghost btn--icon" data-dialog-close aria-label="Cerrar">${icon('x')}</button>
    </header>
    <div class="dialog__body">${content}</div>
  `);
  if (!dialog.open) dialog.showModal();
  if (isRefresh) {
    dialog.scrollTop = previousScroll;
  } else {
    // Foco inicial: el elemento marcado con autofocus, el primer campo de un formulario
    // o, si no hay, el propio diálogo (así no salta hasta el final del contenido).
    (dialog.querySelector('[autofocus], .dialog__body form .field__input') ?? dialog).focus({ preventScroll: true });
    dialog.scrollTop = 0;
  }
  onOpen?.(dialog);
}

/**
 * Diálogo de confirmación para acciones destructivas o con conflictos.
 * Devuelve una promesa: true si la persona confirma, false si cancela o cierra.
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let confirmed = false;
    openDialog({
      title,
      content: html`
        <p class="dialog__message">${message}</p>
        <div class="dialog__footer">
          <button type="button" class="btn btn--ghost" data-dialog-close autofocus>Cancelar</button>
          <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-confirm>${confirmLabel}</button>
        </div>
      `,
      onOpen(dialogEl) {
        dialogEl.querySelector('[data-confirm]').addEventListener('click', () => {
          confirmed = true;
          closeDialog();
        });
        dialogEl.addEventListener('close', () => resolve(confirmed), { once: true });
      },
    });
  });
}

/** Pide a la app que vuelva a dibujar la vista actual (para cambios de interfaz que no tocan el estado, como filtros). */
export function requestRender() {
  document.dispatchEvent(new CustomEvent('app:render'));
}

export function closeDialog() {
  if (dialog.open) dialog.close();
}

dialog.addEventListener('click', (event) => {
  // Cierra con el botón X, con cualquier [data-dialog-close] o al hacer clic en el fondo
  if (event.target.closest('[data-dialog-close]') || event.target === dialog) closeDialog();
});
dialog.addEventListener('close', () => {
  // El evento "close" llega de forma asíncrona: si mientras tanto se abrió otro
  // diálogo, no hay que borrar su contenido.
  if (dialog.open) return;
  render(dialog, '');
  delete dialog.dataset.title;
  // Devuelve el foco a donde estaba la persona; si ese elemento ya no existe
  // (la vista se volvió a dibujar), lo busca por id o va al título de la sección.
  const target = lastFocused?.isConnected ? lastFocused
    : (lastFocused?.id && document.getElementById(lastFocused.id)) || document.getElementById('view-title');
  target?.focus?.();
});

// ---------- Avisos breves ----------

const toastRegion = document.getElementById('toast-region');

export function toast(message, { type = 'success', duration = 3500 } = {}) {
  const item = document.createElement('div');
  item.className = `toast toast--${type}`;
  render(item, html`${icon(type === 'error' ? 'info' : 'check')}<span>${message}</span>`);
  toastRegion.append(item);
  setTimeout(() => item.remove(), duration);
}

// ---------- Piezas visuales ----------

/** Banner con foto para el encabezado de cada sección. */
export function sectionBanner({ eyebrow, title, text, image, alt = '' }) {
  return html`
    <section class="banner" aria-labelledby="view-title">
      <img class="banner__img" src="${image}" alt="${alt}" width="1600" height="600" decoding="async">
      <div class="banner__content">
        <p class="banner__eyebrow">${eyebrow}</p>
        <h1 class="banner__title" id="view-title" tabindex="-1">${title}</h1>
        ${text ? html`<p class="banner__text">${text}</p>` : ''}
      </div>
    </section>
  `;
}

/** Estado vacío con icono, texto y acciones opcionales. */
export function emptyState({ iconName, title, text, actions = '' }) {
  return html`
    <div class="empty">
      <span class="empty__icon">${icon(iconName, 'icon--lg')}</span>
      <h3 class="empty__title">${title}</h3>
      <p class="empty__text">${text}</p>
      ${actions ? html`<div class="btn-row">${actions}</div>` : ''}
    </div>
  `;
}

/**
 * Muestra errores de validación junto a cada campo y enfoca el primero.
 * Cada campo necesita un <p class="field__error" id="error-NOMBRE">.
 */
export function showFieldErrors(form, errors) {
  form.querySelectorAll('.field__error').forEach((el) => { el.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const names = Object.keys(errors);
  names.forEach((name) => {
    const input = form.elements[name];
    const message = form.querySelector(`#error-${name}`);
    if (message) message.textContent = errors[name];
    input?.setAttribute('aria-invalid', 'true');
  });
  if (names.length) form.elements[names[0]]?.focus();
}
