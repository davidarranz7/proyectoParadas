const SERVICE_WORKER_PATH = '/sw-notificaciones.js';

let registroPromise = null;

export function obtenerPermisoNotificaciones() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export async function registrarNotificacionesTrayecto() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (!registroPromise) {
    registroPromise = navigator.serviceWorker
      .register(SERVICE_WORKER_PATH)
      .catch(() => null);
  }

  return registroPromise;
}

export async function pedirPermisoNotificaciones() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    await registrarNotificacionesTrayecto();
    return Notification.permission;
  }

  const permiso = await Notification.requestPermission();

  if (permiso === 'granted') {
    await registrarNotificacionesTrayecto();
  }

  return permiso;
}

export async function mostrarNotificacionTrayecto({
  titulo,
  cuerpo,
  tag = 'paradabus-trayecto',
  accionUrl = '/',
  datos = {},
  requireInteraction = false
}) {
  if (obtenerPermisoNotificaciones() !== 'granted') {
    return false;
  }

  const registro = await registrarNotificacionesTrayecto();
  const opciones = {
    body: cuerpo,
    tag,
    renotify: true,
    requireInteraction,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      ...datos,
      url: accionUrl
    },
    actions: [
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

  if (registro?.showNotification) {
    await registro.showNotification(titulo, opciones);
    return true;
  }

  new Notification(titulo, opciones);
  return true;
}

export async function cerrarNotificacionesTrayecto(tag = 'paradabus-trayecto') {
  const registro = await registrarNotificacionesTrayecto();

  if (!registro?.getNotifications) {
    return;
  }

  const notificaciones = await registro.getNotifications({ tag });
  notificaciones.forEach((notificacion) => notificacion.close());
}
