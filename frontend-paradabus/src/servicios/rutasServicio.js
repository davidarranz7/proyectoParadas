import { apiGet } from './apiCliente';

function crearParametrosRuta({
  origenLat,
  origenLon,
  destinoLat,
  destinoLon,
  fecha,
  hora,
  maxResultados
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

  return parametros.toString();
}

export async function buscarRutasDirectas(datosRuta) {
  const parametros = crearParametrosRuta(datosRuta);

  return apiGet(`/rutas/directas?${parametros}`);
}

export async function buscarRutasConTransbordo(datosRuta) {
  const parametros = crearParametrosRuta(datosRuta);

  return apiGet(`/rutas/transbordos?${parametros}`);
}