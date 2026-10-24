// Capa de persistencia.
//
// Todo acceso a datos guardados pasa por un "adaptador" con la misma interfaz:
//   load()  → { ok: true, data } | { ok: false, reason, error }
//   save(data) → { ok: true } | { ok: false, reason, error }
//   clear() → { ok: true } | { ok: false, reason, error }
//
// Hoy usamos LocalStorage. Cuando exista backend (por ejemplo Supabase), se crea
// otro adaptador con estos mismos métodos y el resto de la app no cambia.
// Por eso los métodos son async aunque LocalStorage sea síncrono.
//
// Importante: acá nunca se guardan contraseñas, tokens ni datos sensibles.

const STORAGE_KEY = 'novantiq-move:data';

export const localStorageAdapter = {
  async load() {
    let rawValue;
    try {
      rawValue = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      // Navegadores con almacenamiento bloqueado (algunos modos privados)
      return { ok: false, reason: 'unavailable', error };
    }
    if (rawValue === null) return { ok: true, data: null };

    try {
      return { ok: true, data: JSON.parse(rawValue) };
    } catch (error) {
      // Datos corruptos: guardamos una copia para no perderlos y empezamos de cero
      try { localStorage.setItem(`${STORAGE_KEY}:backup-${Date.now()}`, rawValue); } catch { /* sin espacio */ }
      return { ok: false, reason: 'corrupt', error };
    }
  },

  async save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (error) {
      const reason = error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable';
      return { ok: false, reason, error };
    }
  },

  async clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: 'unavailable', error };
    }
  },
};

/** Mensaje claro para mostrar al usuario según el tipo de error. */
export function storageErrorMessage(reason) {
  switch (reason) {
    case 'quota': return 'No hay espacio suficiente en este navegador para guardar los cambios.';
    case 'corrupt': return 'Los datos guardados estaban dañados. Se guardó una copia y la app empezó de cero.';
    default: return 'Este navegador no permite guardar datos. Los cambios se perderán al cerrar la página.';
  }
}
