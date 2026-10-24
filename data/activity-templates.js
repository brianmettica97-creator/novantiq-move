// Plantillas semanales de ejemplo. Son datos de SOLO LECTURA: al aplicarlas, la app crea
// copias en el estado del usuario, y editar esas copias nunca modifica estas plantillas.
//
// Son ejemplos generales de organización, no prescripciones médicas ni programas personalizados.
//
// day: 0 = lunes … 6 = domingo (relativo al lunes de la semana elegida).
// key: identificador estable de cada sesión dentro de la plantilla (evita duplicados al reaplicar).

export const LEVELS = [
  { id: 'beginner', label: 'Inicial' },
  { id: 'intermediate', label: 'Intermedio' },
];

export const GOALS = [
  { id: 'general', label: 'Moverse más' },
  { id: 'habit', label: 'Crear el hábito' },
  { id: 'strength', label: 'Fuerza general' },
  { id: 'endurance', label: 'Resistencia' },
  { id: 'variety', label: 'Variedad y diversión' },
];

export const EQUIPMENT = [
  { id: 'none', label: 'Sin equipamiento' },
  { id: 'basic', label: 'Equipamiento básico' },
  { id: 'gym', label: 'Gimnasio' },
  { id: 'varied', label: 'Según cada deporte' },
];

