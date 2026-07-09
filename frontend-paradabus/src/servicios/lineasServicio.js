import { apiGet } from './apiCliente';

export async function obtenerRecorridoMapaLinea({ codigoLinea, tripId }) {
  const parametros = new URLSearchParams();

  if (tripId) {
    parametros.append('tripId', tripId);
  }

  return apiGet(
    `/gtfs/lineas/${encodeURIComponent(codigoLinea)}/recorrido-mapa?${parametros.toString()}`
  );
}