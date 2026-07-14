import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  BusFront,
  Clock3,
  Footprints,
  LocateFixed,
  Loader2,
  MapPinned,
  Navigation,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  X
} from 'lucide-react';

import SelectorLugar from '../componentes/comunes/SelectorLugar';
import MapaRuta from '../componentes/mapa/MapaRuta';
import { buscarRutas } from '../servicios/rutasServicio';

function obtenerFechaActual() {
  return new Date().toISOString().slice(0, 10);
}

function obtenerHoraActual() {
  const fecha = new Date();
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');

  return `${horas}:${minutos}:${segundos}`;
}

function obtenerNombreLugar(lugar) {
  return lugar?.nombre || lugar?.displayName || lugar?.direccion || 'Lugar seleccionado';
}

function obtenerOpcionesRespuesta(respuesta) {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  if (Array.isArray(respuesta?.opciones)) {
    return respuesta.opciones;
  }

  if (Array.isArray(respuesta?.rutas)) {
    return respuesta.rutas;
  }

  if (Array.isArray(respuesta?.resultados)) {
    return respuesta.resultados;
  }

  return [];
}

function obtenerMinutosInfoBus(ruta) {
  const posiblesValores = [
    ruta?.minutosInfoBus,
    ruta?.minutosTiempoReal,
    ruta?.minutosEsperaReal,
    ruta?.minutosEspera,
    ruta?.siguientesSalidas?.[0]?.minutos,
    ruta?.siguientesSalidas?.[0]?.minutosHastaSalida
  ];

  const valor = posiblesValores.find((item) => item !== undefined && item !== null);

  if (valor === undefined || valor === null || Number.isNaN(Number(valor))) {
    return null;
  }

  return Number(valor);
}

function obtenerClaseMinutos(minutos) {
  if (minutos === null || minutos === undefined) {
    return 'tiempo-real--gris';
  }

  if (minutos <= 3) {
    return 'tiempo-real--rojo';
  }

  if (minutos <= 5) {
    return 'tiempo-real--naranja';
  }

  return 'tiempo-real--verde';
}

function obtenerTextoHora(hora) {
  if (!hora) {
    return '--:--';
  }

  return String(hora).slice(0, 5);
}

function obtenerLineaRuta(ruta) {
  return ruta?.linea || ruta?.codigoLinea || ruta?.routeShortName || 'BUS';
}

function obtenerTipoRuta(ruta) {
  if (ruta?.transbordos && ruta.transbordos > 0) {
    return `${ruta.transbordos} transbordo${ruta.transbordos > 1 ? 's' : ''}`;
  }

  if (String(ruta?.tipo || '').toUpperCase().includes('TRANSBORDO')) {
    return 'Con transbordo';
  }

  return 'Directa';
}

function obtenerNombreParada(parada, respaldo) {
  return parada?.nombre || parada?.stopName || respaldo;
}

function formatearMinutos(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '--';
  }

  return `${Number(valor)} min`;
}

function formatearMetros(metros) {
  if (!metros && metros !== 0) {
    return null;
  }

  if (metros >= 1000) {
    return `${(metros / 1000).toFixed(1)} km`;
  }

  return `${Math.round(metros)} m`;
}

