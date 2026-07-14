import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Bell,
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
import {
  buscarRutas
} from '../servicios/rutasServicio';
import {
  cerrarNotificacionesTrayecto,
  mostrarNotificacionTrayecto,
  obtenerPermisoNotificaciones,
  pedirPermisoNotificaciones
} from '../servicios/notificacionesServicio';
import {
  prepararTrayectoActivo,
  recalcularTrayectoActivo
} from '../servicios/trayectoActivoServicio';

const CLAVE_TRAYECTO_ACTIVO = 'paradabus_trayecto_activo_v1';

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
  if (Array.isArray(ruta?.lineas) && ruta.lineas.length > 0) {
    return ruta.lineas[0];
  }

  return ruta?.linea || ruta?.lineaPrincipal || ruta?.codigoLinea || ruta?.routeShortName || 'BUS';
}

function obtenerLineasSecundarias(ruta) {
  return (Array.isArray(ruta?.lineas) ? ruta.lineas : [])
    .filter(Boolean)
    .slice(1, 3);
}

function obtenerTipoRuta(ruta) {
  if (ruta?.transbordos && ruta.transbordos > 0) {
    return `${ruta.transbordos} transbordo${ruta.transbordos > 1 ? 's' : ''}`;
  }

  if (ruta?.esTransbordo) {
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

function obtenerSegmentoActivo(trayectoActivo) {
  if (!trayectoActivo) {
    return null;
  }

  return trayectoActivo.segmentos?.[trayectoActivo.segmentoActivoIndex] || null;
}

function guardarTrayectoActivoEnLocal(trayectoActivo) {
  if (!trayectoActivo) {
    localStorage.removeItem(CLAVE_TRAYECTO_ACTIVO);
    return;
  }

  localStorage.setItem(CLAVE_TRAYECTO_ACTIVO, JSON.stringify(trayectoActivo));
}

function cargarTrayectoActivoDeLocal() {
  try {
    const texto = localStorage.getItem(CLAVE_TRAYECTO_ACTIVO);

    if (!texto) {
      return null;
    }

    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function crearPasosRuta(ruta, destino) {
  const pasos = [
    {
      id: 'origen',
      icono: Footprints,
      titulo: 'Camina hasta la parada',
      descripcion: `${ruta?.minutosAndandoOrigen ?? '--'} min hasta ${obtenerNombreParada(ruta?.paradaOrigen, 'la parada de salida')}`,
      activo: false
    }
  ];

  const tramos = Array.isArray(ruta?.tramos) ? ruta.tramos : [];

  if (tramos.length > 1) {
    const primerTramo = tramos[0];
    const segundoTramo = tramos[1];

    pasos.push({
      id: 'bus-1',
      icono: BusFront,
      titulo: `Coge la linea ${primerTramo?.linea || ruta?.linea}`,
      descripcion: `Sale a las ${obtenerTextoHora(primerTramo?.horaSalidaBus || ruta?.horaSalidaBus)} · ${primerTramo?.minutosBus ?? '--'} min`,
      activo: true
    });

    pasos.push({
      id: 'transbordo',
      icono: RefreshCw,
      titulo: 'Haz el transbordo',
      descripcion: `${ruta?.minutosEsperaTransbordo ?? '--'} min en ${obtenerNombreParada(ruta?.paradaTransbordo, 'la parada de enlace')}`,
      activo: false
    });

    pasos.push({
      id: 'bus-2',
      icono: BusFront,
      titulo: `Sube a la linea ${segundoTramo?.linea || 'BUS'}`,
      descripcion: `Llega a las ${obtenerTextoHora(segundoTramo?.horaLlegadaBus || ruta?.horaLlegadaBus)}`,
      activo: false
    });
  } else {
    pasos.push({
      id: 'bus',
      icono: BusFront,
      titulo: `Coge la linea ${obtenerLineaRuta(ruta)}`,
      descripcion: `Sale a las ${obtenerTextoHora(ruta?.horaSalidaBus)} · ${ruta?.minutosBus ?? '--'} min en bus`,
      activo: true
    });
  }

  pasos.push(
    {
      id: 'destino-bus',
      icono: MapPinned,
      titulo: 'Baja en la parada',
      descripcion: obtenerNombreParada(ruta?.paradaDestino, 'Parada de destino'),
      activo: false
    },
    {
      id: 'final',
      icono: Navigation,
      titulo: 'Camina hasta tu destino',
      descripcion: `${ruta?.minutosAndandoDestino ?? '--'} min hasta ${obtenerNombreLugar(destino)}`,
      activo: false
    }
  );

  return pasos;
}

function TarjetaRuta({ ruta, activa, indice, onSeleccionar }) {
  const minutosInfoBus = obtenerMinutosInfoBus(ruta);
  const claseMinutos = obtenerClaseMinutos(minutosInfoBus);
  const linea = obtenerLineaRuta(ruta);
  const tipoRuta = obtenerTipoRuta(ruta);
  const lineasSecundarias = obtenerLineasSecundarias(ruta);
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

          {lineasSecundarias.length > 0 && (
            <div className="tarjeta-ruta__lineas-secundarias">
              {lineasSecundarias.map((lineaSecundaria) => (
                <span key={lineaSecundaria} className="linea-bus-pill linea-bus-pill--suave">
                  {lineaSecundaria}
                </span>
              ))}
            </div>
          )}

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
          {ruta?.esTransbordo
            ? `${ruta?.minutosEsperaTransbordo ?? '--'} min transbordo`
            : formatearMinutos(ruta?.minutosBus)}
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

function PanelTrayectoActivo({
  trayectoActivo,
  permisoNotificaciones,
  onActivarAvisos,
  onFinalizar,
  onAbrirRuta
}) {
  if (!trayectoActivo) {
    return null;
  }

  const segmentoActivo = obtenerSegmentoActivo(trayectoActivo);
  const estado = trayectoActivo.estadoActual;

  return (
    <section className="trayecto-activo">
      <div className="trayecto-activo__cabecera">
        <div>
          <p className="pagina-inicio__mini">Trayecto activo</p>
          <h2>
            {trayectoActivo.finalizado
              ? 'Llegada detectada'
              : `Linea ${segmentoActivo?.linea || 'BUS'} en seguimiento`}
          </h2>
          <p className="trayecto-activo__texto">
            {trayectoActivo.finalizado
              ? `Ya puedes finalizar el trayecto hacia ${trayectoActivo.destinoFinal}.`
              : `Te avisaremos antes de bajar y puedes seguir la ruta en el mapa.`}
          </p>
        </div>

        <div className="trayecto-activo__estado">
          <span className={trayectoActivo.finalizado ? 'trayecto-activo__punto trayecto-activo__punto--final' : 'trayecto-activo__punto'} />
          {trayectoActivo.finalizado ? 'Completado' : 'En marcha'}
        </div>
      </div>

      <div className="trayecto-activo__metricas">
        <article className="trayecto-activo__metrica">
          <strong>{segmentoActivo?.linea || '--'}</strong>
          <span>Linea actual</span>
        </article>

        <article className="trayecto-activo__metrica">
          <strong>{estado?.paradasRestantes ?? '--'}</strong>
          <span>Paradas restantes</span>
        </article>

        <article className="trayecto-activo__metrica">
          <strong>{estado?.paradaSiguiente?.nombre || '--'}</strong>
          <span>Siguiente parada</span>
        </article>
      </div>

      <div className="trayecto-activo__alerta">
        <Bell size={16} />
        <div>
          <strong>
            {estado?.avisoSiguienteParada
              ? (trayectoActivo.segmentoActivoIndex < (trayectoActivo.segmentos.length - 1)
                ? 'Siguiente parada: preparate para el transbordo'
                : 'Siguiente parada: baja')
              : 'Seguimiento activo del viaje'}
          </strong>
          <span>
            {estado?.distanciaSiguienteParada
              ? `Estas a unos ${estado.distanciaSiguienteParada} m de la siguiente parada.`
              : 'La app ira actualizando el siguiente punto del trayecto.'}
          </span>
        </div>
      </div>

      <div className="trayecto-activo__acciones">
        <button
          type="button"
          className="boton-buscar-ruta"
          onClick={onAbrirRuta}
        >
          <Route size={18} />
          Ver ruta
        </button>

        {permisoNotificaciones !== 'granted' && permisoNotificaciones !== 'unsupported' && (
          <button
            type="button"
            className="boton-ubicacion-ruta"
            onClick={onActivarAvisos}
          >
            <Bell size={17} />
            Activar avisos
          </button>
        )}

        <button
          type="button"
          className="boton-secundario-trayecto"
          onClick={onFinalizar}
        >
          Finalizar trayecto
        </button>
      </div>
    </section>
  );
}

function PanelRutaSeleccionada({
  ruta,
  origen,
  destino,
  onCerrar,
  onIniciarTrayecto,
  onFinalizarTrayecto,
  trayectoActivo,
  preparandoTrayecto
}) {
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
  const pasos = crearPasosRuta(ruta, destino);
  const segmentoActivo = obtenerSegmentoActivo(trayectoActivo);
  const trayectoCoincide = Boolean(trayectoActivo?.rutaVisualId && trayectoActivo.rutaVisualId === ruta.idVisual);

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
          <strong>
            {trayectoCoincide
              ? 'Trayecto en curso sobre esta ruta'
              : 'Panel pensado para seguir el viaje en marcha'}
          </strong>
          <span>
            {trayectoCoincide
              ? 'La ruta seleccionada esta siendo monitorizada con avisos y siguiente parada.'
              : 'Tienes recorrido, subida, bajada y caminata final en la misma vista.'}
          </span>
        </div>
      </div>

      <div className="panel-ruta-app__acciones">
        {!trayectoCoincide && (
          <button
            type="button"
            className="boton-buscar-ruta"
            onClick={() => onIniciarTrayecto(ruta)}
            disabled={preparandoTrayecto}
          >
            {preparandoTrayecto ? (
              <Loader2 className="icono-girando" size={18} />
            ) : (
              <Navigation size={18} />
            )}
            Iniciar trayecto
          </button>
        )}

        {trayectoCoincide && (
          <button
            type="button"
            className="boton-secundario-trayecto"
            onClick={onFinalizarTrayecto}
          >
            Finalizar trayecto
          </button>
        )}
      </div>

      <div className="panel-ruta-app__mapa">
        <MapaRuta
          ruta={ruta}
          origen={origen}
          destino={destino}
          trayectoActivo={trayectoCoincide ? trayectoActivo : null}
          segmentoSeguimiento={trayectoCoincide ? segmentoActivo : null}
          ubicacionUsuario={trayectoCoincide ? trayectoActivo?.ultimaUbicacionUsuario : null}
        />
      </div>

      <div className="timeline-ruta">
        {pasos.map((paso) => {
          const Icono = paso.icono;

          return (
            <div
              key={paso.id}
              className={
                paso.activo
                  ? 'timeline-ruta__paso timeline-ruta__paso--activo'
                  : 'timeline-ruta__paso'
              }
            >
              <div className="timeline-ruta__icono">
                <Icono size={17} />
              </div>

              <div>
                <strong>{paso.titulo}</strong>
                <span>{paso.descripcion}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function InicioPagina() {
  const [origenSeleccionado, setOrigenSeleccionado] = useState(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);
  const [resultadoBusqueda, setResultadoBusqueda] = useState({
    opciones: [],
    directas: [],
    transbordos: [],
    transbordosConsultados: false,
    totalDirectas: 0,
    totalTransbordos: 0,
    mensaje: ''
  });
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [trayectoActivo, setTrayectoActivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [preparandoTrayecto, setPreparandoTrayecto] = useState(false);
  const [error, setError] = useState('');
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(obtenerPermisoNotificaciones());

  const panelTrayectoRef = useRef(null);
  const watchUbicacionRef = useRef(null);

  const puedeBuscar = Boolean(
    origenSeleccionado?.lat &&
    origenSeleccionado?.lon &&
    destinoSeleccionado?.lat &&
    destinoSeleccionado?.lon
  );

  const rutas = resultadoBusqueda.opciones || [];

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
        id: 'transfer',
        etiqueta: 'Con transbordo',
        valor: resultadoBusqueda.totalTransbordos > 0 ? String(resultadoBusqueda.totalTransbordos) : '--',
        icono: RefreshCw
      }
    ];
  }, [mejorRuta, resultadoBusqueda.totalTransbordos, rutas.length]);

  function limpiarRutas() {
    setResultadoBusqueda({
      opciones: [],
      directas: [],
      transbordos: [],
      transbordosConsultados: false,
      totalDirectas: 0,
      totalTransbordos: 0,
      mensaje: ''
    });
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

  async function buscarOpcionesRuta(opcionesBusqueda = {}) {
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
      }, opcionesBusqueda);

      setResultadoBusqueda(respuesta);
      setRutaSeleccionada((actual) => {
        if (actual) {
          const encontrada = (respuesta.opciones || []).find((ruta) => ruta.idVisual === actual.idVisual);
          return encontrada || respuesta.opciones?.[0] || null;
        }

        return respuesta.opciones?.[0] || null;
      });

      if ((respuesta.opciones || []).length === 0) {
        setError('No encontre rutas utiles para ese trayecto.');
      }
    } catch (errorPeticion) {
      setError(errorPeticion.message || 'No se pudieron buscar rutas.');
      limpiarRutas();
    } finally {
      setCargando(false);
    }
  }

  async function activarAvisosTrayecto() {
    const permiso = await pedirPermisoNotificaciones();
    setPermisoNotificaciones(permiso);

    if (permiso !== 'granted') {
      setError('No se pudieron activar las notificaciones del navegador.');
    }
  }

  async function iniciarTrayecto(ruta) {
    try {
      setPreparandoTrayecto(true);
      setError('');

      const permiso = await pedirPermisoNotificaciones();
      setPermisoNotificaciones(permiso);

      const preparado = await prepararTrayectoActivo(ruta);
      const recalculado = recalcularTrayectoActivo(
        preparado,
        trayectoActivo?.ultimaUbicacionUsuario || null
      );

      setTrayectoActivo(recalculado);

      await mostrarNotificacionTrayecto({
        titulo: 'Trayecto iniciado',
        cuerpo: `Seguimiento activo hacia ${recalculado.destinoFinal}.`,
        tag: `paradabus-trayecto-${recalculado.id}`,
        datos: {
          trayectoId: recalculado.id
        }
      });
    } catch (errorTrayecto) {
      setError(errorTrayecto.message || 'No se pudo iniciar el trayecto.');
    } finally {
      setPreparandoTrayecto(false);
    }
  }

  async function finalizarTrayecto() {
    if (watchUbicacionRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchUbicacionRef.current);
      watchUbicacionRef.current = null;
    }

    await cerrarNotificacionesTrayecto();
    setTrayectoActivo(null);
  }

  function abrirRutaDesdeTrayecto() {
    panelTrayectoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  useEffect(() => {
    const trayectoGuardado = cargarTrayectoActivoDeLocal();

    if (trayectoGuardado) {
      setTrayectoActivo(trayectoGuardado);
    }

    const accionUrl = new URLSearchParams(window.location.search).get('trayectoAccion');

    if (accionUrl === 'finalizar-trayecto') {
      finalizarTrayecto();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    guardarTrayectoActivoEnLocal(trayectoActivo);
  }, [trayectoActivo]);

  useEffect(() => {
    if (!trayectoActivo || trayectoActivo.finalizado) {
      if (watchUbicacionRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchUbicacionRef.current);
        watchUbicacionRef.current = null;
      }

      return undefined;
    }

    if (!navigator.geolocation || watchUbicacionRef.current !== null) {
      return undefined;
    }

    watchUbicacionRef.current = navigator.geolocation.watchPosition(
      (posicion) => {
        const ubicacion = {
          lat: posicion.coords.latitude,
          lon: posicion.coords.longitude
        };

        setTrayectoActivo((actual) => {
          if (!actual) {
            return actual;
          }

          return recalcularTrayectoActivo(actual, ubicacion);
        });
      },
      () => {
        setTrayectoActivo((actual) => {
          if (!actual) {
            return actual;
          }

          return recalcularTrayectoActivo(actual, actual.ultimaUbicacionUsuario || null);
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => {
      if (watchUbicacionRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchUbicacionRef.current);
        watchUbicacionRef.current = null;
      }
    };
  }, [trayectoActivo?.id, trayectoActivo?.finalizado]);

  useEffect(() => {
    if (!trayectoActivo || trayectoActivo.finalizado) {
      return undefined;
    }

    const intervalo = window.setInterval(() => {
      setTrayectoActivo((actual) => {
        if (!actual) {
          return actual;
        }

        return recalcularTrayectoActivo(actual, actual.ultimaUbicacionUsuario || null);
      });
    }, 15000);

    return () => window.clearInterval(intervalo);
  }, [trayectoActivo?.id, trayectoActivo?.finalizado]);

  useEffect(() => {
    if (!trayectoActivo?.estadoActual) {
      return;
    }

    const estado = trayectoActivo.estadoActual;
    const segmentoActivo = obtenerSegmentoActivo(trayectoActivo);

    if (trayectoActivo.finalizado) {
      const clave = `fin-${trayectoActivo.id}`;

      if (!trayectoActivo.alertasEmitidas?.includes(clave)) {
        setTrayectoActivo((actual) => ({
          ...actual,
          alertasEmitidas: [
            ...(actual.alertasEmitidas || []),
            clave
          ]
        }));

        mostrarNotificacionTrayecto({
          titulo: 'Trayecto completado',
          cuerpo: `Has llegado a ${trayectoActivo.destinoFinal}.`,
          tag: `paradabus-trayecto-${trayectoActivo.id}`,
          datos: {
            trayectoId: trayectoActivo.id
          }
        });
      }

      return;
    }

    if (!estado.avisoSiguienteParada) {
      return;
    }

    const clave = `aviso-${trayectoActivo.id}-${trayectoActivo.segmentoActivoIndex}-${estado.paradaSiguiente?.stopId || estado.paradaSiguiente?.idParada || 'parada'}`;

    if (trayectoActivo.alertasEmitidas?.includes(clave)) {
      return;
    }

    setTrayectoActivo((actual) => ({
      ...actual,
      alertasEmitidas: [
        ...(actual.alertasEmitidas || []),
        clave
      ]
    }));

    const esUltimoTramo = trayectoActivo.segmentoActivoIndex === trayectoActivo.segmentos.length - 1;

    mostrarNotificacionTrayecto({
      titulo: esUltimoTramo ? 'Siguiente parada, baja' : 'Siguiente parada, preparate para transbordo',
      cuerpo: esUltimoTramo
        ? `Tu parada es ${estado.paradaSiguiente?.nombre || trayectoActivo.destinoFinal}.`
        : `Tu enlace sera en ${estado.paradaSiguiente?.nombre || segmentoActivo?.paradaLlegada?.nombre}.`,
      tag: `paradabus-trayecto-${trayectoActivo.id}`,
      requireInteraction: true,
      datos: {
        trayectoId: trayectoActivo.id
      }
    });
  }, [trayectoActivo]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    function manejarMensajeServicio(evento) {
      const datos = evento.data || {};

      if (datos.type !== 'PARADABUS_NOTIFICACION_ACCION') {
        return;
      }

      if (datos.accion === 'finalizar-trayecto') {
        finalizarTrayecto();
      }

      if (datos.accion === 'abrir-trayecto') {
        abrirRutaDesdeTrayecto();
      }
    }

    navigator.serviceWorker.addEventListener('message', manejarMensajeServicio);

    return () => {
      navigator.serviceWorker.removeEventListener('message', manejarMensajeServicio);
    };
  }, []);

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
                Ahora la busqueda ya deja preparada la parte de transbordos y el
                modo trayecto activo con aviso antes de bajar.
              </p>
            </div>

            <div className="buscador-ruta-app__estado">
              <span />
              InfoBus
            </div>
          </div>

          <div className="buscador-ruta-app__hero-tags">
            <span className="chip-app chip-app--activo">Tiempo real</span>
            <span className="chip-app">Trayecto activo</span>
            <span className="chip-app">Transbordos ligeros</span>
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
              onClick={() => buscarOpcionesRuta()}
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

        <div ref={panelTrayectoRef}>
          <PanelTrayectoActivo
            trayectoActivo={trayectoActivo}
            permisoNotificaciones={permisoNotificaciones}
            onActivarAvisos={activarAvisosTrayecto}
            onFinalizar={finalizarTrayecto}
            onAbrirRuta={abrirRutaDesdeTrayecto}
          />
        </div>

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
                Directas primero. Si hace falta, la app ya puede sacar transbordos sin cargarlo todo siempre.
              </p>
            </div>

            <div className="resultados-rutas-app__controles">
              <span className="resultados-rutas-app__contador">
                {rutas.length > 0 ? `${rutas.length} rutas` : 'Sin rutas'}
              </span>

              <button
                type="button"
                className="resultados-rutas-app__actualizar"
                onClick={() => buscarOpcionesRuta()}
                disabled={cargando || !puedeBuscar}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {!resultadoBusqueda.transbordosConsultados && resultadoBusqueda.totalDirectas > 0 && (
            <div className="resultados-rutas-app__aviso">
              <span>
                Busqueda rapida activa: se han mostrado primero las directas.
              </span>

              <button
                type="button"
                className="resultados-rutas-app__boton-transbordo"
                onClick={() => buscarOpcionesRuta({ forzarTransbordos: true })}
                disabled={cargando}
              >
                Ver tambien transbordos
              </button>
            </div>
          )}

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
                  key={ruta.idVisual || `${ruta?.tripId || ruta?.routeId || 'ruta'}-${indice}`}
                  ruta={ruta}
                  indice={indice}
                  activa={ruta.idVisual === rutaSeleccionada?.idVisual}
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
          onIniciarTrayecto={iniciarTrayecto}
          onFinalizarTrayecto={finalizarTrayecto}
          trayectoActivo={trayectoActivo}
          preparandoTrayecto={preparandoTrayecto}
        />

        <div className="rutas-app-shell__ayuda">
          <Sparkles size={16} />
          La interfaz ya tiene base para directas, transbordos, trayecto activo, aviso antes de bajar y notificaciones sobre HTTPS.
        </div>
      </div>
    </section>
  );
}

export default InicioPagina;
