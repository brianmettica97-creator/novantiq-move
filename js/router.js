// Router mínimo basado en el hash de la URL (#/inicio, #/semana…).
// Ventajas: funciona en cualquier hosting estático y el botón "atrás" del navegador anda.

export function createRouter(routes, { fallback, onChange }) {
  function currentRoute() {
    const name = location.hash.replace(/^#\/?/, '').split('?')[0];
    return routes[name] ? name : fallback;
  }

  function handle() {
    const name = currentRoute();
    // Normaliza URLs desconocidas o vacías para que la barra muestre la ruta real
    if (location.hash !== `#/${name}`) history.replaceState(null, '', `#/${name}`);
    onChange(name, routes[name]);
  }

  window.addEventListener('hashchange', handle);

  return {
    start: handle,
    current: currentRoute,
  };
}
