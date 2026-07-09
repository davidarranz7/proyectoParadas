import { apiGet } from './apiCliente';

export async function obtenerTodasLasParadas() {
  return apiGet('/paradas');
}

export async function obtenerParadaPorId(paradaId) {
  return apiGet(`/paradas/${paradaId}`);
}

export async function obtenerParadasCercanas({ lat, lon, radioMetros = 500 }) {
  const parametros = new URLSearchParams({
    lat,
    lon,
    radioMetros
  });

  return apiGet(`/paradas/cercanas?${parametros.toString()}`);
}