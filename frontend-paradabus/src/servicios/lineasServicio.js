import { apiGet } from './apiCliente';

function construirQueryLinea({ directionId, tripId }) {
  const parametros = new URLSearchParams();

  if (directionId !== undefined && directionId !== null) {
    parametros.append('directionId', String(directionId));
  }

  if (tripId) {
    parametros.append('tripId', tripId);
  }

  const texto = parametros.toString();

  return texto ? `?${texto}` : '';
}

export async function obtenerLineasAgrupadas() {
  return apiGet('/gtfs/lineas/agrupadas');
}

export async function obtenerSentidosLinea(codigoLinea) {
  return apiGet(`/gtfs/lineas/${encodeURIComponent(codigoLinea)}/sentidos`);
}

export async function obtenerHorariosLinea(codigoLinea) {
  return apiGet(`/gtfs/lineas/${encodeURIComponent(codigoLinea)}/horarios`);
}

export async function obtenerRecorridoLinea({ codigoLinea, directionId, tripId }) {
  const query = construirQueryLinea({
    directionId,
    tripId
  });

  return apiGet(
    `/gtfs/lineas/${encodeURIComponent(codigoLinea)}/recorrido${query}`
  );
}

export async function obtenerRecorridoMapaLinea({ codigoLinea, directionId, tripId }) {
  const query = construirQueryLinea({
    directionId,
    tripId
  });

  return apiGet(
    `/gtfs/lineas/${encodeURIComponent(codigoLinea)}/recorrido-mapa${query}`
  );
}
