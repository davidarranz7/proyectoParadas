import {
  apiDelete,
  apiGet,
  apiPost
} from './apiCliente';

const SERVICE_WORKER_PATH = '/sw-notificaciones.js';

let registroPromise = null;

function base64UrlAUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = `${base64Url}${padding}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = window.atob(base64);
  const salida = new Uint8Array(raw.length);

  for (let indice = 0; indice < raw.length; indice += 1) {
    salida[indice] = raw.charCodeAt(indice);
  }

  return salida;
}

function uint8ArrayABase64Url(buffer) {
  if (!buffer) {
    return '';
  }

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binario = '';

  bytes.forEach((byte) => {
    binario += String.fromCharCode(byte);
  });

  return window.btoa(binario)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function convertirHoraGtfsASegundos(hora) {
  if (!hora || typeof hora !== 'string') {
    return null;
  }

  const partes = hora.trim().split(':');

  if (partes.length < 2) {
    return null;
  }

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);
  const segundos = Number(partes[2] || 0);

  if (!Number.isFinite(horas) || !Number.isFinite(minutos) || !Number.isFinite(segundos)) {
    return null;
  }

  return (horas * 3600) + (minutos * 60) + segundos;
}

function construirFechaIsoDesdeHoraGtfs(fechaBase, horaGtfs, desplazamientoSegundos = 0) {
  const segundos = convertirHoraGtfsASegundos(horaGtfs);

  if (segundos === null) {
    return null;
  }

  const base = fechaBase ? new Date(fechaBase) : new Date();
  const fechaLocal = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    0,
    0,
    0,
    0
  );

  fechaLocal.setSeconds(segundos + desplazamientoSegundos);

  return fechaLocal.toISOString();
}

function construirAvisosTrayecto(trayecto) {
  if (!trayecto?.id || !Array.isArray(trayecto.segmentos)) {
    return [];
  }

  const baseFecha = trayecto.iniciadoEn || new Date().toISOString();
  const ultimoIndice = trayecto.segmentos.length - 1;
  const avisos = [];

  trayecto.segmentos.forEach((segmento, indice) => {
    if (!segmento) {
      return;
    }

    const salidaIso = construirFechaIsoDesdeHoraGtfs(baseFecha, segmento.horaSalidaBus, -180);

    if (salidaIso) {
      avisos.push({
        id: `${trayecto.id}-subida-${indice}`,
        scheduledAt: salidaIso,
        titulo: 'Tu bus llega pronto',
        cuerpo: `La linea ${segmento.linea || 'BUS'} sale pronto desde ${segmento.paradaSalida?.nombre || 'tu parada'}.`,
        tag: `paradabus-trayecto-${trayecto.id}`,
        requireInteraction: true,
        data: {
          trayectoId: trayecto.id,
          url: '/'
        }
      });
    }

    const paradas = Array.isArray(segmento.paradas) ? segmento.paradas : [];
    const penultimaParada = paradas.length >= 2 ? paradas[paradas.length - 2] : null;
    const horaAvisoBajada =
      penultimaParada?.horaSalida ||
      penultimaParada?.horaLlegada ||
      segmento.horaLlegadaBus;
    const bajadaIso = construirFechaIsoDesdeHoraGtfs(baseFecha, horaAvisoBajada);

    if (bajadaIso) {
      const esUltimoTramo = indice === ultimoIndice;

      avisos.push({
        id: `${trayecto.id}-bajada-${indice}`,
        scheduledAt: bajadaIso,
        titulo: esUltimoTramo
          ? 'Siguiente parada: baja'
          : 'Siguiente parada: preparate para transbordo',
        cuerpo: esUltimoTramo
          ? `Tu parada es ${segmento.paradaLlegada?.nombre || trayecto.destinoFinal || 'tu destino'}.`
          : `Tu enlace sera en ${segmento.paradaLlegada?.nombre || 'la parada de transbordo'}.`,
        tag: `paradabus-trayecto-${trayecto.id}`,
        requireInteraction: true,
        data: {
          trayectoId: trayecto.id,
          url: '/'
        }
      });
    }

    if (indice === ultimoIndice) {
      const llegadaFinalIso = construirFechaIsoDesdeHoraGtfs(baseFecha, segmento.horaLlegadaBus);

      if (llegadaFinalIso) {
        avisos.push({
          id: `${trayecto.id}-final`,
          scheduledAt: llegadaFinalIso,
          titulo: 'Trayecto completado',
          cuerpo: `Has llegado a ${trayecto.destinoFinal || segmento.paradaLlegada?.nombre || 'tu destino'}.`,
          tag: `paradabus-trayecto-${trayecto.id}`,
          requireInteraction: false,
          data: {
            trayectoId: trayecto.id,
            url: '/'
          }
        });
      }
    }
  });

  return avisos;
}

async function obtenerConfiguracionPush() {
  return apiGet('/notificaciones/push/config');
}

async function obtenerSuscripcionActual(registro) {
  if (!registro?.pushManager) {
    return null;
  }

  return registro.pushManager.getSubscription();
}

async function garantizarSuscripcionCompatible(registro, publicKey) {
  let suscripcion = await obtenerSuscripcionActual(registro);

  if (suscripcion?.options?.applicationServerKey && publicKey) {
    const claveActual = uint8ArrayABase64Url(suscripcion.options.applicationServerKey);

    if (claveActual && claveActual !== publicKey) {
      try {
        await suscripcion.unsubscribe();
      } catch {
        // Si no se puede desuscribir seguimos intentando crear una nueva.
      }

      suscripcion = null;
    }
  }

  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlAUint8Array(publicKey)
    });
  }

  return suscripcion;
}

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

export async function sincronizarSuscripcionPush() {
  if (
    typeof window === 'undefined' ||
    !('PushManager' in window) ||
    !('serviceWorker' in navigator)
  ) {
    return false;
  }

  if (obtenerPermisoNotificaciones() !== 'granted') {
    return false;
  }

  const configuracion = await obtenerConfiguracionPush();

  if (!configuracion?.publicKey) {
    return false;
  }

  const registro = await registrarNotificacionesTrayecto();

  if (!registro?.pushManager) {
    return false;
  }

  const suscripcion = await garantizarSuscripcionCompatible(
    registro,
    configuracion.publicKey
  );

  await apiPost('/notificaciones/push/suscripciones', suscripcion.toJSON());

  return true;
}

export async function asegurarSuscripcionPush() {
  const permiso = await pedirPermisoNotificaciones();

  if (permiso !== 'granted') {
    return false;
  }

  return sincronizarSuscripcionPush();
}

export async function enviarPruebaPush() {
  const lista = await asegurarSuscripcionPush();

  if (!lista) {
    return false;
  }

  await apiPost('/notificaciones/push/prueba', {});
  return true;
}

export async function programarAvisosTrayectoPush(trayecto) {
  if (!trayecto?.id) {
    return false;
  }

  const activa = await asegurarSuscripcionPush();

  if (!activa) {
    return false;
  }

  const avisos = construirAvisosTrayecto(trayecto);

  if (avisos.length === 0) {
    return false;
  }

  await apiPost('/notificaciones/push/trayectos', {
    trayectoId: trayecto.id,
    destinoFinal: trayecto.destinoFinal || null,
    avisos
  });

  return true;
}

export async function cancelarAvisosTrayectoPush(trayectoId) {
  if (!trayectoId) {
    return false;
  }

  await apiDelete(`/notificaciones/push/trayectos/${encodeURIComponent(trayectoId)}`);
  return true;
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
