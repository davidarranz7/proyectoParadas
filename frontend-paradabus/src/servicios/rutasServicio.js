import { apiGet } from './apiCliente';

function crearParametrosRuta({
  origenLat,
  origenLon,
  destinoLat,
  destinoLon,
  fecha,
  hora,
  maxResultados,
  forzarTransbordos
}) {
  const parametros = new URLSearchParams();

  parametros.append('origenLat', origenLat);
  parametros.append('origenLon', origenLon);
  parametros.append('destinoLat', destinoLat);
  parametros.append('destinoLon', destinoLon);

  if (fecha) {
    parametros.append('fecha', fecha);
  }

  if (hora) {
    parametros.append('hora', hora);
  }

  if (maxResultados) {
    parametros.append('maxResultados', maxResultados);
  }

  if (forzarTransbordos) {
    parametros.append('forzarTransbordos', 'true');
  }

  return parametros.toString();
}

function crearTramoDirecto(ruta) {
  return {
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
  };
}

function normalizarRutaDirecta(ruta, indice = 0) {
  return {
    ...ruta,
    idVisual: `directa-${ruta.tripId || 'ruta'}-${ruta.paradaOrigen?.stopId || indice}`,
    esTransbordo: false,
    lineas: ruta.linea ? [ruta.linea] : [],
    lineaPrincipal: ruta.linea,
    tramoMapaInicial: crearTramoDirecto(ruta),
    tramos: [crearTramoDirecto(ruta)]
  };
}

function normalizarRutaTransbordo(ruta, indice = 0) {
  const tramos = Array.isArray(ruta.tramos) ? ruta.tramos : [];
  const primerTramo = tramos[0] || {};
  const ultimoTramo = tramos[tramos.length - 1] || primerTramo;

  return {
    ...ruta,
    idVisual: `transbordo-${primerTramo.tripId || 'ruta'}-${ultimoTramo.tripId || indice}`,
    esTransbordo: true,
    linea: primerTramo.linea || ruta.linea || 'BUS',
    lineaPrincipal: primerTramo.linea || ruta.linea || 'BUS',
    destinoBus: ultimoTramo.destinoBus || primerTramo.destinoBus || 'Destino',
    routeId: primerTramo.routeId || null,
    tripId: primerTramo.tripId || null,
    paradaOrigen: ruta.paradaOrigen || primerTramo.paradaSalida || null,
    paradaTransbordo: ruta.paradaTransbordo || primerTramo.paradaLlegada || null,
    paradaDestino: ruta.paradaDestino || ultimoTramo.paradaLlegada || null,
    horaLlegadaParada: ruta.horaLlegadaParadaOrigen || ruta.horaLlegadaParada,
    horaSalidaBus: ruta.horaSalidaPrimerBus || ruta.horaSalidaBus,
    horaLlegadaBus: ruta.horaLlegadaBusDestino || ruta.horaLlegadaBus,
    minutosEspera: ruta.minutosEsperaOrigen ?? ruta.minutosEspera ?? null,
    minutosBus: (ruta.minutosPrimerBus || 0) + (ruta.minutosSegundoBus || 0),
    lineas: tramos.map((tramo) => tramo.linea).filter(Boolean),
    tramoMapaInicial: primerTramo,
    tramos
  };
}

function compararRutas(a, b) {
  const puntuacionA = a?.puntuacion ?? Number.MAX_SAFE_INTEGER;
  const puntuacionB = b?.puntuacion ?? Number.MAX_SAFE_INTEGER;

  if (puntuacionA !== puntuacionB) {
    return puntuacionA - puntuacionB;
  }

  const minutosA = a?.minutosTotal ?? Number.MAX_SAFE_INTEGER;
  const minutosB = b?.minutosTotal ?? Number.MAX_SAFE_INTEGER;

  return minutosA - minutosB;
}

function normalizarBusquedaResultado(respuesta) {
  const directas = Array.isArray(respuesta?.directas)
    ? respuesta.directas.map(normalizarRutaDirecta)
    : [];

  const transbordos = Array.isArray(respuesta?.transbordos)
    ? respuesta.transbordos.map(normalizarRutaTransbordo)
    : [];

  const opciones = [
    ...directas,
    ...transbordos
  ]
    .sort(compararRutas)
    .map((ruta, indice) => ({
      ...ruta,
      recomendadaGlobal: indice === 0
    }));

  return {
    ...respuesta,
    directas,
    transbordos,
    opciones
  };
}

export async function buscarRutasDirectas(datosRuta) {
  const parametros = crearParametrosRuta(datosRuta);
  const respuesta = await apiGet(`/rutas/directas?${parametros}`);

  return {
    ...respuesta,
    opciones: Array.isArray(respuesta?.opciones)
      ? respuesta.opciones.map(normalizarRutaDirecta)
      : []
  };
}

export async function buscarRutasConTransbordo(datosRuta) {
  const parametros = crearParametrosRuta(datosRuta);
  const respuesta = await apiGet(`/rutas/transbordos?${parametros}`);

  return {
    ...respuesta,
    opciones: Array.isArray(respuesta?.opciones)
      ? respuesta.opciones.map(normalizarRutaTransbordo)
      : []
  };
}

export async function buscarRutas(datosRuta, opcionesBusqueda = {}) {
  const parametros = crearParametrosRuta({
    ...datosRuta,
    forzarTransbordos: opcionesBusqueda.forzarTransbordos
  });

  try {
    const respuesta = await apiGet(`/rutas/buscar?${parametros}`);
    return normalizarBusquedaResultado(respuesta);
  } catch {
    const respuestaDirecta = await buscarRutasDirectas(datosRuta);

    return {
      ...respuestaDirecta,
      totalDirectas: respuestaDirecta.opciones.length,
      totalTransbordos: 0,
      totalOpciones: respuestaDirecta.opciones.length,
      transbordosConsultados: false,
      directas: respuestaDirecta.opciones,
      transbordos: [],
      opciones: respuestaDirecta.opciones.map((ruta, indice) => ({
        ...ruta,
        recomendadaGlobal: indice === 0
      })),
      mensaje: 'Mostrando rutas directas'
    };
  }
}
