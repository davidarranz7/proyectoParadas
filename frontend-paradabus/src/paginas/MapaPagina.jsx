import { useEffect, useMemo, useState } from 'react';
import {
  BusFront,
  Clock,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  X
} from 'lucide-react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';

import { obtenerInfoBusParada } from '../servicios/infobusServicio';
import { obtenerTodasLasParadas } from '../servicios/paradasServicio';

function crearIconoParadaMapa() {
  return L.divIcon({
    className: 'marcador-mapa-general marcador-mapa-general--parada',
    html: '<span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function crearIconoParadaSeleccionada() {
  return L.divIcon({
    className: 'marcador-mapa-general marcador-mapa-general--seleccionada',
    html: '<span></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function crearIconoUsuario() {
  return L.divIcon({
    className: 'marcador-mapa-general marcador-mapa-general--usuario',
    html: '<span></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function convertirNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function normalizarParada(parada) {
  const lat = convertirNumero(
    parada.lat ??
    parada.latitud ??
    parada.latitude
  );

  const lon = convertirNumero(
    parada.lon ??
    parada.lng ??
    parada.longitud ??
    parada.longitude
  );

  if (lat === null || lon === null) {
    return null;
  }

  return {
    id: parada.id ?? parada.paradaId ?? parada.codigo ?? parada.codigoParada,
    stopId: parada.stopId ?? parada.stop_id ?? parada.gtfsStopId,
    nombre: parada.nombre ?? parada.name ?? parada.denominacion ?? 'Parada sin nombre',
    lat,
    lon
  };
}

function obtenerListaInfoBus(respuesta) {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  return (
    respuesta?.proximosBuses ||
    respuesta?.proximosBus ||
    respuesta?.proximos ||
    respuesta?.buses ||
    respuesta?.resultados ||
    respuesta?.llegadas ||
    []
  );
}

function obtenerTextoLinea(item) {
  return (
    item.linea ||
    item.codigoLinea ||
    item.nombreLinea ||
    item.routeShortName ||
    item.route_short_name ||
    'Linea'
  );
}

function obtenerTextoRuta(item) {
  return (
    item.ruta ||
    item.destino ||
    item.destinoBus ||
    item.cabecera ||
    item.nombreDestino ||
    item.tripHeadsign ||
    item.trip_headsign ||
    'Proximo bus'
  );
}

function obtenerMinutos(item) {
  const minutos =
    item.minutos ??
    item.minutosLlegada ??
    item.tiempoMinutos ??
    item.tiempoEsperaMinutos;

  const numero = Number(minutos);

  return Number.isFinite(numero) ? numero : null;
}

function obtenerTextoTiempo(item) {
  const minutos = obtenerMinutos(item);

  if (minutos !== null) {
    return `${minutos} min`;
  }

  return (
    item.tiempo ||
    item.horaLlegada ||
    item.hora ||
    item.prevision ||
    'Sin tiempo'
  );
}

function obtenerClaseMinutos(item) {
  const minutos = obtenerMinutos(item);

  if (minutos === null) {
    return 'panel-infobus__minutos';
  }

  if (minutos <= 3) {
    return 'panel-infobus__minutos panel-infobus__minutos--rojo';
  }

  if (minutos <= 5) {
    return 'panel-infobus__minutos panel-infobus__minutos--naranja';
  }

  return 'panel-infobus__minutos panel-infobus__minutos--verde';
}

function AjustarCentro({ centro, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (centro) {
      map.setView(centro, zoom);
    }
  }, [map, centro, zoom]);

  return null;
}

function MapaPagina() {
  const [paradas, setParadas] = useState([]);
  const [paradaSeleccionada, setParadaSeleccionada] = useState(null);
  const [infoBus, setInfoBus] = useState(null);
  const [cargandoParadas, setCargandoParadas] = useState(false);
  const [cargandoInfoBus, setCargandoInfoBus] = useState(false);
  const [errorParadas, setErrorParadas] = useState('');
  const [errorInfoBus, setErrorInfoBus] = useState('');
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [centrarMapa, setCentrarMapa] = useState(null);

  const centroInicial = useMemo(() => {
    return [42.232045931, -8.708603793];
  }, []);

  useEffect(() => {
    async function cargarParadas() {
      setErrorParadas('');

      try {
        setCargandoParadas(true);

        const respuesta = await obtenerTodasLasParadas();

        const paradasNormalizadas = respuesta
          .map(normalizarParada)
          .filter(Boolean);

        setParadas(paradasNormalizadas);
      } catch (error) {
        console.error('Error cargando paradas:', error);
        setErrorParadas('No se pudieron cargar las paradas.');
      } finally {
        setCargandoParadas(false);
      }
    }

    cargarParadas();
  }, []);

  async function seleccionarParada(parada) {
    setParadaSeleccionada(parada);
    setInfoBus(null);
    setErrorInfoBus('');
    setCentrarMapa([parada.lat, parada.lon]);

    if (!parada.id) {
      setErrorInfoBus('Esta parada no tiene ID de InfoBus.');
      return;
    }

    try {
      setCargandoInfoBus(true);

      const respuesta = await obtenerInfoBusParada(parada.id);
      const lista = obtenerListaInfoBus(respuesta);

      setInfoBus(lista);
    } catch (error) {
      console.error('Error cargando InfoBus:', error);
      setErrorInfoBus('No se pudo cargar InfoBus de esta parada.');
    } finally {
      setCargandoInfoBus(false);
    }
  }

  function cerrarPanelParada() {
    setParadaSeleccionada(null);
    setInfoBus(null);
    setErrorInfoBus('');
  }

  function activarMiUbicacion() {
    setErrorUbicacion('');

    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite usar ubicacion.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lat = posicion.coords.latitude;
        const lon = posicion.coords.longitude;
        const punto = [lat, lon];

        setUbicacionUsuario(punto);
        setCentrarMapa(punto);
      },
      () => {
        setErrorUbicacion('No se pudo obtener tu ubicacion. Revisa permisos del navegador.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  return (
    <section className="pagina-mapa">
      <header className="pagina-mapa__cabecera">
        <div className="pagina-mapa__headline">
          <p className="pagina-inicio__mini">Mapa</p>
          <h1>Explora paradas y tiempos en una vista tipo app.</h1>
          <p>
            Consulta todas las paradas, toca una y abre un panel estilo hoja inferior
            con los proximos buses en tiempo real.
          </p>
        </div>

        <div className="pagina-mapa__acciones-superiores">
          <div className="pagina-mapa__chips">
            <span className="chip-app chip-app--activo">InfoBus live</span>
            <span className="chip-app">Paradas completas</span>
          </div>

          <button
            type="button"
            className="boton-mi-ubicacion"
            onClick={activarMiUbicacion}
          >
            <LocateFixed size={18} />
            Mi ubicacion
          </button>
        </div>
      </header>

      <section className="pagina-mapa__resumen">
        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <MapPin size={16} />
          </div>

          <div>
            <strong>{paradas.length || '--'}</strong>
            <span>Paradas cargadas</span>
          </div>
        </article>

        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <MapPinned size={16} />
          </div>

          <div>
            <strong>{paradaSeleccionada ? paradaSeleccionada.id || 'Activa' : '--'}</strong>
            <span>Parada seleccionada</span>
          </div>
        </article>

        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <BusFront size={16} />
          </div>

          <div>
            <strong>{infoBus ? infoBus.length : '--'}</strong>
            <span>Salidas visibles</span>
          </div>
        </article>
      </section>

      {errorUbicacion && (
        <p className="mensaje-error">
          {errorUbicacion}
        </p>
      )}

      {errorParadas && (
        <p className="mensaje-error">
          {errorParadas}
        </p>
      )}

      <div className="mapa-general">
        {cargandoParadas && (
          <div className="mapa-general__estado">
            Cargando paradas...
          </div>
        )}

        {!cargandoParadas && (
          <div className="mapa-general__contador">
            {paradas.length} paradas
          </div>
        )}

        <MapContainer
          center={centroInicial}
          zoom={14}
          scrollWheelZoom
          className="mapa-general__leaflet"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {centrarMapa && (
            <AjustarCentro
              centro={centrarMapa}
              zoom={16}
            />
          )}

          {ubicacionUsuario && (
            <Marker
              position={ubicacionUsuario}
              icon={crearIconoUsuario()}
            >
              <Popup>
                <div className="popup-parada">
                  <strong>Tu ubicacion</strong>
                  <span>Ubicacion actual del dispositivo</span>
                </div>
              </Popup>
            </Marker>
          )}

          {paradas.map((parada) => {
            const seleccionada = paradaSeleccionada?.id === parada.id;

            return (
              <Marker
                key={`${parada.id}-${parada.stopId}-${parada.lat}-${parada.lon}`}
                position={[parada.lat, parada.lon]}
                icon={seleccionada ? crearIconoParadaSeleccionada() : crearIconoParadaMapa()}
                eventHandlers={{
                  click: () => seleccionarParada(parada)
                }}
              >
                <Popup>
                  <div className="popup-parada">
                    <strong>{parada.nombre}</strong>
                    <span>ID InfoBus: {parada.id || 'Sin id'}</span>
                    <span>GTFS stop_id: {parada.stopId || 'Sin stop_id'}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {paradaSeleccionada && (
          <aside className="panel-infobus">
            <button
              type="button"
              className="panel-infobus__cerrar"
              onClick={cerrarPanelParada}
              aria-label="Cerrar panel"
            >
              <X size={18} />
            </button>

            <div className="panel-infobus__cabecera">
              <div className="panel-infobus__icono">
                <BusFront size={22} />
              </div>

              <div>
                <p>Parada seleccionada</p>
                <h2>{paradaSeleccionada.nombre}</h2>
                <span>ID InfoBus: {paradaSeleccionada.id}</span>
              </div>
            </div>

            <div className="panel-infobus__acciones">
              <button
                type="button"
                onClick={() => seleccionarParada(paradaSeleccionada)}
                disabled={cargandoInfoBus}
              >
                <Navigation size={16} />
                Actualizar
              </button>
            </div>

            {cargandoInfoBus && (
              <p className="panel-infobus__mensaje">
                Cargando proximos buses...
              </p>
            )}

            {errorInfoBus && (
              <p className="panel-infobus__error">
                {errorInfoBus}
              </p>
            )}

            {infoBus && infoBus.length === 0 && (
              <p className="panel-infobus__vacio">
                No hay proximos buses disponibles ahora.
              </p>
            )}

            {infoBus && infoBus.length > 0 && (
              <div className="panel-infobus__lista">
                {infoBus.map((bus, indice) => (
                  <article
                    className="panel-infobus__item"
                    key={`${obtenerTextoLinea(bus)}-${obtenerTextoTiempo(bus)}-${indice}`}
                  >
                    <span className="panel-infobus__linea">
                      {obtenerTextoLinea(bus)}
                    </span>

                    <div className="panel-infobus__datos">
                      <strong>{obtenerTextoRuta(bus)}</strong>

                      <small>
                        <Clock size={14} />
                        Proximo bus
                      </small>
                    </div>

                    <span className={obtenerClaseMinutos(bus)}>
                      {obtenerTextoTiempo(bus)}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

export default MapaPagina;
