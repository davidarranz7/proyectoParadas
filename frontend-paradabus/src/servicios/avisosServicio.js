import { apiGet } from './apiCliente';

export async function obtenerAvisosTransporte({
  soloActivos = true,
  linea,
  paradaId,
  limite = 4
} = {}) {
  const parametros = new URLSearchParams();

  parametros.append('soloActivos', soloActivos ? 'true' : 'false');

  if (linea) {
    parametros.append('linea', linea);
  }

  if (paradaId) {
    parametros.append('paradaId', String(paradaId));
  }

  if (limite) {
    parametros.append('limite', String(limite));
  }

  return apiGet(`/avisos/transporte?${parametros.toString()}`);
}
