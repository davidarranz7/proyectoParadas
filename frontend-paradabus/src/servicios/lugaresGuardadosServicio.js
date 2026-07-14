const CLAVE_LUGARES_GUARDADOS = 'paradabus_lugares_guardados_v1';

function leerLugaresGuardados() {
  try {
    const texto = localStorage.getItem(CLAVE_LUGARES_GUARDADOS);

    if (!texto) {
      return {};
    }

    const datos = JSON.parse(texto);

    return typeof datos === 'object' && datos !== null ? datos : {};
  } catch {
    return {};
  }
}

function guardarLugares(datos) {
  localStorage.setItem(CLAVE_LUGARES_GUARDADOS, JSON.stringify(datos));
}

export function obtenerLugaresGuardados() {
  return leerLugaresGuardados();
}

export function guardarLugarGuardado(clave, lugar) {
  if (!clave || !lugar) {
    return obtenerLugaresGuardados();
  }

  const lugares = leerLugaresGuardados();
  const actualizados = {
    ...lugares,
    [clave]: {
      ...lugar,
      etiquetaGuardada: clave,
      fechaGuardado: new Date().toISOString()
    }
  };

  guardarLugares(actualizados);

  return actualizados;
}

export function eliminarLugarGuardado(clave) {
  const lugares = leerLugaresGuardados();

  delete lugares[clave];
  guardarLugares(lugares);

  return lugares;
}