function TarjetaRuta({ ruta, activa, indice, onSeleccionar }) {
  const minutosInfoBus = obtenerMinutosInfoBus(ruta);
  const claseMinutos = obtenerClaseMinutos(minutosInfoBus);
  const linea = obtenerLineaRuta(ruta);
  const tipoRuta = obtenerTipoRuta(ruta);
  const caminata = ruta?.distanciaAndandoTotalMetros
    ? formatearMetros(ruta.distanciaAndandoTotalMetros)
    : null;
  const paradaSubida = obtenerNombreParada(ruta?.paradaOrigen, 'Parada de subida');
  const paradaBajada = obtenerNombreParada(ruta?.paradaDestino, 'Parada de bajada');

  return (
    <button
      type="button"
      className={
        activa
          ? 'tarjeta-ruta tarjeta-ruta--activa'
          : 'tarjeta-ruta'
      }
      onClick={onSeleccionar}
    >
      {indice === 0 && (
        <span className="tarjeta-ruta__badge">
          Mejor opcion
        </span>
      )}

      <div className="tarjeta-ruta__superior">
        <div className="tarjeta-ruta__encabezado">
          <span className="linea-bus-pill">
            {linea}
          </span>

          <div className="tarjeta-ruta__encabezado-texto">
            <strong>{tipoRuta}</strong>
            <span>
              {paradaSubida} <ArrowRight size={14} /> {paradaBajada}
            </span>
          </div>
        </div>

        <div className={`tiempo-real ${claseMinutos}`}>
          <span>{minutosInfoBus ?? '--'}</span>
          <small>min</small>
        </div>
      </div>

      <div className="tarjeta-ruta__tiempo-principal">
        <BusFront size={20} />
        <strong>{ruta?.minutosTotal ?? '--'}</strong>
        <span>min de viaje total</span>
      </div>

      <div className="tarjeta-ruta__linea">
        <span className="tarjeta-ruta__tipo">
          {ruta?.resumen || 'Trayecto listo para seguir paso a paso'}
        </span>

        {caminata && (
          <span className="tarjeta-ruta__dato">
            <Footprints size={14} />
            {caminata}
          </span>
        )}
      </div>

      <div className="tarjeta-ruta__datos-grid">
        <span>
          <Clock3 size={14} />
          Sale {obtenerTextoHora(ruta?.horaSalidaBus || ruta?.horaInicioRuta)}
        </span>

        <span>
          <MapPinned size={14} />
          Llega {obtenerTextoHora(ruta?.horaLlegadaFinal || ruta?.horaLlegadaBus)}
        </span>

        <span>
          <Navigation size={14} />
          {formatearMinutos(ruta?.minutosBus)}
        </span>
      </div>
    </button>
  );
}

function EstadoVacioRutas() {
  return (
    <div className="estado-rutas-vacio">
      <div className="estado-rutas-vacio__icono">
        <Search size={22} />
      </div>

      <h3>Busca tu ruta</h3>
      <p>
        Elige origen y destino para ver las mejores opciones en bus por Vigo.
      </p>
    </div>
  );
}

