// Estadísticas derivadas de los registros reales del usuario.
// Nada se inventa: si no hay datos, los valores son 0 y la interfaz muestra un estado vacío.
// (El panel completo de progreso llega en la Etapa 5.)

import { getActivitiesInRange } from './activities.js';
import { weekDays } from './utils/dates.js';

/** Resumen de una semana: planificadas vs. completadas y minutos realmente completados. */
export function getWeekSummary(state, weekStartIso) {
  const days = weekDays(weekStartIso);
  const activities = getActivitiesInRange(state, days[0], days[6]);
  const training = activities.filter((a) => a.category !== 'rest'); // el descanso no cuenta como "pendiente"
  const completed = training.filter((a) => a.status === 'completed');

  return {
    days: days.map((date) => {
      const ofDay = activities.filter((a) => a.date === date);
      return {
        date,
        total: ofDay.filter((a) => a.category !== 'rest').length,
        completed: ofDay.filter((a) => a.status === 'completed' && a.category !== 'rest').length,
        isRest: ofDay.length > 0 && ofDay.every((a) => a.category === 'rest'),
      };
    }),
    planned: training.length,
    completed: completed.length,
    minutesCompleted: completed.reduce((sum, a) => sum + (a.durationMin ?? 0), 0),
  };
}
