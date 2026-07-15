import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BusFront,
  Clock,
  Crosshair,
  LocateFixed,
  MapPin,
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

import BotonAyuda from '../componentes/comunes/BotonAyuda';
import BandaAvisosServicio from '../componentes/comunes/BandaAvisosServicio';
import MensajeError from '../componentes/comunes/MensajeError';
import OverlayCarga from '../componentes/comunes/OverlayCarga';
import PanelInfoBus from '../componentes/mapa/PanelInfoBus';
import {
  buscarParadasPorNombre,
  obtenerParadasCercanas,
  obtenerParadasParaMapa,
  obtenerProximosParada
} from '../servicios/paradasServicio';

const CENTRO_VIGO = [42.232045931, -8.708603793];
const ZOOM_MINIMO_PARADAS = 14;

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

const ICONO_PARADA = crearIconoParadaMapa();
const ICONO_PARADA_SELECCIONADA = crearIconoParadaSeleccionada();
const ICONO_USUARIO = crearIconoUsuario();

function normalizarParada(parada) {
  const lat = Number(parada?.lat);
  const lon = Number(parada?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    id: parada.id ?? parada.paradaId,
    stopId: parada.stopId ?? parada.stop_id,
    nombre: parada.nombre || 'Parada',
    lat,
    lon,
    lineasOriginal: parada.lineasOriginal || '',
    distanciaMetros: parada.distanciaMetros ?? null
  };
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
  const numero = Number(
    item.minutos ??
    item.minutosLlegada ??
    item.tiempoMinutos ??
    item.tiempoEsperaMinutos
  );

  return Number.isFinite(numero) ? numero : null;
}

