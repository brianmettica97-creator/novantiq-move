// Helpers para generar HTML de forma segura.
//
// Usamos template literals para dibujar la interfaz. El problema: si un texto
// escrito por el usuario (por ejemplo, una nota) contiene "<script>", insertarlo
// con innerHTML lo ejecutaría (XSS). La etiqueta `html` escapa automáticamente
// todos los valores interpolados; solo lo marcado con `raw()` se inserta tal cual.

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** Marca un fragmento como HTML confiable (generado por nosotros, nunca por el usuario). */
export const raw = (value) => new SafeHtml(String(value));

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toHtml(value) {
  if (value == null || value === false) return '';
  if (Array.isArray(value)) return value.map(toHtml).join('');
  if (value instanceof SafeHtml) return value.value;
  return escapeHtml(value);
}

/**
 * Uso: html`<p>${nombre}</p>` → SafeHtml con `nombre` escapado.
 * Acepta arrays (útil con .map) y anidar otros html``.
 */
export function html(strings, ...values) {
  return raw(strings.reduce((out, str, i) => out + toHtml(values[i - 1]) + str));
}

/** Icono del sprite. `name` siempre es un identificador nuestro, nunca dato del usuario. */
export function icon(name, extraClass = '') {
  return raw(`<svg class="icon ${extraClass}" aria-hidden="true"><use href="assets/icons/sprite.svg#${name}"></use></svg>`);
}

/** Reemplaza el contenido de un elemento con un SafeHtml. */
export function render(element, content) {
  element.innerHTML = toHtml(content);
}
