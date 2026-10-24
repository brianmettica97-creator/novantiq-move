// Vistas de secciones que se implementan en etapas posteriores.
// Muestran con claridad qué incluirá cada una, sin botones que simulen funciones inexistentes.

import { html, icon } from '../utils/dom.js';
import { sectionBanner } from '../ui.js';

function comingSoonView({ title, banner, intro, items, notice }) {
  return {
    title,
    render: () => html`
      <div class="stack">
        ${sectionBanner(banner)}
        <section class="card">
          <div class="card__header">
            <h2 class="card__title">${icon('info')} Qué vas a encontrar</h2>
            <span class="badge badge--soon">Próximamente</span>
          </div>
          <p class="card__text">${intro}</p>
          <ul class="soon-list">
            ${items.map((item) => html`<li>${icon('check', 'icon--sm')}<span>${item}</span></li>`)}
          </ul>
        </section>
        ${notice ? html`<p class="notice">${icon('info')}<span>${notice}</span></p>` : ''}
      </div>
    `,
  };
}

export const progressView = comingSoonView({
  title: 'Mi progreso',
  banner: {
    eyebrow: 'Mi progreso',
    title: 'Tu constancia, a la vista',
    text: 'Estadísticas calculadas a partir de tus registros reales.',
    image: 'assets/images/sections/progress.webp',
    alt: 'Persona tocando un reloj inteligente en su muñeca',
  },
  intro: 'Un panel de seguimiento que distingue lo planificado de lo realmente completado.',
  items: [
    'Sesiones completadas por semana y minutos de actividad registrados.',
    'Actividades realizadas por categoría.',
    'Historial semanal y cumplimiento de la planificación.',
    'Hábitos opcionales.',
  ],
  notice: 'Los días de descanso cuentan como parte de tu plan: nunca se muestran como un fracaso.',
});
