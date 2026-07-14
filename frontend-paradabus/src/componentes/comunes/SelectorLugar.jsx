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
  lugaresGuardados = {},
  onSeleccionar,
  onUsarUbicacionActual,
  onElegirEnMapa,
  onTextoCambiado,
  onGuardarLugarGuardado
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

  const lugaresRapidos = useMemo(() => {
    return [
      {
        id: 'casa',
        etiqueta: 'Casa',
        lugar: lugaresGuardados?.casa || null
      },
      {
        id: 'trabajo',
        etiqueta: 'Trabajo',
        lugar: lugaresGuardados?.trabajo || null
      }
    ].filter((item) => item.lugar);
  }, [lugaresGuardados]);

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

  async function cargarSugerencias(textoBusqueda) {
    const textoBusquedaLimpio = textoBusqueda.trim();

    if (textoBusquedaLimpio.length < 2) {
      setSugerencias([]);
      setBuscandoSugerencias(false);
      return [];
    }

    try {
      setErrorBusqueda('');
      setBuscandoSugerencias(true);

      const respuesta = await buscarLugaresPorTexto(textoBusquedaLimpio);

      const lugaresNormalizados = respuesta.map((lugar, indice) =>
        normalizarLugarBackend(lugar, indice)
      );

      setSugerencias(lugaresNormalizados);

      return lugaresNormalizados;
    } catch {
      setErrorBusqueda('No se pudieron cargar sugerencias.');
      return [];
    } finally {
      setBuscandoSugerencias(false);
    }
  }

  useEffect(() => {
    setErrorBusqueda('');
    setSugerencias([]);

    if (timeoutBusquedaRef.current) {
      clearTimeout(timeoutBusquedaRef.current);
    }

    if (!abierto || !mostrarSugerencias) {
      setBuscandoSugerencias(false);
      return;
    }

    timeoutBusquedaRef.current = setTimeout(() => {
      cargarSugerencias(textoLimpio);
    }, 350);

    return () => {
      if (timeoutBusquedaRef.current) {
        clearTimeout(timeoutBusquedaRef.current);
      }
    };
  }, [abierto, textoLimpio, mostrarSugerencias]);

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

  async function confirmarTextoConEnter() {
    const textoConfirmar = texto.trim();

    if (!textoConfirmar) {
      setAbierto(false);
      return;
    }

    if (sugerencias.length > 0) {
      seleccionarLugar(sugerencias[0]);
      return;
    }

    const lugaresEncontrados = await cargarSugerencias(textoConfirmar);

    if (lugaresEncontrados.length > 0) {
      seleccionarLugar(lugaresEncontrados[0]);
      return;
    }

    setAbierto(false);
  }

  function manejarTecla(evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      confirmarTextoConEnter();
      return;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      setAbierto(false);
    }
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
          onKeyDown={manejarTecla}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={abierto}
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

      {valor && onGuardarLugarGuardado && (
        <div className="selector-lugar__guardado">
          <button
            type="button"
            className="selector-lugar__guardar"
            onClick={() => onGuardarLugarGuardado('casa', valor)}
          >
            Guardar como Casa
          </button>

          <button
            type="button"
            className="selector-lugar__guardar"
            onClick={() => onGuardarLugarGuardado('trabajo', valor)}
          >
            Guardar como Trabajo
          </button>
        </div>
      )}

      {abierto && (
        <div className="selector-lugar__desplegable">
          {lugaresRapidos.length > 0 && (
            <>
              <p className="selector-lugar__titulo-lista">
                Guardados
              </p>

              {lugaresRapidos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="selector-lugar__opcion selector-lugar__opcion--accion"
                  onClick={() => seleccionarLugar(item.lugar)}
                >
                  <span className="selector-lugar__icono">
                    <MapPin size={18} />
                  </span>

                  <span>
                    <strong>{item.etiqueta}</strong>
                    <small>{item.lugar?.nombre || item.lugar?.direccion}</small>
                  </span>
                </button>
              ))}
            </>
          )}

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
                <strong>Usar mi ubicacion actual</strong>
                <small>Permitir ubicacion exacta del dispositivo</small>
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
                Busquedas recientes
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
                  Pulsa Enter para buscar y seleccionar automaticamente.
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
