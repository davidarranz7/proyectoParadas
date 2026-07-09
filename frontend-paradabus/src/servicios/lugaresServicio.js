import { apiGet } from './apiCliente';

export async function buscarLugaresPorTexto(texto) {
  const textoLimpio = texto?.trim();

  if (!textoLimpio) {
    return [];
  }

  const parametros = new URLSearchParams({
    texto: textoLimpio
  });

  return apiGet(`/lugares/buscar?${parametros.toString()}`);
}