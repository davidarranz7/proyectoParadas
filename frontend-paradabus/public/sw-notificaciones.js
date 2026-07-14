self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const datos = event.data ? event.data.json() : {};
  const titulo = datos.titulo || 'ParadaBus';
  const opciones = {
    body: datos.cuerpo || 'Tienes una alerta de trayecto.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: datos.tag || 'paradabus-trayecto',
    data: datos.data || {},
    renotify: datos.renotify !== false,
    requireInteraction: Boolean(datos.requireInteraction),
    actions: Array.isArray(datos.actions) && datos.actions.length > 0
      ? datos.actions
      : [
        {
          action: 'abrir-trayecto',
          title: 'Abrir trayecto'
        },
        {
          action: 'finalizar-trayecto',
          title: 'Finalizar'
        }
      ]
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (event) => {
  const accion = event.action || 'abrir-trayecto';
  const datos = event.notification.data || {};

  event.notification.close();

  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    if (clientes.length > 0) {
      const cliente = clientes[0];

      cliente.postMessage({
        type: 'PARADABUS_NOTIFICACION_ACCION',
        accion,
        datos
      });

      if ('focus' in cliente) {
        await cliente.focus();
      }

      return;
    }

    const urlBase = datos.url || '/';
    const url = new URL(urlBase, self.location.origin);
    url.searchParams.set('trayectoAccion', accion);

    if ('openWindow' in self.clients) {
      await self.clients.openWindow(url.toString());
    }
  })());
});
