const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function resolverRespuesta(respuesta) {
  if (!respuesta.ok) {
    const textoError = await respuesta.text();

    throw new Error(
      textoError || `Error al llamar al backend: ${respuesta.status}`
    );
  }

  if (respuesta.status === 204) {
    return null;
  }

  return respuesta.json();
}

export async function apiGet(ruta) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  return resolverRespuesta(respuesta);
}

export async function apiPost(ruta, cuerpo) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });

  return resolverRespuesta(respuesta);
}

export async function apiDelete(ruta) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json'
    }
  });

  return resolverRespuesta(respuesta);
}

export { API_BASE_URL };
