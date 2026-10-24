// Categorías de actividad. Datos fijos, separados de la lógica de interfaz.
// `id` es estable: se guarda en cada actividad, así que no debe cambiarse.

export const CATEGORIES = [
  { id: 'gym',      label: 'Gimnasio y musculación', short: 'Gimnasio',  icon: 'cat-gym',      image: 'assets/images/activities/gym.webp',      alt: 'Persona entrenando en un gimnasio' },
  { id: 'running',  label: 'Running',                 short: 'Running',   icon: 'cat-running',  image: 'assets/images/activities/running.webp',  alt: 'Persona corriendo por la ciudad' },
  { id: 'walking',  label: 'Caminata',                short: 'Caminata',  icon: 'cat-walking',  image: 'assets/images/activities/walking.webp',  alt: 'Persona caminando por un sendero verde' },
  { id: 'cycling',  label: 'Ciclismo',                short: 'Ciclismo',  icon: 'cat-cycling',  image: 'assets/images/activities/cycling.webp',  alt: 'Ciclista en una ruta' },
  { id: 'football', label: 'Fútbol',                  short: 'Fútbol',    icon: 'cat-football', image: 'assets/images/activities/football.webp', alt: 'Jugador de fútbol en la cancha' },
  { id: 'racket',   label: 'Pádel y tenis',           short: 'Pádel/tenis', icon: 'cat-racket', image: 'assets/images/activities/racket.webp',   alt: 'Paleta de pádel en una cancha' },
  { id: 'swimming', label: 'Natación',                short: 'Natación',  icon: 'cat-swimming', image: 'assets/images/activities/swimming.webp', alt: 'Nadador en una pileta' },
  { id: 'home',     label: 'Entrenamiento en casa',   short: 'En casa',   icon: 'cat-home',     image: 'assets/images/activities/home.webp',     alt: 'Persona entrenando en su casa' },
  { id: 'mobility', label: 'Movilidad y estiramientos', short: 'Movilidad', icon: 'cat-mobility', image: 'assets/images/activities/mobility.webp', alt: 'Persona estirando sobre una colchoneta' },
  { id: 'other',    label: 'Otra actividad',          short: 'Otra',      icon: 'cat-other',    image: 'assets/images/activities/other.webp',    alt: 'Persona haciendo senderismo en la montaña' },
  { id: 'rest',     label: 'Descanso y recuperación', short: 'Descanso',  icon: 'cat-rest',     image: 'assets/images/activities/rest.webp',     alt: 'Persona descansando', isRest: true },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Devuelve la categoría o "Otra" si el id no existe (datos viejos o corruptos). */
export function getCategory(id) {
  return byId.get(id) ?? byId.get('other');
}