function PanelRutaSeleccionada({ ruta, origen, destino, onCerrar }) {
  if (!ruta) {
    return (
      <aside className="panel-ruta-app panel-ruta-app--vacio">
        <div className="panel-ruta-app__vacio">
          <MapPinned size={24} />
          <h3>Selecciona una ruta</h3>
          <p>
            Al elegir una opcion veras aqui el mapa, el resumen y los pasos del viaje.
          </p>
        </div>
      </aside>
    );
  }

  const minutosInfoBus = obtenerMinutosInfoBus(ruta);
  const claseMinutos = obtenerClaseMinutos(minutosInfoBus);
  const linea = obtenerLineaRuta(ruta);
  const caminata = formatearMetros(ruta?.distanciaAndandoTotalMetros);

  return (
    <aside className="panel-ruta-app panel-ruta-app--visible">
      <div className="panel-ruta-app__cabecera">
        <div className="panel-ruta-app__linea-hero">
          <span className="linea-bus-pill linea-bus-pill--grande">
            {linea}
          </span>

          <div>
            <p className="panel-ruta-app__mini">Seguimiento del trayecto</p>
            <h2>
              Hasta {obtenerNombreLugar(destino)}
            </h2>
            <span className="panel-ruta-app__subtitulo">
              {obtenerTipoRuta(ruta)} · salida {obtenerTextoHora(ruta?.horaSalidaBus || ruta?.horaInicioRuta)}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="panel-ruta-app__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar ruta seleccionada"
        >
          <X size={18} />
        </button>
      </div>

      <div className="panel-ruta-app__resumen">
        <div className="panel-ruta-app__dato">
          <strong>{ruta?.minutosTotal ?? '--'} min</strong>
          <span>Tiempo total</span>
        </div>

        <div className="panel-ruta-app__dato">
          <strong>{obtenerTextoHora(ruta?.horaLlegadaFinal || ruta?.horaLlegadaBus)}</strong>
          <span>Llegada</span>
        </div>

        <div className="panel-ruta-app__dato">
          <strong>{caminata || '--'}</strong>
          <span>Caminata total</span>
        </div>

        <div className={`tiempo-real ${claseMinutos}`}>
          <span>{minutosInfoBus ?? '--'}</span>
          <small>live</small>
        </div>
      </div>

      <div className="panel-ruta-app__estado-live">
        <div className="panel-ruta-app__estado-live-icono">
          <Sparkles size={16} />
        </div>

        <div>
          <strong>Panel pensado para seguir el viaje en marcha</strong>
          <span>
            Tienes el recorrido, la subida, la bajada y la caminata final en la misma vista.
          </span>
        </div>
      </div>

      <div className="panel-ruta-app__mapa">
        <MapaRuta
          ruta={ruta}
          origen={origen}
          destino={destino}
        />
      </div>

      <div className="timeline-ruta">
        <div className="timeline-ruta__paso">
          <div className="timeline-ruta__icono">
            <Footprints size={17} />
          </div>

          <div>
            <strong>Camina hasta la parada</strong>
            <span>
              {ruta?.minutosAndandoOrigen ?? '--'} min hasta {obtenerNombreParada(ruta?.paradaOrigen, 'la parada de salida')}
            </span>
          </div>
        </div>

        <div className="timeline-ruta__paso timeline-ruta__paso--activo">
          <div className="timeline-ruta__icono">
            <BusFront size={17} />
          </div>

          <div>
            <strong>Coge la linea {linea}</strong>
            <span>
              Sale a las {obtenerTextoHora(ruta?.horaSalidaBus)} · {ruta?.minutosBus ?? '--'} min en bus
            </span>
          </div>
        </div>

        <div className="timeline-ruta__paso">
          <div className="timeline-ruta__icono">
            <MapPinned size={17} />
          </div>

          <div>
            <strong>Baja en la parada</strong>
            <span>
              {obtenerNombreParada(ruta?.paradaDestino, 'Parada de destino')}
            </span>
          </div>
        </div>

        <div className="timeline-ruta__paso">
          <div className="timeline-ruta__icono">
            <Navigation size={17} />
          </div>

          <div>
            <strong>Camina hasta tu destino</strong>
            <span>
              {ruta?.minutosAndandoDestino ?? '--'} min hasta {obtenerNombreLugar(destino)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function InicioPagina() {
  const [origenSeleccionado, setOrigenSeleccionado] = useState(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const puedeBuscar = Boolean(
    origenSeleccionado?.lat &&
    origenSeleccionado?.lon &&
    destinoSeleccionado?.lat &&
    destinoSeleccionado?.lon
  );

  const resumenBusqueda = useMemo(() => {
    if (!origenSeleccionado && !destinoSeleccionado) {
      return 'Origen y destino pendientes';
    }

    if (!origenSeleccionado) {
      return 'Falta elegir origen';
    }

    if (!destinoSeleccionado) {
      return 'Falta elegir destino';
    }

    return `${obtenerNombreLugar(origenSeleccionado)} -> ${obtenerNombreLugar(destinoSeleccionado)}`;
  }, [origenSeleccionado, destinoSeleccionado]);

  const mejorRuta = rutas[0] || null;

  const metricasRapidas = useMemo(() => {
    return [
      {
        id: 'opciones',
        etiqueta: 'Opciones',
        valor: rutas.length > 0 ? String(rutas.length) : '--',
        icono: Route
      },
      {
        id: 'live',
        etiqueta: 'Proximo bus',
        valor: mejorRuta ? formatearMinutos(obtenerMinutosInfoBus(mejorRuta)) : '--',
        icono: Clock3
      },
      {
        id: 'walk',
        etiqueta: 'Caminata',
        valor: mejorRuta ? (formatearMetros(mejorRuta?.distanciaAndandoTotalMetros) || '--') : '--',
        icono: Footprints
      }
    ];
  }, [mejorRuta, rutas.length]);

  function limpiarRutas() {
    setRutas([]);
    setRutaSeleccionada(null);
  }

  function manejarSeleccionOrigen(lugar) {
    setOrigenSeleccionado(lugar);
    setError('');
    limpiarRutas();
  }

  function manejarSeleccionDestino(lugar) {
    setDestinoSeleccionado(lugar);
    setError('');
    limpiarRutas();
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite usar la ubicacion actual.');
      return;
    }

    setCargando(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lugarActual = {
          nombre: 'Mi ubicacion actual',
          direccion: 'Posicion detectada por GPS',
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude,
          fuente: 'GPS'
        };

        setOrigenSeleccionado(lugarActual);
        limpiarRutas();
        setCargando(false);
      },
      () => {
        setError('No se pudo obtener tu ubicacion. Revisa los permisos del navegador.');
        setCargando(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  function elegirEnMapaTemporal() {
    setError('La seleccion manual en mapa queda preparada para el siguiente bloque del frontend.');
  }

  function intercambiarOrigenDestino() {
    setOrigenSeleccionado(destinoSeleccionado);
    setDestinoSeleccionado(origenSeleccionado);
    setError('');
    limpiarRutas();
  }

  async function buscarOpcionesRuta() {
    if (!puedeBuscar) {
      setError('Elige un origen y un destino antes de buscar.');
      return;
    }

    try {
      setCargando(true);
      setError('');

      const respuesta = await buscarRutas({
        origenLat: origenSeleccionado.lat,
        origenLon: origenSeleccionado.lon,
        destinoLat: destinoSeleccionado.lat,
        destinoLon: destinoSeleccionado.lon,
        fecha: obtenerFechaActual(),
        hora: obtenerHoraActual(),
        maxResultados: 6
      });

      const opciones = obtenerOpcionesRespuesta(respuesta);

      setRutas(opciones);
      setRutaSeleccionada(opciones[0] || null);

      if (opciones.length === 0) {
        setError('No encontre una ruta directa para ese trayecto. La pantalla ya queda preparada para cuando metas mas variantes desde backend.');
      }
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudieron buscar rutas.');
      setRutas([]);
      setRutaSeleccionada(null);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="pagina-rutas-app">
      <div className="rutas-fondo-mapa">
        <div className="rutas-fondo-mapa__grid" />
        <div className="rutas-fondo-mapa__linea rutas-fondo-mapa__linea--uno" />
        <div className="rutas-fondo-mapa__linea rutas-fondo-mapa__linea--dos" />
        <div className="rutas-fondo-mapa__punto rutas-fondo-mapa__punto--uno" />
        <div className="rutas-fondo-mapa__punto rutas-fondo-mapa__punto--dos" />
      </div>

      <div className="rutas-app-shell">
        <section className="buscador-ruta-app">
          <div className="buscador-ruta-app__cabecera">
            <div>
              <p className="pagina-inicio__mini">
                ParadaBus · Vigo
              </p>

              <h1>
                Mueve toda la planificacion del viaje a una sola pantalla.
              </h1>

              <p className="buscador-ruta-app__intro">
                Inspirado en apps de movilidad: busca rapido, cambia origen y destino,
                compara tarjetas y sigue el trayecto sin perderte en la interfaz.
              </p>
            </div>

            <div className="buscador-ruta-app__estado">
              <span />
              InfoBus
            </div>
          </div>

          <div className="buscador-ruta-app__hero-tags">
            <span className="chip-app chip-app--activo">Tiempo real</span>
            <span className="chip-app">Ruta rapida</span>
            <span className="chip-app">Pensado para movil</span>
          </div>

          <div className="buscador-ruta-app__campos">
            <div className="buscador-ruta-app__timeline">
              <span className="buscador-ruta-app__origen" />
              <span className="buscador-ruta-app__linea" />
              <span className="buscador-ruta-app__destino" />
            </div>

            <div className="buscador-ruta-app__inputs">
              <SelectorLugar
                etiqueta="Origen"
                placeholder="Origen o ubicacion actual"
                valor={origenSeleccionado}
                tipo="origen"
                onSeleccionar={manejarSeleccionOrigen}
                onUsarUbicacionActual={usarUbicacionActual}
                onElegirEnMapa={elegirEnMapaTemporal}
                onTextoCambiado={limpiarRutas}
              />

              <div className="buscador-ruta-app__swap">
                <button
                  type="button"
                  className="boton-intercambiar-ruta"
                  onClick={intercambiarOrigenDestino}
                  disabled={!origenSeleccionado && !destinoSeleccionado}
                  aria-label="Intercambiar origen y destino"
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>

              <SelectorLugar
                etiqueta="Destino"
                placeholder="A donde vas"
                valor={destinoSeleccionado}
                tipo="destino"
                onSeleccionar={manejarSeleccionDestino}
                onElegirEnMapa={elegirEnMapaTemporal}
                onTextoCambiado={limpiarRutas}
              />
            </div>
          </div>

          <div className="buscador-ruta-app__acciones">
            <button
              type="button"
              className="boton-ubicacion-ruta"
              onClick={usarUbicacionActual}
              disabled={cargando}
            >
              <LocateFixed size={17} />
              Mi ubicacion
            </button>

            <button
              type="button"
              className="boton-buscar-ruta"
              onClick={buscarOpcionesRuta}
              disabled={cargando || !puedeBuscar}
            >
              {cargando ? (
                <Loader2 className="icono-girando" size={18} />
              ) : (
                <Search size={18} />
              )}

              Buscar ruta
            </button>
          </div>

          <div className="buscador-ruta-app__resumen">
            <Route size={16} />
            <span>{resumenBusqueda}</span>
          </div>

          <div className="buscador-ruta-app__metricas">
            {metricasRapidas.map((metrica) => {
              const Icono = metrica.icono;

              return (
                <article
                  key={metrica.id}
                  className="buscador-ruta-app__metrica"
                >
                  <div className="buscador-ruta-app__metrica-icono">
                    <Icono size={16} />
                  </div>

                  <div>
                    <strong>{metrica.valor}</strong>
                    <span>{metrica.etiqueta}</span>
                  </div>
                </article>
              );
            })}
          </div>

          {error && (
            <div className="buscador-ruta-app__error">
              {error}
            </div>
          )}
        </section>

        <section className="resultados-rutas-app">
          <div className="resultados-rutas-app__cabecera">
            <div>
              <p className="pagina-inicio__mini">
                Opciones
              </p>

              <h2>
                Rutas disponibles
              </h2>

              <p className="resultados-rutas-app__texto">
                Pulsa una tarjeta para ver el mapa y el seguimiento del viaje.
              </p>
            </div>

            <div className="resultados-rutas-app__controles">
              <span className="resultados-rutas-app__contador">
                {rutas.length > 0 ? `${rutas.length} rutas` : 'Sin rutas'}
              </span>

              <button
                type="button"
                className="resultados-rutas-app__actualizar"
                onClick={buscarOpcionesRuta}
                disabled={cargando || !puedeBuscar}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {cargando && (
            <div className="skeleton-rutas">
              <div />
              <div />
              <div />
            </div>
          )}

          {!cargando && rutas.length === 0 && (
            <EstadoVacioRutas />
          )}

          {!cargando && rutas.length > 0 && (
            <div className="resultados-rutas-app__lista">
              {rutas.map((ruta, indice) => (
                <TarjetaRuta
                  key={`${ruta?.tripId || ruta?.routeId || 'ruta'}-${indice}`}
                  ruta={ruta}
                  indice={indice}
                  activa={ruta === rutaSeleccionada}
                  onSeleccionar={() => setRutaSeleccionada(ruta)}
                />
              ))}
            </div>
          )}
        </section>

        <PanelRutaSeleccionada
          ruta={rutaSeleccionada}
          origen={origenSeleccionado}
          destino={destinoSeleccionado}
          onCerrar={() => setRutaSeleccionada(null)}
        />

        <div className="rutas-app-shell__ayuda">
          <Sparkles size={16} />
          La nueva interfaz ya esta preparada para crecer con transbordos, filtros y favoritos sin perder claridad.
        </div>
      </div>
    </section>
  );
}

export default InicioPagina;
