import { apiGet } from './apiCliente';

export async function obtenerTodasLasParadas() {
  return apiGet('/paradas');
}

export async function obtenerParadaPorId(paradaId) {
  return apiGet(`/paradas/${paradaId}`);
}

export async function buscarParadasPorNombre(texto, limite = 8) {
  const textoLimpio = texto?.trim();

  if (!textoLimpio) {
    return [];
  }

  const parametros = new URLSearchParams();
  parametros.append('buscar', textoLimpio);

  if (limite) {
    parametros.append('limite', String(limite));
  }

  return apiGet(`/paradas?${parametros.toString()}`);
}

export async function obtenerParadasCercanas({ lat, lon, radioMetros = 500 }) {
  const parametros = new URLSearchParams({
    lat,
    lon,
    radio: radioMetros
  });

  return apiGet(`/paradas/cercanas?${parametros.toString()}`);
}

export async function obtenerParadasParaMapa({
  minLat,
  maxLat,
  minLon,
  maxLon,
  buscar,
  limite
}) {
  const parametros = new URLSearchParams({
    minLat,
    maxLat,
    minLon,
    maxLon
  });

  if (buscar?.trim()) {
    parametros.append('buscar', buscar.trim());
  }

  if (limite) {
    parametros.append('limite', String(limite));
  }

  return apiGet(`/paradas/mapa?${parametros.toString()}`);
}

export async function obtenerProximosParada(paradaId) {
  if (!paradaId) {
    throw new Error('No se ha indicado el id de la parada.');
  }

  return apiGet(`/paradas/${paradaId}/proximos`);
}