export const TEMPLATES = [
  {
    id: 'tpl-general',
    name: 'Semana de actividad física general',
    description: 'Una semana equilibrada para moverte más: caminatas, movilidad, un entrenamiento simple en casa y tiempo libre para una actividad que disfrutes.',
    image: 'assets/images/templates/general.webp',
    alt: 'Grupo de personas caminando por un sendero en el bosque',
    level: 'beginner',
    goal: 'general',
    equipment: 'none',
    sessions: [
      { key: 'mon-walk', day: 0, name: 'Caminata a ritmo cómodo', category: 'walking', durationMin: 30, intensity: 'low', tasks: ['Caminar a un ritmo que permita conversar'] },
      { key: 'tue-mob', day: 1, name: 'Movilidad general', category: 'mobility', durationMin: 20, intensity: 'low', tasks: ['Movilidad de cuello y hombros', 'Movilidad de cadera', 'Estiramientos suaves de piernas'] },
      { key: 'wed-home', day: 2, name: 'Entrenamiento simple en casa', category: 'home', durationMin: 30, intensity: 'medium', tasks: ['Entrada en calor', 'Sentadillas', 'Flexiones con apoyo', 'Plancha', 'Vuelta a la calma'] },
      { key: 'thu-rest', day: 3, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'fri-walk', day: 4, name: 'Caminata', category: 'walking', durationMin: 40, intensity: 'low', tasks: [] },
      { key: 'sat-free', day: 5, name: 'Actividad recreativa libre', category: 'other', durationMin: 45, intensity: 'medium', description: 'Bici, baile, un partido o lo que tengas ganas de hacer.', tasks: [] },
      { key: 'sun-rest', day: 6, name: 'Descanso', category: 'rest', tasks: [] },
    ],
  },
  {
    id: 'tpl-gym-intro',
    name: 'Plan introductorio de gimnasio',
    description: 'Tres sesiones de cuerpo completo para familiarizarte con el gimnasio, con un día de movilidad y descansos entre medio.',
    image: 'assets/images/templates/gym-intro.webp',
    alt: 'Dos personas entrenando con cuerdas en un gimnasio',
    level: 'beginner',
    goal: 'strength',
    equipment: 'gym',
    sessions: [
      { key: 'mon-a', day: 0, name: 'Cuerpo completo A', category: 'gym', durationMin: 50, intensity: 'medium', tasks: ['Entrada en calor en bici o cinta', 'Prensa de piernas', 'Remo en máquina', 'Press de pecho en máquina', 'Plancha', 'Estiramientos'] },
      { key: 'tue-rest', day: 1, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'wed-b', day: 2, name: 'Cuerpo completo B', category: 'gym', durationMin: 50, intensity: 'medium', tasks: ['Entrada en calor', 'Sentadilla con peso corporal', 'Jalón al pecho', 'Press de hombros con mancuernas', 'Puente de glúteos', 'Estiramientos'] },
      { key: 'thu-rest', day: 3, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'fri-a', day: 4, name: 'Cuerpo completo A', category: 'gym', durationMin: 50, intensity: 'medium', tasks: ['Entrada en calor en bici o cinta', 'Prensa de piernas', 'Remo en máquina', 'Press de pecho en máquina', 'Plancha', 'Estiramientos'] },
      { key: 'sat-mob', day: 5, name: 'Movilidad y estiramientos', category: 'mobility', durationMin: 20, intensity: 'low', tasks: [] },
      { key: 'sun-rest', day: 6, name: 'Descanso', category: 'rest', tasks: [] },
    ],
  },
  {
    id: 'tpl-walking',
    name: 'Semana de caminatas',
    description: 'Cinco caminatas de duración variable para sumar movimiento a tu rutina sin necesitar nada más que calzado cómodo.',
    image: 'assets/images/templates/walking.webp',
    alt: 'Persona caminando por un camino de pasto',
    level: 'beginner',
    goal: 'habit',
    equipment: 'none',
    sessions: [
      { key: 'mon', day: 0, name: 'Caminata corta', category: 'walking', durationMin: 20, intensity: 'low', tasks: [] },
      { key: 'tue', day: 1, name: 'Caminata', category: 'walking', durationMin: 30, intensity: 'low', tasks: [] },
      { key: 'wed-rest', day: 2, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'thu', day: 3, name: 'Caminata con subidas', category: 'walking', durationMin: 30, intensity: 'medium', description: 'Si tenés cerca una zona con pendientes o escaleras, sumala.', tasks: [] },
      { key: 'fri', day: 4, name: 'Caminata corta', category: 'walking', durationMin: 20, intensity: 'low', tasks: [] },
      { key: 'sat', day: 5, name: 'Caminata larga', category: 'walking', durationMin: 45, intensity: 'low', description: 'Ideal para un parque o un recorrido nuevo.', tasks: [] },
      { key: 'sun-rest', day: 6, name: 'Descanso', category: 'rest', tasks: [] },
    ],
  },
  {
    id: 'tpl-running',
    name: 'Plan recreativo de running',
    description: 'Tres salidas a correr con distintos estímulos, pensadas para quienes ya corren de vez en cuando y quieren organizarse.',
    image: 'assets/images/templates/running.webp',
    alt: 'Corredor en pleno salto sobre un sendero',
    level: 'intermediate',
    goal: 'endurance',
    equipment: 'none',
    sessions: [
      { key: 'mon-rest', day: 0, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'tue-easy', day: 1, name: 'Trote suave', category: 'running', durationMin: 30, intensity: 'low', tasks: ['Entrada en calor caminando', 'Trote a ritmo de conversación', 'Estiramientos'] },
      { key: 'wed-mob', day: 2, name: 'Movilidad', category: 'mobility', durationMin: 15, intensity: 'low', tasks: [] },
      { key: 'thu-intervals', day: 3, name: 'Intervalos de trote y caminata', category: 'running', durationMin: 35, intensity: 'medium', tasks: ['Entrada en calor', 'Alternar tramos de trote más rápido con caminata', 'Vuelta a la calma'] },
      { key: 'fri-rest', day: 4, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'sat-long', day: 5, name: 'Salida larga y tranquila', category: 'running', durationMin: 45, intensity: 'low', tasks: [] },
      { key: 'sun-walk', day: 6, name: 'Caminata de recuperación', category: 'walking', durationMin: 30, intensity: 'low', tasks: [] },
    ],
  },
  {
    id: 'tpl-home',
    name: 'Organización semanal de entrenamiento en casa',
    description: 'Tres entrenamientos en casa con una colchoneta, alternados con días de movilidad. Sin traslados ni horarios fijos.',
    image: 'assets/images/templates/home.webp',
    alt: 'Persona haciendo flexiones en el living de su casa',
    level: 'beginner',
    goal: 'strength',
    equipment: 'basic',
    sessions: [
      { key: 'mon', day: 0, name: 'Entrenamiento en casa: piernas y core', category: 'home', durationMin: 30, intensity: 'medium', tasks: ['Entrada en calor', 'Sentadillas', 'Estocadas', 'Puente de glúteos', 'Plancha'] },
      { key: 'tue-mob', day: 1, name: 'Movilidad', category: 'mobility', durationMin: 15, intensity: 'low', tasks: [] },
      { key: 'wed', day: 2, name: 'Entrenamiento en casa: tren superior', category: 'home', durationMin: 30, intensity: 'medium', tasks: ['Entrada en calor', 'Flexiones (con apoyo si hace falta)', 'Fondos en silla', 'Superman', 'Plancha lateral'] },
      { key: 'thu-mob', day: 3, name: 'Movilidad', category: 'mobility', durationMin: 15, intensity: 'low', tasks: [] },
      { key: 'fri', day: 4, name: 'Entrenamiento en casa: cuerpo completo', category: 'home', durationMin: 30, intensity: 'medium', tasks: ['Entrada en calor', 'Circuito con los ejercicios de la semana', 'Vuelta a la calma'] },
      { key: 'sat-rest', day: 5, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'sun-rest', day: 6, name: 'Descanso', category: 'rest', tasks: [] },
    ],
  },
  {
    id: 'tpl-multisport',
    name: 'Semana de actividad multideportiva',
    description: 'Una semana variada que combina bici, gimnasio, natación, pádel, fútbol y caminata. Ideal si te aburre repetir siempre lo mismo.',
    image: 'assets/images/templates/multisport.webp',
    alt: 'Dos personas andando en bicicleta por una ruta',
    level: 'intermediate',
    goal: 'variety',
    equipment: 'varied',
    sessions: [
      { key: 'mon-bike', day: 0, name: 'Salida en bici', category: 'cycling', durationMin: 45, intensity: 'medium', tasks: [] },
      { key: 'tue-gym', day: 1, name: 'Gimnasio', category: 'gym', durationMin: 45, intensity: 'medium', tasks: [] },
      { key: 'wed-swim', day: 2, name: 'Natación', category: 'swimming', durationMin: 40, intensity: 'medium', tasks: [] },
      { key: 'thu-rest', day: 3, name: 'Descanso', category: 'rest', tasks: [] },
      { key: 'fri-padel', day: 4, name: 'Pádel o tenis', category: 'racket', durationMin: 60, intensity: 'medium', tasks: [] },
      { key: 'sat-football', day: 5, name: 'Fútbol', category: 'football', durationMin: 60, intensity: 'high', tasks: [] },
      { key: 'sun-walk', day: 6, name: 'Caminata tranquila', category: 'walking', durationMin: 40, intensity: 'low', tasks: [] },
    ],
  },
];
