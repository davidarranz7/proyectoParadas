import { apiGet } from './apiCliente';

export async function obtenerParadasTrip({
  tripId,
  stopOrigen,
  stopDestino
}) {
  if (!tripId) {
    throw new Error('No se ha indicado el tripId.');
  }

  const parametros = new URLSearchParams();

  if (stopOrigen) {
    parametros.append('stopOrigen', stopOrigen);
  }

  if (stopDestino) {
    parametros.append('stopDestino', stopDestino);
  }

  const query = parametros.toString();

  return apiGet(
    `/rutas/trips/${encodeURIComponent(tripId)}/paradas${query ? `?${query}` : ''}`
  );
}