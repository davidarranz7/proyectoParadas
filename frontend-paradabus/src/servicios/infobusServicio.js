import { apiGet } from './apiCliente';

export async function obtenerInfoBusParada(paradaId) {
  if (!paradaId) {
    throw new Error('No se ha indicado el id de la parada.');
  }

  return apiGet(`/paradas/${paradaId}/proximos`);
}
