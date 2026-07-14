import { obtenerParadasTrip } from './paradasTripServicio';

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

function obtenerSegundosAhora() {
  const ahora = new Date();

  return (ahora.getHours() * 3600) + (ahora.getMinutes() * 60) + ahora.getSeconds();
}

function calcularDistanciaMetros(puntoA, puntoB) {
  if (!puntoA || !puntoB) {
    return Number.MAX_SAFE_INTEGER;
  }

  const radioTierra = 6371000;
  const lat1 = puntoA.lat * Math.PI / 180;
  const lat2 = puntoB.lat * Math.PI / 180;
  const diferenciaLat = (puntoB.lat - puntoA.lat) * Math.PI / 180;
  const diferenciaLon = (puntoB.lon - puntoA.lon) * Math.PI / 180;

  const a =
    Math.sin(diferenciaLat / 2) * Math.sin(diferenciaLat / 2) +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(diferenciaLon / 2) *
    Math.sin(diferenciaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierra * c;
}

function normalizarParadas(paradas) {
  return (Array.isArray(paradas) ? paradas : [])
    .map((parada, indice) => ({
      ...parada,
      indice,
      lat: Number(parada.lat),
      lon: Number(parada.lon)
    }))
    .filter((parada) => Number.isFinite(parada.lat) && Number.isFinite(parada.lon));
}

function crearSegmentosDesdeRuta(ruta) {
  const tramos = Array.isArray(ruta?.tramos) && ruta.tramos.length > 0
    ? ruta.tramos
    : [
      {
        orden: 1,
        tipo: 'BUS',
        linea: ruta.linea,
        destinoBus: ruta.destinoBus,
        routeId: ruta.routeId,
        tripId: ruta.tripId,
        paradaSalida: ruta.paradaOrigen,
        paradaLlegada: ruta.paradaDestino,
        horaSalidaBus: ruta.horaSalidaBus,
        horaLlegadaBus: ruta.horaLlegadaBus,
        minutosBus: ruta.minutosBus
      }
    ];

  return tramos.map((tramo, indice) => ({
    id: `${tramo.tripId || tramo.linea || 'segmento'}-${indice}`,
    orden: tramo.orden ?? indice + 1,
    tipo: tramo.tipo || 'BUS',
    linea: tramo.linea || ruta.linea || 'BUS',
    destinoBus: tramo.destinoBus || ruta.destinoBus || 'Destino',
    routeId: tramo.routeId || ruta.routeId || null,
    tripId: tramo.tripId || ruta.tripId || null,
    paradaSalida: tramo.paradaSalida || ruta.paradaOrigen || null,
    paradaLlegada: tramo.paradaLlegada || ruta.paradaDestino || null,
    horaSalidaBus: tramo.horaSalidaBus || ruta.horaSalidaBus || null,
    horaLlegadaBus: tramo.horaLlegadaBus || ruta.horaLlegadaBus || null,
    minutosBus: tramo.minutosBus || ruta.minutosBus || null
  }));
}

function calcularIndicePorHorario(segmento, progresoPrevio) {
  const totalParadas = segmento.paradas.length;

  if (totalParadas <= 1) {
    return progresoPrevio;
  }

  const segundosSalida = convertirHoraGtfsASegundos(segmento.horaSalidaBus);
  const segundosLlegada = convertirHoraGtfsASegundos(segmento.horaLlegadaBus);

  if (segundosSalida === null || segundosLlegada === null || segundosLlegada <= segundosSalida) {
    return progresoPrevio;
  }

  let segundosActuales = obtenerSegundosAhora();

  while (segundosActuales < segundosSalida) {
    segundosActuales += 24 * 3600;
  }

  const proporcion = (segundosActuales - segundosSalida) / (segundosLlegada - segundosSalida);
  const proporcionAcotada = Math.min(1, Math.max(0, proporcion));
  const indiceCalculado = Math.round(proporcionAcotada * (totalParadas - 1));

  return Math.max(progresoPrevio, indiceCalculado);
}

function calcularIndicePorUbicacion(segmento, ubicacionUsuario, progresoPrevio) {
  if (!ubicacionUsuario || segmento.paradas.length === 0) {
    return null;
  }

  let mejorIndice = progresoPrevio;
  let mejorDistancia = Number.MAX_SAFE_INTEGER;

  segmento.paradas.forEach((parada, indice) => {
    const distancia = calcularDistanciaMetros(ubicacionUsuario, parada);

    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejorIndice = indice;
    }
  });

  if (mejorDistancia > 350) {
    return null;
  }

  return Math.max(progresoPrevio, mejorIndice);
}

