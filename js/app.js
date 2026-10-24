// Punto de entrada de NOVANTIQ Move.
// Carga el estado, inicia el router y conecta los eventos globales.

import { initState, getState, subscribe, setStorageErrorHandler } from './state.js';
import { storageErrorMessage } from './storage.js';
import { createRouter } from './router.js';
import { render } from './utils/dom.js';
import { toast } from './ui.js';
import * as homeView from './views/home.js';
import * as weekView from './views/week.js';
import * as profileView from './views/profile.js';
import * as plansView from './views/plans.js';
import * as nutritionView from './views/nutrition.js';
import { progressView } from './views/coming-soon.js';

const main = document.getElementById('main');

// Cada vista expone: title, render(state) y, opcionalmente, actions y forms.
const routes = {
  inicio: homeView,
  semana: weekView,
  planes: plansView,
  nutricion: nutritionView,
  progreso: progressView,
  perfil: profileView,
};

// Acciones disponibles en cualquier vista (botones con data-action="...")
const globalActions = {
  'add-activity': (button) => weekView.openActivityForm({ date: button.dataset.date }),
  'open-activity': (button) => weekView.openActivityDetail(button.dataset.id),
  'toggle-complete': (button) => weekView.toggleFromList(button.dataset.id),
};

let currentView = null;
let viewElement = null;

/**
 * Vuelve a dibujar la vista actual (cada vez que cambia el estado o un filtro).
 * Si el foco estaba en un elemento con id dentro de la vista, se lo devuelve
 * después de redibujar, para que el teclado y los lectores de pantalla no se pierdan.
 */
function refresh() {
  if (!viewElement) return;
  const focusedId = viewElement.contains(document.activeElement) ? document.activeElement.id : '';
  render(viewElement, currentView.render(getState()));
  if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
}

/** Cambio de sección: crea un contenedor nuevo (con animación de entrada) y mueve el foco. */
function showRoute(name, view) {
  const isFirstRender = currentView === null;
  currentView = view;
  viewElement = document.createElement('div');
  viewElement.className = 'view';
  main.replaceChildren(viewElement);
  refresh();

  document.title = `${view.title} · NOVANTIQ Move`;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // Lectores de pantalla y teclado: al navegar, el foco va al título de la nueva sección
  if (!isFirstRender) {
    window.scrollTo(0, 0);
    main.querySelector('#view-title')?.focus({ preventScroll: true });
  }
}

// Delegación de eventos: un único listener para todos los botones con data-action
main.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const handler = currentView.actions?.[button.dataset.action] ?? globalActions[button.dataset.action];
  handler?.(button, event);
});

// Campos que reaccionan al cambiar (por ejemplo, filtros): <select data-change="nombre"> → view.changes.nombre(el)
main.addEventListener('change', (event) => {
  const handler = currentView.changes?.[event.target.dataset.change];
  handler?.(event.target, event);
});

// Las vistas pueden pedir un redibujo sin cambiar el estado (ver requestRender en ui.js)
document.addEventListener('app:render', refresh);

// Formularios dentro de las vistas: <form data-form="nombre"> → view.forms.nombre(form)
main.addEventListener('submit', (event) => {
  const handler = currentView.forms?.[event.target.dataset.form];
  if (!handler) return;
  event.preventDefault();
  handler(event.target);
});

async function start() {
  const result = await initState();
  if (!result.ok) toast(storageErrorMessage(result.reason), { type: 'error', duration: 8000 });

  setStorageErrorHandler((error) => toast(storageErrorMessage(error.reason), { type: 'error', duration: 8000 }));
  subscribe(refresh);

  createRouter(routes, { fallback: 'inicio', onChange: showRoute }).start();
}

start();
