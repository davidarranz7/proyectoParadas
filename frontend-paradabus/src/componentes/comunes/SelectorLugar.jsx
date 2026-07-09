import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  LocateFixed,
  MapPin,
  Search,
  X
} from 'lucide-react';

import { buscarLugaresPorTexto } from '../../servicios/lugaresServicio';

function obtenerHistorial(claveHistorial) {
  try {
    const historialGuardado = localStorage.getItem(claveHistorial);

    if (!historialGuardado) {
      return [];
    }

    const historial = JSON.parse(historialGuardado);

    return Array.isArray(historial) ? historial : [];
  } catch {
    return [];
  }
}

function guardarEnHistorial(claveHistorial, lugar) {
  if (!lugar) {
    return;
  }

  const historialActual = obtenerHistorial(claveHistorial);

  const historialSinRepetidos = historialActual.filter((item) => {
    const mismoNombre = item.nombre === lugar.nombre;
    const mismaLat = Number(item.lat) === Number(lugar.lat);
    const mismaLon = Number(item.lon) === Number(lugar.lon);

    return !(mismoNombre && mismaLat && mismaLon);
  });

  const nuevoHistorial = [
    lugar,
    ...historialSinRepetidos
  ].slice(0, 6);

  localStorage.setItem(claveHistorial, JSON.stringify(nuevoHistorial));
}

function normalizarLugarBackend(lugar, indice) {
  return {
    id: `${lugar.fuente || 'backend'}-${lugar.lat}-${lugar.lon}-${indice}`,
    nombre: lugar.nombre,
    descripcion: lugar.direccion,
    lat: lugar.lat,
    lon: lugar.lon,
    tipo: 'lugar',
    fuente: lugar.fuente || 'backend'
  };
}

