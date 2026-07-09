import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  LocateFixed,
  MapPin,
  Search,
  X
} from 'lucide-react';

const LUGARES_VIGO = [
  {
    id: 'plaza-america',
    nombre: 'Plaza América',
    descripcion: 'Zona Coia / Traviesas',
    lat: 42.22083,
    lon: -8.73544,
    tipo: 'lugar'
  },
  {
    id: 'samil',
    nombre: 'Playa de Samil',
    descripcion: 'Playa / paseo de Samil',
    lat: 42.21103,
    lon: -8.77434,
    tipo: 'lugar'
  },
  {
    id: 'balaidos',
    nombre: 'Estadio de Balaídos',
    descripcion: 'Estadio / zona Fragoso',
    lat: 42.2119,
    lon: -8.7397,
    tipo: 'lugar'
  },
  {
    id: 'vialia',
    nombre: 'Vialia Vigo',
    descripcion: 'Estación de tren / centro comercial',
    lat: 42.23476,
    lon: -8.71381,
    tipo: 'lugar'
  },
  {
    id: 'hospital-alvaro-cunqueiro',
    nombre: 'Hospital Álvaro Cunqueiro',
    descripcion: 'Hospital HAC',
    lat: 42.22364,
    lon: -8.74675,
    tipo: 'lugar'
  },
  {
    id: 'gran-via',
    nombre: 'Centro Comercial Gran Vía',
    descripcion: 'Avda. Gran Vía',
    lat: 42.22442,
    lon: -8.7281,
    tipo: 'lugar'
  },
  {
    id: 'puerta-sol',
    nombre: 'Porta do Sol',
    descripcion: 'Centro de Vigo',
    lat: 42.23716,
    lon: -8.72669,
    tipo: 'lugar'
  },
  {
    id: 'praza-espana',
    nombre: 'Plaza de España',
    descripcion: 'Centro / Gran Vía',
    lat: 42.22949,
    lon: -8.7228,
    tipo: 'lugar'
  },
  {
    id: 'avenida-europa',
    nombre: 'Avenida de Europa',
    descripcion: 'Zona Coia / Alcabre',
    lat: 42.22025,
    lon: -8.75961,
    tipo: 'lugar'
  },
  {
    id: 'universidad-vigo',
    nombre: 'Universidade de Vigo',
    descripcion: 'Campus universitario',
    lat: 42.16986,
    lon: -8.68697,
    tipo: 'lugar'
  }
];

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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
  const historialActual = obtenerHistorial(claveHistorial);

  const historialSinRepetidos = historialActual.filter(
    (item) => item.id !== lugar.id
  );

  const nuevoHistorial = [
    lugar,
    ...historialSinRepetidos
  ].slice(0, 6);

  localStorage.setItem(claveHistorial, JSON.stringify(nuevoHistorial));
}

function filtrarLugares(texto) {
  const textoNormalizado = normalizarTexto(texto);

  if (!textoNormalizado) {
    return LUGARES_VIGO.slice(0, 6);
  }

  return LUGARES_VIGO.filter((lugar) => {
    const nombre = normalizarTexto(lugar.nombre);
    const descripcion = normalizarTexto(lugar.descripcion);

    return (
      nombre.includes(textoNormalizado) ||
      descripcion.includes(textoNormalizado)
    );
  }).slice(0, 8);
}

function SelectorLugar({
  etiqueta,
  placeholder,
  valor,
  tipo = 'destino',
  onSeleccionar,
  onUsarUbicacionActual,
  onElegirEnMapa
}) {
  const contenedorRef = useRef(null);

  const [texto, setTexto] = useState(valor?.nombre || '');
  const [abierto, setAbierto] = useState(false);
  const [historial, setHistorial] = useState([]);

  const claveHistorial = `paradabus_historial_${tipo}`;

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

  const sugerencias = useMemo(() => {
    return filtrarLugares(texto);
  }, [texto]);

  function cambiarTexto(evento) {
    setTexto(evento.target.value);
    setAbierto(true);
  }

  function seleccionarLugar(lugar) {
    setTexto(lugar.nombre);
    setAbierto(false);

    guardarEnHistorial(claveHistorial, lugar);
    setHistorial(obtenerHistorial(claveHistorial));

    onSeleccionar(lugar);
  }

  function limpiarLugar() {
    setTexto('');
    setAbierto(true);
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

  const mostrarHistorial = historial.length > 0 && !texto.trim();

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

              {historial.map((lugar) => (
                <button
                  key={`historial-${lugar.id}`}
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

          <p className="selector-lugar__titulo-lista">
            Sugerencias
          </p>

          {sugerencias.length === 0 && (
            <p className="selector-lugar__sin-resultados">
              No encontramos ese lugar todavía.
            </p>
          )}

          {sugerencias.map((lugar) => (
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
        </div>
      )}
    </div>
  );
}

export default SelectorLugar;