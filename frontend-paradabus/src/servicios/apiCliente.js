const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export async function apiGet(ruta) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!respuesta.ok) {
    const textoError = await respuesta.text();

    throw new Error(
      textoError || `Error al llamar al backend: ${respuesta.status}`
    );
  }

  return respuesta.json();
}

export { API_BASE_URL };