function obtenerTextoTiempo(item) {
  const minutos = obtenerMinutos(item);

  if (minutos !== null) {
    return `${minutos} min`;
  }

  return item.tiempo || item.horaLlegada || item.hora || item.prevision || 'Sin tiempo';
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

function calcularLimitePorZoom(zoom) {
  if (zoom >= 17) {
    return 240;
  }

  if (zoom >= 16) {
    return 180;
  }

  if (zoom >= 15) {
    return 120;
  }

  return 80;
}

function GestorMapa({
  objetivoMapa,
  onCambiarViewport
}) {
  const map = useMap();

  function emitirViewport() {
    const bounds = map.getBounds();

    onCambiarViewport({
      zoom: map.getZoom(),
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLon: bounds.getWest(),
      maxLon: bounds.getEast()
    });
  }

  useEffect(() => {
    emitirViewport();
  }, []);

  useEffect(() => {
    if (!objetivoMapa) {
      return;
    }

    map.flyTo(objetivoMapa.centro, objetivoMapa.zoom ?? 16, {
      duration: 0.6
    });
  }, [map, objetivoMapa]);

  useMapEvents({
    moveend: emitirViewport,
    zoomend: emitirViewport
  });

  return null;
}

function MapaPagina() {
  const [viewportMapa, setViewportMapa] = useState(null);
  const [objetivoMapa, setObjetivoMapa] = useState(null);
  const [paradasVisibles, setParadasVisibles] = useState([]);
  const [paradasCercanas, setParadasCercanas] = useState([]);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [paradaSeleccionada, setParadaSeleccionada] = useState(null);
  const [proximosBuses, setProximosBuses] = useState([]);
  const [resumenMapa, setResumenMapa] = useState({
    totalParadas: 0,
    totalDevueltas: 0,
    limite: 0,
    zoomMinimoRecomendado: ZOOM_MINIMO_PARADAS
  });
  const [cargandoMapa, setCargandoMapa] = useState(false);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cargandoCercanas, setCargandoCercanas] = useState(false);
  const [cargandoProximos, setCargandoProximos] = useState(false);
  const [errorMapa, setErrorMapa] = useState('');
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const [errorProximos, setErrorProximos] = useState('');
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const debounceViewportRef = useRef(null);
  const debounceBusquedaRef = useRef(null);
  const busquedaActiva = textoBusqueda.trim();

  const totalBuses = proximosBuses.length;
  const zoomActual = viewportMapa?.zoom || 14;
  const mapaLigero = zoomActual < ZOOM_MINIMO_PARADAS && !paradaSeleccionada;
  const sinResultadosBusqueda = busquedaActiva.length >= 2 && !cargandoBusqueda && resultadosBusqueda.length === 0;

  async function abrirParada(parada, centrar = true) {
    setParadaSeleccionada(parada);
    setErrorProximos('');
    setProximosBuses([]);

    if (centrar) {
      setObjetivoMapa({
        centro: [parada.lat, parada.lon],
        zoom: Math.max(16, zoomActual)
      });
    }

    try {
      setCargandoProximos(true);

      const respuesta = await obtenerProximosParada(parada.id);
      setProximosBuses(respuesta?.proximosBuses || []);
    } catch (error) {
      setErrorProximos(error.message || 'No se pudieron cargar los proximos buses.');
    } finally {
      setCargandoProximos(false);
    }
  }

  function cerrarParada() {
    setParadaSeleccionada(null);
    setProximosBuses([]);
    setErrorProximos('');
  }

  function activarMiUbicacion() {
    setErrorUbicacion('');

    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite usar ubicacion.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const punto = [posicion.coords.latitude, posicion.coords.longitude];

        setUbicacionUsuario(punto);
        setObjetivoMapa({
          centro: punto,
          zoom: 16
        });

        try {
          setCargandoCercanas(true);
          const respuesta = await obtenerParadasCercanas({
            lat: punto[0],
            lon: punto[1],
            radioMetros: 450
          });

          setParadasCercanas(
            (respuesta || [])
              .map(normalizarParada)
              .filter(Boolean)
              .slice(0, 6)
          );
        } catch {
          setParadasCercanas([]);
          setErrorUbicacion('No se pudieron cargar las paradas cercanas en este momento.');
        } finally {
          setCargandoCercanas(false);
        }
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

  useEffect(() => {
    if (!viewportMapa) {
      return undefined;
    }

    if (viewportMapa.zoom < ZOOM_MINIMO_PARADAS) {
      setParadasVisibles([]);
      setResumenMapa((actual) => ({
        ...actual,
        totalParadas: 0,
        totalDevueltas: 0
      }));
      setErrorMapa('');
      return undefined;
    }

    if (debounceViewportRef.current) {
      window.clearTimeout(debounceViewportRef.current);
    }

    debounceViewportRef.current = window.setTimeout(async () => {
      try {
        setCargandoMapa(true);
        setErrorMapa('');

        const respuesta = await obtenerParadasParaMapa({
          minLat: viewportMapa.minLat,
          maxLat: viewportMapa.maxLat,
          minLon: viewportMapa.minLon,
          maxLon: viewportMapa.maxLon,
          limite: calcularLimitePorZoom(viewportMapa.zoom)
        });

        setParadasVisibles(
          (respuesta?.paradas || [])
            .map(normalizarParada)
            .filter(Boolean)
        );
        setResumenMapa({
          totalParadas: respuesta?.totalParadas || 0,
          totalDevueltas: respuesta?.totalDevueltas || 0,
          limite: respuesta?.limite || 0,
          zoomMinimoRecomendado: respuesta?.zoomMinimoRecomendado || ZOOM_MINIMO_PARADAS
        });
      } catch (error) {
        setParadasVisibles([]);
        setErrorMapa(error.message || 'No se pudieron cargar las paradas del mapa.');
      } finally {
        setCargandoMapa(false);
      }
    }, 220);

    return () => {
      if (debounceViewportRef.current) {
        window.clearTimeout(debounceViewportRef.current);
      }
    };
  }, [viewportMapa]);

  useEffect(() => {
    if (!busquedaActiva || busquedaActiva.length < 2) {
      setResultadosBusqueda([]);
      setCargandoBusqueda(false);
      return undefined;
    }

    if (debounceBusquedaRef.current) {
      window.clearTimeout(debounceBusquedaRef.current);
    }

    debounceBusquedaRef.current = window.setTimeout(async () => {
      try {
        setCargandoBusqueda(true);

        const respuesta = await buscarParadasPorNombre(busquedaActiva, 8);

        setResultadosBusqueda(
          (respuesta || [])
            .map(normalizarParada)
            .filter(Boolean)
        );
      } catch {
        setResultadosBusqueda([]);
      } finally {
        setCargandoBusqueda(false);
      }
    }, 240);

    return () => {
      if (debounceBusquedaRef.current) {
        window.clearTimeout(debounceBusquedaRef.current);
      }
    };
  }, [busquedaActiva]);

  const paradasRenderizadas = useMemo(() => {
    if (!paradaSeleccionada) {
      return paradasVisibles;
    }

    return paradasVisibles.filter((parada) => parada.id !== paradaSeleccionada.id);
  }, [paradaSeleccionada, paradasVisibles]);

  return (
    <section className="pagina-mapa">
      <header className="pagina-mapa__cabecera">
        <div className="pagina-mapa__headline">
          <p className="pagina-inicio__mini">Mapa</p>
          <div className="cabecera-con-ayuda">
            <h1>Ver paradas</h1>
            <BotonAyuda texto="Pulsa una parada para ver proximos buses." />
          </div>
          <p>
            Las paradas se cargan por zona para que el mapa vaya fluido.
          </p>
        </div>

        <div className="pagina-mapa__acciones-superiores">
          <div className="pagina-mapa__chips">
            <span className="chip-app chip-app--activo">Zona visible</span>
            <span className="chip-app">Cerca de mi</span>
            <span className="chip-app">InfoBus</span>
          </div>

          <button
            type="button"
            className="boton-mi-ubicacion"
            onClick={activarMiUbicacion}
          >
            <LocateFixed size={18} />
            Cerca de mi
          </button>
        </div>
      </header>

      <BandaAvisosServicio paradaId={paradaSeleccionada?.id} mostrarVacio={false} />

      <section className="pagina-mapa__resumen">
        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <MapPin size={16} />
          </div>

          <div>
            <strong>{resumenMapa.totalParadas}</strong>
            <span>Paradas en la zona visible</span>
          </div>
        </article>

        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <Crosshair size={16} />
          </div>

          <div>
            <strong>{paradasCercanas.length}</strong>
            <span>Paradas cercanas</span>
          </div>
        </article>

        <article className="pagina-mapa__dato">
          <div className="pagina-mapa__dato-icono">
            <BusFront size={16} />
          </div>

          <div>
            <strong>{totalBuses}</strong>
            <span>Salidas de la parada activa</span>
          </div>
        </article>
      </section>

      <MensajeError>{errorUbicacion}</MensajeError>

      <MensajeError>{errorMapa}</MensajeError>

      <div className="mapa-general">
        <OverlayCarga
          visible={cargandoMapa && !mapaLigero}
          compacto
          texto="Cargando paradas..."
          subtexto="Solo se cargan las visibles para mantener el mapa ligero."
        />

        <div className="mapa-general__buscador">
          <div className="mapa-general__campo">
            <Search size={16} />
            <input
              type="text"
              value={textoBusqueda}
              onChange={(evento) => setTextoBusqueda(evento.target.value)}
              placeholder="Buscar parada"
            />
            {textoBusqueda && (
              <button
                type="button"
                className="mapa-general__limpiar"
                onClick={() => {
                  setTextoBusqueda('');
                  setResultadosBusqueda([]);
                }}
                aria-label="Limpiar busqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {(cargandoBusqueda || resultadosBusqueda.length > 0 || sinResultadosBusqueda) && (
            <div className="mapa-general__resultados">
              {cargandoBusqueda && (
                <p className="mapa-general__estado-busqueda">
                  Buscando paradas...
                </p>
              )}

              {sinResultadosBusqueda && (
                <p className="mapa-general__estado-busqueda">
                  No se han encontrado paradas con ese nombre.
                </p>
              )}

              {!cargandoBusqueda && resultadosBusqueda.map((parada) => (
                <button
                  key={`busqueda-${parada.id}-${parada.stopId}`}
                  type="button"
                  className="mapa-general__resultado"
                  onClick={() => {
                    setTextoBusqueda('');
                    setResultadosBusqueda([]);
                    abrirParada(parada);
                  }}
                >
                  <strong>{parada.nombre}</strong>
                  <span>{parada.lineasOriginal || 'Parada urbana'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {mapaLigero && (
          <div className="mapa-general__overlay-zoom">
            Acerca el mapa hasta zoom {resumenMapa.zoomMinimoRecomendado || ZOOM_MINIMO_PARADAS} para mostrar paradas y mantener la navegacion fluida.
          </div>
        )}

        {!cargandoMapa && !mapaLigero && (
          <div className="mapa-general__contador">
            {resumenMapa.totalDevueltas} visibles
            {resumenMapa.totalParadas > resumenMapa.totalDevueltas ? ` de ${resumenMapa.totalParadas}` : ''}
          </div>
        )}

        {paradasCercanas.length > 0 && !paradaSeleccionada && (
          <div className="mapa-general__cercanas">
            <div className="mapa-general__cercanas-cabecera">
              <strong>Paradas cerca de ti</strong>
              {cargandoCercanas && <span>Actualizando...</span>}
            </div>

            <div className="mapa-general__cercanas-lista">
              {paradasCercanas.map((parada) => (
                <button
                  key={`cercana-${parada.id}-${parada.stopId}`}
                  type="button"
                  className="mapa-general__cercana"
                  onClick={() => abrirParada(parada)}
                >
                  <strong>{parada.nombre}</strong>
                  <span>
                    {parada.distanciaMetros ? `${Math.round(parada.distanciaMetros)} m` : 'Parada cercana'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <MapContainer
          center={CENTRO_VIGO}
          zoom={14}
          scrollWheelZoom
          className="mapa-general__leaflet"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <GestorMapa
            objetivoMapa={objetivoMapa}
            onCambiarViewport={setViewportMapa}
          />

          {ubicacionUsuario && (
            <Marker
              position={ubicacionUsuario}
              icon={ICONO_USUARIO}
            />
          )}

          {paradasRenderizadas.map((parada) => (
            <Marker
              key={`${parada.id}-${parada.stopId}-${parada.lat}-${parada.lon}`}
              position={[parada.lat, parada.lon]}
              icon={ICONO_PARADA}
              eventHandlers={{
                click: () => abrirParada(parada, false)
              }}
            />
          ))}

          {paradaSeleccionada && (
            <Marker
              position={[paradaSeleccionada.lat, paradaSeleccionada.lon]}
              icon={ICONO_PARADA_SELECCIONADA}
              eventHandlers={{
                click: () => abrirParada(paradaSeleccionada, false)
              }}
            />
          )}
        </MapContainer>

        {paradaSeleccionada && (
          <PanelInfoBus
            parada={paradaSeleccionada}
            buses={proximosBuses}
            cargando={cargandoProximos}
            error={errorProximos}
            onActualizar={() => abrirParada(paradaSeleccionada, false)}
            onCerrar={cerrarParada}
          />
        )}
      </div>
    </section>
  );
}

export default MapaPagina;