function crearEstadoSegmento(segmento, progresoIndice, ubicacionUsuario) {
  const indiceFinal = Math.max(0, segmento.paradas.length - 1);
  const indiceActual = Math.min(progresoIndice, indiceFinal);
  const paradaActual = segmento.paradas[indiceActual] || null;
  const paradaSiguiente = segmento.paradas[Math.min(indiceActual + 1, indiceFinal)] || null;
  const paradasRestantes = Math.max(0, indiceFinal - indiceActual);
  const distanciaSiguienteParada = paradaSiguiente && ubicacionUsuario
    ? Math.round(calcularDistanciaMetros(ubicacionUsuario, paradaSiguiente))
    : null;

  return {
    progresoIndice: indiceActual,
    paradaActual,
    paradaSiguiente,
    paradasRestantes,
    distanciaSiguienteParada,
    avisoSiguienteParada: paradasRestantes === 1,
    haLlegadoDestino: indiceActual >= indiceFinal
  };
}

export async function prepararTrayectoActivo(ruta) {
  const segmentosBase = crearSegmentosDesdeRuta(ruta);

  const segmentos = await Promise.all(segmentosBase.map(async (segmento) => {
    const paradas = await obtenerParadasTrip({
      tripId: segmento.tripId,
      stopOrigen: segmento.paradaSalida?.stopId,
      stopDestino: segmento.paradaLlegada?.stopId
    });

    return {
      ...segmento,
      paradas: normalizarParadas(paradas),
      progresoIndice: 0,
      completado: false
    };
  }));

  return {
    id: `${ruta.idVisual || ruta.tripId || 'trayecto'}-${Date.now()}`,
    rutaVisualId: ruta.idVisual || null,
    lineaPrincipal: ruta.lineaPrincipal || ruta.linea || null,
    lineas: Array.isArray(ruta.lineas) ? ruta.lineas : [],
    resumenRuta: ruta.resumen,
    destinoFinal: ruta.paradaDestino?.nombre || ruta.destinoBus || 'Destino',
    esTransbordo: Boolean(ruta.esTransbordo),
    segmentoActivoIndex: 0,
    segmentos,
    estadoActual: null,
    ultimaUbicacionUsuario: null,
    alertasEmitidas: [],
    finalizado: false,
    iniciadoEn: new Date().toISOString()
  };
}

export function recalcularTrayectoActivo(trayecto, ubicacionUsuario) {
  if (!trayecto || !Array.isArray(trayecto.segmentos) || trayecto.segmentos.length === 0) {
    return trayecto;
  }

  const segmentos = trayecto.segmentos.map((segmento) => ({ ...segmento }));
  let segmentoActivoIndex = Math.min(
    trayecto.segmentoActivoIndex ?? 0,
    segmentos.length - 1
  );

  const segmentoActivo = segmentos[segmentoActivoIndex];
  const progresoPrevio = segmentoActivo.progresoIndice ?? 0;
  const indicePorUbicacion = calcularIndicePorUbicacion(
    segmentoActivo,
    ubicacionUsuario,
    progresoPrevio
  );

  const progresoIndice = indicePorUbicacion ?? calcularIndicePorHorario(segmentoActivo, progresoPrevio);
  let estadoActual = crearEstadoSegmento(segmentoActivo, progresoIndice, ubicacionUsuario);

  segmentos[segmentoActivoIndex] = {
    ...segmentoActivo,
    progresoIndice: estadoActual.progresoIndice,
    completado: estadoActual.haLlegadoDestino
  };

  if (estadoActual.haLlegadoDestino && segmentoActivoIndex < segmentos.length - 1) {
    segmentoActivoIndex += 1;

    const siguienteSegmento = segmentos[segmentoActivoIndex];
    estadoActual = crearEstadoSegmento(
      siguienteSegmento,
      siguienteSegmento.progresoIndice ?? 0,
      ubicacionUsuario
    );
  }

  const finalizado = segmentoActivoIndex === segmentos.length - 1 && estadoActual.haLlegadoDestino;

  return {
    ...trayecto,
    segmentoActivoIndex,
    segmentos,
    estadoActual,
    finalizado,
    ultimaUbicacionUsuario: ubicacionUsuario || trayecto.ultimaUbicacionUsuario || null,
    actualizadoEn: new Date().toISOString()
  };
}
