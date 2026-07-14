import { useEffect, useMemo, useState } from 'react';
import {
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X
} from 'lucide-react';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';

import { buscarLugaresPorTexto } from '../../servicios/lugaresServicio';

function crearIconoSeleccion() {
  return L.divIcon({
    className: 'marcador-mapa marcador-mapa--destino',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function CapturadorMapa({ onSeleccionar }) {
  useMapEvents({
    click(evento) {
      onSeleccionar({
        lat: evento.latlng.lat,
        lon: evento.latlng.lng
      });
    }
  });

  return null;
}

function EnfocarMapa({ punto }) {
  const map = useMap();

  useEffect(() => {
    if (!punto) {
      return;
    }

    map.flyTo([punto.lat, punto.lon], 16, {
      duration: 0.7
    });
  }, [map, punto]);

  return null;
}

function formatearCoordenadas(valor) {
  if (!Number.isFinite(valor)) {
    return '--';
  }

  return valor.toFixed(5);
}

function normalizarLugarBusqueda(lugar, indice) {
  return {
    id: `${lugar.fuente || 'mapa'}-${lugar.lat}-${lugar.lon}-${indice}`,
    nombre: lugar.nombre || 'Lugar',
    direccion: lugar.direccion || 'Ubicacion seleccionada',
    lat: Number(lugar.lat),
    lon: Number(lugar.lon)
  };
}

function MapaLugarModal({
  tipo = 'destino',
  valorInicial = null,
  onCerrar,
  onConfirmar,
  onUsarMiUbicacion
}) {
  const centroInicial = useMemo(() => {
    if (valorInicial?.lat && valorInicial?.lon) {
      return [Number(valorInicial.lat), Number(valorInicial.lon)];
    }

    return [42.232045931, -8.708603793];
  }, [valorInicial]);

  const [textoBusqueda, setTextoBusqueda] = useState(valorInicial?.nombre || '');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(
    valorInicial?.lat && valorInicial?.lon
      ? {
        lat: Number(valorInicial.lat),
        lon: Number(valorInicial.lon)
      }
      : null
  );
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(
    valorInicial
      ? {
        nombre: valorInicial.nombre || (tipo === 'origen' ? 'Origen en mapa' : 'Destino en mapa'),
        direccion: valorInicial.direccion || ''
      }
      : null
  );
  const [puntoEnfocado, setPuntoEnfocado] = useState(
    valorInicial?.lat && valorInicial?.lon
      ? {
        lat: Number(valorInicial.lat),
        lon: Number(valorInicial.lon)
      }
      : null
  );

  useEffect(() => {
    const textoLimpio = textoBusqueda.trim();

    if (textoLimpio.length < 2) {
      setSugerencias([]);
      setBuscando(false);
      setErrorBusqueda('');
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setBuscando(true);
        setErrorBusqueda('');

        const respuesta = await buscarLugaresPorTexto(textoLimpio);

        setSugerencias(
          respuesta.map((lugar, indice) => normalizarLugarBusqueda(lugar, indice))
        );
      } catch {
        setErrorBusqueda('No se pudieron cargar resultados en el mapa.');
      } finally {
        setBuscando(false);
      }
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [textoBusqueda]);

  function seleccionarPuntoMapa(punto) {
    setPuntoSeleccionado(punto);
    setPuntoEnfocado(punto);
    setDetalleSeleccionado({
      nombre: tipo === 'origen' ? 'Origen en mapa' : 'Destino en mapa',
      direccion: `Lat ${formatearCoordenadas(punto.lat)}, Lon ${formatearCoordenadas(punto.lon)}`
    });
  }

  function seleccionarSugerencia(lugar) {
    const punto = {
      lat: Number(lugar.lat),
      lon: Number(lugar.lon)
    };

    setTextoBusqueda(lugar.nombre);
    setPuntoSeleccionado(punto);
    setPuntoEnfocado(punto);
    setDetalleSeleccionado({
      nombre: lugar.nombre,
      direccion: lugar.direccion
    });
    setSugerencias([]);
  }

  function confirmarSeleccion() {
    if (!puntoSeleccionado) {
      return;
    }

    onConfirmar({
      nombre: detalleSeleccionado?.nombre || (tipo === 'origen' ? 'Origen en mapa' : 'Destino en mapa'),
      direccion: detalleSeleccionado?.direccion || `Lat ${formatearCoordenadas(puntoSeleccionado.lat)}, Lon ${formatearCoordenadas(puntoSeleccionado.lon)}`,
      lat: puntoSeleccionado.lat,
      lon: puntoSeleccionado.lon,
      fuente: 'MAPA'
    });
  }

  return (
    <div className="modal-mapa-lugar">
      <div className="modal-mapa-lugar__fondo" onClick={onCerrar} />

      <div className="modal-mapa-lugar__panel">
        <div className="modal-mapa-lugar__cabecera">
          <div>
            <p className="pagina-inicio__mini">Seleccion manual</p>
            <h2>{tipo === 'origen' ? 'Elige tu origen en el mapa' : 'Elige tu destino en el mapa'}</h2>
            <p>
              Puedes buscar una direccion o tocar directamente el mapa para fijar el punto.
            </p>
          </div>

          <button
            type="button"
            className="modal-mapa-lugar__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar selector en mapa"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-mapa-lugar__buscador">
          <div className="modal-mapa-lugar__campo">
            <Search size={17} />

            <input
              type="text"
              value={textoBusqueda}
              onChange={(evento) => setTextoBusqueda(evento.target.value)}
              placeholder={tipo === 'origen' ? 'Buscar origen en el mapa' : 'Buscar destino en el mapa'}
              autoComplete="off"
            />

            {buscando && <Loader2 className="icono-girando" size={16} />}
          </div>

          {(sugerencias.length > 0 || errorBusqueda) && (
            <div className="modal-mapa-lugar__sugerencias">
              {errorBusqueda && (
                <p className="modal-mapa-lugar__estado">
                  {errorBusqueda}
                </p>
              )}

              {!errorBusqueda && sugerencias.map((lugar) => (
                <button
                  key={lugar.id}
                  type="button"
                  className="modal-mapa-lugar__sugerencia"
                  onClick={() => seleccionarSugerencia(lugar)}
                >
                  <MapPin size={16} />

                  <span>
                    <strong>{lugar.nombre}</strong>
                    <small>{lugar.direccion}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-mapa-lugar__mapa">
          <MapContainer
            center={centroInicial}
            zoom={14}
            scrollWheelZoom
            className="modal-mapa-lugar__leaflet"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <CapturadorMapa onSeleccionar={seleccionarPuntoMapa} />
            <EnfocarMapa punto={puntoEnfocado} />

            {puntoSeleccionado && (
              <Marker
                position={[puntoSeleccionado.lat, puntoSeleccionado.lon]}
                icon={crearIconoSeleccion()}
              />
            )}
          </MapContainer>
        </div>

        <div className="modal-mapa-lugar__pie">
          <div className="modal-mapa-lugar__resumen">
            <MapPin size={16} />
            <span>
              {puntoSeleccionado
                ? `${detalleSeleccionado?.nombre || 'Punto seleccionado'} - Lat ${formatearCoordenadas(puntoSeleccionado.lat)} - Lon ${formatearCoordenadas(puntoSeleccionado.lon)}`
                : 'Busca una direccion o toca en el mapa para elegir un punto'}
            </span>
          </div>

          <div className="modal-mapa-lugar__acciones">
            {tipo === 'origen' && (
              <button
                type="button"
                className="boton-ubicacion-ruta"
                onClick={onUsarMiUbicacion}
              >
                <Crosshair size={17} />
                Mi ubicacion
              </button>
            )}

            <button
              type="button"
              className="boton-buscar-ruta"
              onClick={confirmarSeleccion}
              disabled={!puntoSeleccionado}
            >
              <Navigation size={17} />
              Confirmar punto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapaLugarModal;
