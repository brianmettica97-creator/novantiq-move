// Configuración pública de la app (no va nada secreto acá: este archivo lo puede leer cualquiera).

// Repositorio donde se reciben sugerencias y reportes de errores (GitHub Issues, requiere cuenta).
export const REPO_URL = 'https://github.com/brianmettica97-creator/novantiq-move';
export const GITHUB_FEEDBACK_URL = `${REPO_URL}/issues/new/choose`;

// Formulario para testers sin cuenta de GitHub (por ejemplo, un Google Form).
// Pegá acá el link "Enviar" del formulario. Mientras esté vacío, la app usa solo GitHub.
export const FEEDBACK_FORM_URL = '';

// Canal principal: el formulario si existe; si no, GitHub.
export const FEEDBACK_URL = FEEDBACK_FORM_URL || GITHUB_FEEDBACK_URL;