function SelectorLugar({
  etiqueta,
  placeholder,
  valor,
  tipo = 'destino',
  onSeleccionar,
  onUsarUbicacionActual,
  onElegirEnMapa,
  onTextoCambiado
}) {
  const contenedorRef = useRef(null);
  const timeoutBusquedaRef = useRef(null);

  const [texto, setTexto] = useState(valor?.nombre || '');
  const [abierto, setAbierto] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const claveHistorial = `paradabus_historial_${tipo}`;
  const textoLimpio = texto.trim();

  const mostrarHistorial = useMemo(() => {
    return historial.length > 0 && !textoLimpio;
  }, [historial, textoLimpio]);

  const mostrarSugerencias = useMemo(() => {
    return textoLimpio.length >= 2;
  }, [textoLimpio]);

  useEffect(() => {
    setTexto(valor?.nombre || '');
  }, [valor]);

  useEffect(() => {
    setHistorial(obtenerHistorial(claveHistorial));
  }, [claveHistorial]);

  useEffect(() => {
    function cerrarSiClickFuera(evento) {
      if (!contenedorRef.current) {
        return;
      }

      if (!contenedorRef.current.contains(evento.target)) {
        setAbierto(false);
      }
    }

    document.addEventListener('mousedown', cerrarSiClickFuera);

    return () => {
      document.removeEventListener('mousedown', cerrarSiClickFuera);
    };
  }, []);

  useEffect(() => {
    setErrorBusqueda('');
    setSugerencias([]);

    if (timeoutBusquedaRef.current) {
      clearTimeout(timeoutBusquedaRef.current);
    }

    if (!mostrarSugerencias) {
      setBuscandoSugerencias(false);
      return;
    }

    timeoutBusquedaRef.current = setTimeout(async () => {
      try {
        setBuscandoSugerencias(true);

        const respuesta = await buscarLugaresPorTexto(textoLimpio);

        const lugaresNormalizados = respuesta.map((lugar, indice) =>
          normalizarLugarBackend(lugar, indice)
        );

        setSugerencias(lugaresNormalizados);
      } catch {
        setErrorBusqueda('No se pudieron cargar sugerencias.');
      } finally {
        setBuscandoSugerencias(false);
      }
    }, 350);

    return () => {
      if (timeoutBusquedaRef.current) {
        clearTimeout(timeoutBusquedaRef.current);
      }
    };
  }, [textoLimpio, mostrarSugerencias]);

  function cambiarTexto(evento) {
    const nuevoTexto = evento.target.value;

    setTexto(nuevoTexto);
    setAbierto(true);
    setErrorBusqueda('');

    if (onTextoCambiado) {
      onTextoCambiado(nuevoTexto);
    }

    if (valor) {
      onSeleccionar(null);
    }
  }

  function seleccionarLugar(lugar) {
    setTexto(lugar.nombre);
    setAbierto(false);
    setErrorBusqueda('');

    guardarEnHistorial(claveHistorial, lugar);
    setHistorial(obtenerHistorial(claveHistorial));

    onSeleccionar(lugar);
  }

  function limpiarLugar() {
    setTexto('');
    setSugerencias([]);
    setErrorBusqueda('');
    setAbierto(true);

    if (onTextoCambiado) {
      onTextoCambiado('');
    }

    onSeleccionar(null);
  }

  function usarUbicacionActual() {
    setAbierto(false);

    if (onUsarUbicacionActual) {
      onUsarUbicacionActual();
    }
  }

  function elegirEnMapa() {
    setAbierto(false);

    if (onElegirEnMapa) {
      onElegirEnMapa();
    }
  }

  return (
    <div className="selector-lugar" ref={contenedorRef}>
      <label className="selector-lugar__etiqueta">
        {etiqueta}
      </label>

      <div className="selector-lugar__caja">
        <Search size={18} />

        <input
          type="text"
          value={texto}
          onChange={cambiarTexto}
          onFocus={() => setAbierto(true)}
          placeholder={placeholder}
        />

        {texto && (
          <button
            type="button"
            className="selector-lugar__limpiar"
            onClick={limpiarLugar}
            aria-label="Limpiar lugar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {abierto && (
        <div className="selector-lugar__desplegable">
          {tipo === 'origen' && (
            <button
              type="button"
              className="selector-lugar__opcion selector-lugar__opcion--accion"
              onClick={usarUbicacionActual}
            >
              <span className="selector-lugar__icono">
                <LocateFixed size={18} />
              </span>

              <span>
                <strong>Usar mi ubicación actual</strong>
                <small>Permitir ubicación exacta del dispositivo</small>
              </span>
            </button>
          )}

          <button
            type="button"
            className="selector-lugar__opcion selector-lugar__opcion--accion"
            onClick={elegirEnMapa}
          >
            <span className="selector-lugar__icono">
              <MapPin size={18} />
            </span>

            <span>
              <strong>Elegir en el mapa</strong>
              <small>Marcar un punto manualmente</small>
            </span>
          </button>

          {mostrarHistorial && (
            <>
              <p className="selector-lugar__titulo-lista">
                Búsquedas recientes
              </p>

              {historial.map((lugar, indice) => (
                <button
                  key={`historial-${lugar.id || indice}`}
                  type="button"
                  className="selector-lugar__opcion"
                  onClick={() => seleccionarLugar(lugar)}
                >
                  <span className="selector-lugar__icono">
                    <Clock size={18} />
                  </span>

                  <span>
                    <strong>{lugar.nombre}</strong>
                    <small>{lugar.descripcion}</small>
                  </span>
                </button>
              ))}
            </>
          )}

          {mostrarSugerencias && (
            <>
              <p className="selector-lugar__titulo-lista">
                Sugerencias
              </p>

              {buscandoSugerencias && (
                <p className="selector-lugar__sin-resultados">
                  Buscando lugares...
                </p>
              )}

              {!buscandoSugerencias && errorBusqueda && (
                <p className="selector-lugar__sin-resultados">
                  {errorBusqueda}
                </p>
              )}

              {!buscandoSugerencias && !errorBusqueda && sugerencias.length === 0 && (
                <p className="selector-lugar__sin-resultados">
                  No encontramos sugerencias. Puedes escribir el lugar y buscar igualmente.
                </p>
              )}

              {!buscandoSugerencias && sugerencias.map((lugar) => (
                <button
                  key={lugar.id}
                  type="button"
                  className="selector-lugar__opcion"
                  onClick={() => seleccionarLugar(lugar)}
                >
                  <span className="selector-lugar__icono">
                    <MapPin size={18} />
                  </span>

                  <span>
                    <strong>{lugar.nombre}</strong>
                    <small>{lugar.descripcion}</small>
                  </span>
                </button>
              ))}
            </>
          )}

          {!mostrarHistorial && !mostrarSugerencias && tipo !== 'origen' && (
            <p className="selector-lugar__sin-resultados">
              Escribe para buscar un lugar o elige un punto en el mapa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectorLugar;