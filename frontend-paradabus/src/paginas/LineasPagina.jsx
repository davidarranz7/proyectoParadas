import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BusFront,
  Clock3,
  MapPinned,
  Route,
  Search,
  Sparkles,
  TimerReset,
  X
} from 'lucide-react';

import MapaLineaDetalle from '../componentes/mapa/MapaLineaDetalle';
import {
  obtenerHorariosLinea,
  obtenerLineasAgrupadas,
  obtenerRecorridoLinea,
  obtenerRecorridoMapaLinea,
  obtenerSentidosLinea
} from '../servicios/lineasServicio';

function formatearHoraGtfs(horaTexto) {
  if (!horaTexto) {
    return '--:--';
  }

  const partes = String(horaTexto).split(':');

  if (partes.length < 2) {
    return horaTexto;
  }

  const horas = Number(partes[0]);
  const minutos = String(partes[1]).padStart(2, '0');

  if (!Number.isFinite(horas)) {
    return horaTexto;
  }

  const diasExtra = Math.floor(horas / 24);
  const horasVisuales = String(horas % 24).padStart(2, '0');

  return diasExtra > 0
    ? `${horasVisuales}:${minutos} +${diasExtra}`
    : `${horasVisuales}:${minutos}`;
}

function normalizarColorLinea(color) {
  if (!color) {
    return '#ff6b3d';
  }

  const texto = String(color).replace('#', '').trim();

  return texto ? `#${texto}` : '#ff6b3d';
}

function ordenarLineas(lineas) {
  return [...lineas].sort((a, b) => {
    const numeroA = Number(a?.codigo);
    const numeroB = Number(b?.codigo);

    if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
      return numeroA - numeroB;
    }

    return String(a?.codigo || '').localeCompare(String(b?.codigo || ''), 'es');
  });
}

function resolverSentidoInicial(sentidos, horarios) {
  if (Array.isArray(sentidos) && sentidos.length > 0) {
    return sentidos[0];
  }

  const sentidoHorario = horarios?.sentidos?.[0];

  if (!sentidoHorario) {
    return null;
  }

  return {
    directionId: sentidoHorario.directionId,
    destino: sentidoHorario.destino,
    tripId: sentidoHorario.tripIdRepresentativo,
    totalParadas: sentidoHorario.totalSalidas
  };
}

function resolverHorarioActivo(horarios, sentidoActivo) {
  if (!horarios?.sentidos?.length) {
    return null;
  }

  if (!sentidoActivo) {
    return horarios.sentidos[0];
  }

  return (
    horarios.sentidos.find((sentido) => {
      const mismaDireccion = sentido.directionId === sentidoActivo.directionId;
      const mismoViaje = sentido.tripIdRepresentativo && sentido.tripIdRepresentativo === sentidoActivo.tripId;
      const mismoDestino = sentido.destino && sentido.destino === sentidoActivo.destino;

      return mismaDireccion || mismoViaje || mismoDestino;
    }) ||
    horarios.sentidos[0]
  );
}

function obtenerGruposHorario(sentidoHorario) {
  if (Array.isArray(sentidoHorario?.grupos) && sentidoHorario.grupos.length > 0) {
    return sentidoHorario.grupos;
  }

  if (Array.isArray(sentidoHorario?.salidas) && sentidoHorario.salidas.length > 0) {
    return [
      {
        codigo: 'GENERAL',
        etiqueta: 'Horarios',
        primeraSalida: sentidoHorario.primeraSalida,
        ultimaSalida: sentidoHorario.ultimaSalida,
        totalSalidas: sentidoHorario.totalSalidas,
        salidas: sentidoHorario.salidas
      }
    ];
  }

  return [];
}

function obtenerSalidasVisibles(salidas) {
  if (!Array.isArray(salidas) || salidas.length === 0) {
    return [];
  }

  const ahora = new Date();
  const ahoraSegundos = (ahora.getHours() * 3600) + (ahora.getMinutes() * 60) + ahora.getSeconds();

  const proximas = salidas.filter((salida) => {
    const partes = String(salida.horaSalida || '').split(':');

    if (partes.length < 2) {
      return false;
    }

    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    const segundos = Number(partes[2] || 0);

    if (!Number.isFinite(horas) || !Number.isFinite(minutos) || !Number.isFinite(segundos)) {
      return false;
    }

    let segundosSalida = (horas * 3600) + (minutos * 60) + segundos;

    while (segundosSalida < ahoraSegundos) {
      segundosSalida += 24 * 3600;
    }

    return segundosSalida >= ahoraSegundos;
  });

  return (proximas.length > 0 ? proximas : salidas).slice(0, 18);
}

function TarjetaLinea({ activa, linea, onSeleccionar }) {
  const colorLinea = normalizarColorLinea(linea?.color);

  return (
    <button
      type="button"
      className={activa ? 'linea-card linea-card--activa' : 'linea-card'}
      onClick={onSeleccionar}
    >
      <span
        className="linea-card__numero"
        style={{
          background: colorLinea
        }}
      >
        {linea?.codigo || '--'}
      </span>

      <div className="linea-card__texto">
        <strong>{linea?.nombrePrincipal || 'Linea urbana'}</strong>
        <span>
          {linea?.totalRecorridos || 0} recorridos - {linea?.totalRouteIds || 0} variantes
        </span>
      </div>
    </button>
  );
}

function BloqueHorarios({
  grupoHorarioActivo,
  gruposHorario,
  onCambiarGrupo
}) {
  const salidasVisibles = useMemo(() => {
    return obtenerSalidasVisibles(grupoHorarioActivo?.salidas || []);
  }, [grupoHorarioActivo?.salidas]);

  return (
    <article className="linea-detalle__card">
      <div className="linea-detalle__cabecera-simple">
        <div>
          <p className="pagina-inicio__mini">Horarios</p>
          <h3>Salidas por tipo de dia</h3>
        </div>

        <div className="linea-detalle__mini-resumen">
          {grupoHorarioActivo?.totalSalidas || 0} al dia
        </div>
      </div>

      {gruposHorario.length > 1 && (
        <div className="linea-detalle__grupos-dia">
          {gruposHorario.map((grupo) => (
            <button
              key={grupo.codigo}
              type="button"
              className={
                grupoHorarioActivo?.codigo === grupo.codigo
                  ? 'linea-detalle__grupo-dia linea-detalle__grupo-dia--activo'
                  : 'linea-detalle__grupo-dia'
              }
              onClick={() => onCambiarGrupo(grupo.codigo)}
            >
              {grupo.etiqueta}
            </button>
          ))}
        </div>
      )}

      <div className="linea-detalle__horarios-resumen">
        <span>
          Primera: <strong>{formatearHoraGtfs(grupoHorarioActivo?.primeraSalida)}</strong>
        </span>
        <span>
          Ultima: <strong>{formatearHoraGtfs(grupoHorarioActivo?.ultimaSalida)}</strong>
        </span>
      </div>

      <div className="linea-detalle__salidas">
        {salidasVisibles.length === 0 && (
          <div className="linea-detalle__vacio-bloque">
            No hay salidas cargadas para este tipo de dia.
          </div>
        )}

        {salidasVisibles.map((salida, indice) => (
          <article
            key={`${salida.tripId || 'salida'}-${salida.horaSalida}-${indice}`}
            className="linea-detalle__salida"
          >
            <strong>{formatearHoraGtfs(salida.horaSalida)}</strong>
            <span>{salida.paradaInicio || 'Cabecera'}</span>
            <small>Llega a {formatearHoraGtfs(salida.horaLlegadaFinal)}</small>
          </article>
        ))}
      </div>
    </article>
  );
}

function BloqueParadas({ paradasVisibles }) {
  return (
    <article className="linea-detalle__card">
      <div className="linea-detalle__cabecera-simple">
        <div>
          <p className="pagina-inicio__mini">Paradas</p>
          <h3>Secuencia completa</h3>
        </div>

        <div className="linea-detalle__mini-resumen">
          {paradasVisibles.length || 0} paradas
        </div>
      </div>

      <div className="linea-detalle__paradas">
        {paradasVisibles.length === 0 && (
          <div className="linea-detalle__vacio-bloque">
            Todavia no hay paradas visibles para este sentido.
          </div>
        )}

        {paradasVisibles.map((parada, indice) => (
          <article
            key={`${parada.stopId || parada.nombre}-${indice}`}
            className="linea-detalle__parada"
          >
            <span className="linea-detalle__parada-orden">
              {parada.orden || indice + 1}
            </span>

            <div>
              <strong>{parada.nombre || 'Parada'}</strong>
              <span>
                {formatearHoraGtfs(parada.horaSalida || parada.horaLlegada)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

function DetalleLineaContenido({
  cargandoDetalle,
  detalleMapa,
  detalleRecorrido,
  errorDetalle,
  esMovil = false,
  grupoHorarioActivo,
  gruposHorario,
  lineaActiva,
  onCambiarGrupoHorario,
  onCambiarPestana,
  onCerrarMovil,
  paradasVisibles,
  pestanaActiva,
  sentidoActivo,
  sentidos,
  setSentido
}) {
  const mostrarHorarios = !esMovil || pestanaActiva === 'horarios';
  const mostrarRecorrido = !esMovil || pestanaActiva === 'recorrido';
  const mostrarParadas = !esMovil || pestanaActiva === 'paradas';

  return (
    <>
      <article className="linea-detalle__hero">
        <div className="linea-detalle__hero-top">
          <span
            className="linea-bus-pill linea-bus-pill--grande"
            style={{
              background: normalizarColorLinea(lineaActiva?.color)
            }}
          >
            {lineaActiva?.codigo}
          </span>

          <div>
            <p className="pagina-inicio__mini">Linea seleccionada</p>
            <h2>{lineaActiva?.nombrePrincipal || 'Linea urbana'}</h2>
            <span className="linea-detalle__subtitulo">
              {sentidoActivo?.destino || 'Selecciona un sentido para cargar el recorrido'}
            </span>
          </div>

          {esMovil && (
            <button
              type="button"
              className="linea-detalle__cerrar-movil"
              onClick={onCerrarMovil}
              aria-label="Cerrar detalle de linea"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="linea-detalle__metricas">
          <article className="linea-detalle__metrica">
            <div className="linea-detalle__metrica-icono">
              <Route size={17} />
            </div>

            <div>
              <strong>{sentidos.length || lineaActiva?.totalRecorridos || 0}</strong>
              <span>Sentidos o recorridos</span>
            </div>
          </article>

          <article className="linea-detalle__metrica">
            <div className="linea-detalle__metrica-icono">
              <MapPinned size={17} />
            </div>

            <div>
              <strong>{detalleRecorrido?.totalParadas || detalleMapa?.totalParadas || '--'}</strong>
              <span>Paradas del recorrido</span>
            </div>
          </article>

          <article className="linea-detalle__metrica">
            <div className="linea-detalle__metrica-icono">
              <Clock3 size={17} />
            </div>

            <div>
              <strong>
                {grupoHorarioActivo
                  ? `${formatearHoraGtfs(grupoHorarioActivo.primeraSalida)} - ${formatearHoraGtfs(grupoHorarioActivo.ultimaSalida)}`
                  : '--'}
              </strong>
              <span>{grupoHorarioActivo?.etiqueta || 'Horario activo'}</span>
            </div>
          </article>
        </div>
      </article>

      <article className="linea-detalle__card">
        <div className="linea-detalle__cabecera-simple">
          <div>
            <p className="pagina-inicio__mini">Sentidos</p>
            <h3>Cabeceras disponibles</h3>
          </div>

          <div className="linea-detalle__estado-chip">
            <Sparkles size={15} />
            Cambio rapido
          </div>
        </div>

        <div className="linea-detalle__sentidos">
          {sentidos.map((sentido, indice) => (
            <button
              key={`${sentido.routeId || lineaActiva.codigo}-${sentido.directionId}-${indice}`}
              type="button"
              className={
                sentidoActivo?.tripId === sentido.tripId || sentidoActivo?.directionId === sentido.directionId
                  ? 'linea-detalle__sentido linea-detalle__sentido--activo'
                  : 'linea-detalle__sentido'
              }
              onClick={() => setSentido(sentido)}
            >
              <strong>{sentido.destino || `Sentido ${indice + 1}`}</strong>
              <span>{sentido.totalParadas || '--'} paradas</span>
            </button>
          ))}
        </div>
      </article>

      {esMovil && (
        <div className="linea-detalle__tabs">
          <button
            type="button"
            className={pestanaActiva === 'horarios' ? 'linea-detalle__tab linea-detalle__tab--activa' : 'linea-detalle__tab'}
            onClick={() => onCambiarPestana('horarios')}
          >
            Horarios
          </button>

          <button
            type="button"
            className={pestanaActiva === 'recorrido' ? 'linea-detalle__tab linea-detalle__tab--activa' : 'linea-detalle__tab'}
            onClick={() => onCambiarPestana('recorrido')}
          >
            Recorrido
          </button>

          <button
            type="button"
            className={pestanaActiva === 'paradas' ? 'linea-detalle__tab linea-detalle__tab--activa' : 'linea-detalle__tab'}
            onClick={() => onCambiarPestana('paradas')}
          >
            Paradas
          </button>
        </div>
      )}

      {errorDetalle && (
        <div className="mensaje-error">
          {errorDetalle}
        </div>
      )}

      {mostrarHorarios && (
        <BloqueHorarios
          grupoHorarioActivo={grupoHorarioActivo}
          gruposHorario={gruposHorario}
          onCambiarGrupo={onCambiarGrupoHorario}
        />
      )}

      {mostrarRecorrido && (
        <article className="linea-detalle__card linea-detalle__card--mapa">
          <div className="linea-detalle__cabecera-simple">
            <div>
              <p className="pagina-inicio__mini">Recorrido</p>
              <h3>Mapa del sentido activo</h3>
            </div>

            <div className="linea-detalle__estado-chip">
              <TimerReset size={15} />
              {cargandoDetalle ? 'Actualizando' : 'Listo'}
            </div>
          </div>

          <MapaLineaDetalle
            detalleMapa={detalleMapa}
            detalleRecorrido={detalleRecorrido}
            destino={sentidoActivo?.destino}
            cargando={cargandoDetalle}
          />
        </article>
      )}

      {mostrarParadas && (
        <BloqueParadas paradasVisibles={paradasVisibles} />
      )}
    </>
  );
}

function LineasPagina() {
  const [lineas, setLineas] = useState([]);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [lineaActiva, setLineaActiva] = useState(null);
  const [sentidos, setSentidos] = useState([]);
  const [sentidoActivo, setSentidoActivo] = useState(null);
  const [horariosLinea, setHorariosLinea] = useState(null);
  const [detalleRecorrido, setDetalleRecorrido] = useState(null);
  const [detalleMapa, setDetalleMapa] = useState(null);
  const [cargandoLineas, setCargandoLineas] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorLineas, setErrorLineas] = useState('');
  const [errorDetalle, setErrorDetalle] = useState('');
  const [esMovil, setEsMovil] = useState(() => window.innerWidth < 980);
  const [detalleMovilAbierto, setDetalleMovilAbierto] = useState(false);
  const [pestanaDetalle, setPestanaDetalle] = useState('horarios');
  const [grupoHorarioActivoCodigo, setGrupoHorarioActivoCodigo] = useState('');

  const cacheLineasRef = useRef(new Map());
  const cacheSentidosRef = useRef(new Map());
  const solicitudBaseRef = useRef(0);
  const solicitudSentidoRef = useRef(0);

  const lineasFiltradas = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase();

    if (!texto) {
      return lineas;
    }

    return lineas.filter((linea) => {
      const codigo = String(linea?.codigo || '').toLowerCase();
      const nombre = String(linea?.nombrePrincipal || '').toLowerCase();

      return codigo.includes(texto) || nombre.includes(texto);
    });
  }, [lineas, textoBusqueda]);

  const sentidoHorarioActivo = useMemo(() => {
    return resolverHorarioActivo(horariosLinea, sentidoActivo);
  }, [horariosLinea, sentidoActivo]);

  const gruposHorario = useMemo(() => {
    return obtenerGruposHorario(sentidoHorarioActivo);
  }, [sentidoHorarioActivo]);

  const grupoHorarioActivo = useMemo(() => {
    return gruposHorario.find((grupo) => grupo.codigo === grupoHorarioActivoCodigo) || gruposHorario[0] || null;
  }, [grupoHorarioActivoCodigo, gruposHorario]);

  const paradasVisibles = useMemo(() => {
    return detalleRecorrido?.paradas || detalleMapa?.paradas || [];
  }, [detalleMapa?.paradas, detalleRecorrido?.paradas]);

  async function cargarDetalleSentido(linea, sentido, opciones = {}) {
    if (!linea || !sentido) {
      setDetalleRecorrido(null);
      setDetalleMapa(null);
      return;
    }

    const gestionarCarga = opciones.gestionarCarga !== false;
    const clave = `${linea.codigo}-${sentido.directionId ?? 'sin-direction'}-${sentido.tripId || 'sin-trip'}`;

    setSentidoActivo(sentido);
    setErrorDetalle('');

    if (cacheSentidosRef.current.has(clave)) {
      const cacheado = cacheSentidosRef.current.get(clave);
      setDetalleRecorrido(cacheado.detalleRecorrido);
      setDetalleMapa(cacheado.detalleMapa);
      return;
    }

    const solicitudActual = ++solicitudSentidoRef.current;

    try {
      if (gestionarCarga) {
        setCargandoDetalle(true);
      }

      const [recorrido, mapa] = await Promise.all([
        obtenerRecorridoLinea({
          codigoLinea: linea.codigo,
          directionId: sentido.directionId,
          tripId: sentido.tripId
        }),
        obtenerRecorridoMapaLinea({
          codigoLinea: linea.codigo,
          directionId: sentido.directionId,
          tripId: sentido.tripId
        })
      ]);

      if (solicitudActual !== solicitudSentidoRef.current) {
        return;
      }

      cacheSentidosRef.current.set(clave, {
        detalleRecorrido: recorrido,
        detalleMapa: mapa
      });

      setDetalleRecorrido(recorrido);
      setDetalleMapa(mapa);
    } catch (error) {
      if (solicitudActual !== solicitudSentidoRef.current) {
        return;
      }

      setErrorDetalle(error.message || 'No se pudo cargar el detalle de la linea.');
      setDetalleRecorrido(null);
      setDetalleMapa(null);
    } finally {
      if (gestionarCarga && solicitudActual === solicitudSentidoRef.current) {
        setCargandoDetalle(false);
      }
    }
  }

  async function seleccionarLinea(linea, opciones = {}) {
    if (!linea) {
      return;
    }

    const abrirMovil = opciones.abrirMovil !== false;

    setLineaActiva(linea);
    setErrorDetalle('');
    setSentidos([]);
    setHorariosLinea(null);
    setSentidoActivo(null);
    setDetalleRecorrido(null);
    setDetalleMapa(null);
    setCargandoDetalle(true);
    setPestanaDetalle('horarios');

    if (esMovil && abrirMovil) {
      setDetalleMovilAbierto(true);
    }

    if (cacheLineasRef.current.has(linea.codigo)) {
      const cacheado = cacheLineasRef.current.get(linea.codigo);
      const sentidoInicial = resolverSentidoInicial(cacheado.sentidos, cacheado.horarios);

      setSentidos(cacheado.sentidos);
      setHorariosLinea(cacheado.horarios);
      setSentidoActivo(sentidoInicial);

      if (sentidoInicial) {
        await cargarDetalleSentido(linea, sentidoInicial, {
          gestionarCarga: false
        });
      }

      setCargandoDetalle(false);
      return;
    }

    const solicitudActual = ++solicitudBaseRef.current;

    try {
      const [sentidosRespuesta, horariosRespuesta] = await Promise.all([
        obtenerSentidosLinea(linea.codigo),
        obtenerHorariosLinea(linea.codigo)
      ]);

      if (solicitudActual !== solicitudBaseRef.current) {
        return;
      }

      cacheLineasRef.current.set(linea.codigo, {
        sentidos: sentidosRespuesta || [],
        horarios: horariosRespuesta || null
      });

      setSentidos(sentidosRespuesta || []);
      setHorariosLinea(horariosRespuesta || null);

      const sentidoInicial = resolverSentidoInicial(sentidosRespuesta, horariosRespuesta);
      setSentidoActivo(sentidoInicial);

      if (sentidoInicial) {
        await cargarDetalleSentido(linea, sentidoInicial, {
          gestionarCarga: false
        });
      }
    } catch (error) {
      if (solicitudActual !== solicitudBaseRef.current) {
        return;
      }

      setErrorDetalle(error.message || 'No se pudieron cargar sentidos y horarios.');
      setSentidos([]);
      setHorariosLinea(null);
      setDetalleRecorrido(null);
      setDetalleMapa(null);
    } finally {
      if (solicitudActual === solicitudBaseRef.current) {
        setCargandoDetalle(false);
      }
    }
  }

  useEffect(() => {
    async function cargarLineas() {
      try {
        setCargandoLineas(true);
        setErrorLineas('');

        const respuesta = await obtenerLineasAgrupadas();
        const ordenadas = ordenarLineas(respuesta || []);

        setLineas(ordenadas);
      } catch (error) {
        setErrorLineas(error.message || 'No se pudieron cargar las lineas.');
      } finally {
        setCargandoLineas(false);
      }
    }

    cargarLineas();
  }, []);

  useEffect(() => {
    if (lineas.length > 0 && !lineaActiva) {
      seleccionarLinea(lineas[0], {
        abrirMovil: false
      });
    }
  }, [lineaActiva, lineas]);

  useEffect(() => {
    function manejarResize() {
      setEsMovil(window.innerWidth < 980);
    }

    window.addEventListener('resize', manejarResize);

    return () => window.removeEventListener('resize', manejarResize);
  }, []);

  useEffect(() => {
    if (!esMovil) {
      setDetalleMovilAbierto(false);
    }
  }, [esMovil]);

  useEffect(() => {
    setGrupoHorarioActivoCodigo(gruposHorario[0]?.codigo || '');
  }, [sentidoActivo?.tripId, sentidoHorarioActivo?.directionId, gruposHorario]);

  useEffect(() => {
    if (!esMovil) {
      return undefined;
    }

    document.body.style.overflow = detalleMovilAbierto ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [detalleMovilAbierto, esMovil]);

  return (
    <section className="pagina-paneles pagina-lineas-app">
      <header className="cabecera-panel-app">
        <div>
          <p className="pagina-inicio__mini">Lineas</p>
          <h1>Todas las lineas, sentidos, recorridos y horarios en una vista mas util.</h1>
          <p>
            En movil la consulta se abre como una ficha rapida para no obligarte a hacer scroll
            de toda la pantalla cada vez que quieres ver horarios o el recorrido.
          </p>
        </div>

        <div className="cabecera-panel-app__chips">
          <span className="chip-app chip-app--activo">{lineas.length || 0} lineas</span>
          <span className="chip-app">{lineaActiva ? `${sentidos.length} sentidos` : 'Sin seleccion'}</span>
          <span className="chip-app">
            {grupoHorarioActivo?.etiqueta || 'Horarios GTFS'}
          </span>
        </div>
      </header>

      <div className="lineas-app-grid">
        <aside className="lineas-listado">
          <div className="lineas-listado__cabecera">
            <div>
              <p className="pagina-inicio__mini">Explorar</p>
              <h2>Todas las lineas</h2>
            </div>

            <span className="lineas-listado__contador">
              {lineasFiltradas.length}
            </span>
          </div>

          <div className="lineas-listado__buscador">
            <Search size={17} />

            <input
              type="text"
              value={textoBusqueda}
              onChange={(evento) => setTextoBusqueda(evento.target.value)}
              placeholder="Buscar linea o destino"
            />
          </div>

          {lineaActiva && esMovil && (
            <button
              type="button"
              className="lineas-listado__seleccion-rapida"
              onClick={() => setDetalleMovilAbierto(true)}
            >
              <span className="linea-bus-pill">{lineaActiva.codigo}</span>
              <div>
                <strong>{sentidoActivo?.destino || 'Abrir detalle'}</strong>
                <span>{grupoHorarioActivo?.etiqueta || 'Horarios y recorrido'}</span>
              </div>
            </button>
          )}

          {errorLineas && (
            <div className="mensaje-error">
              {errorLineas}
            </div>
          )}

          {cargandoLineas && (
            <div className="lineas-listado__estado">
              Cargando lineas...
            </div>
          )}

          {!cargandoLineas && !errorLineas && lineasFiltradas.length === 0 && (
            <div className="lineas-listado__estado">
              No hay lineas para ese filtro.
            </div>
          )}

          {!cargandoLineas && lineasFiltradas.length > 0 && (
            <div className="lineas-listado__items">
              {lineasFiltradas.map((linea) => (
                <TarjetaLinea
                  key={linea.codigo}
                  linea={linea}
                  activa={lineaActiva?.codigo === linea.codigo}
                  onSeleccionar={() => seleccionarLinea(linea)}
                />
              ))}
            </div>
          )}
        </aside>

        {!esMovil && (
          <section className="linea-detalle">
            {!lineaActiva && !cargandoLineas && (
              <div className="linea-detalle__vacio">
                <BusFront size={24} />
                <h3>Selecciona una linea</h3>
                <p>
                  Aqui apareceran sus horarios, el sentido del recorrido y el mapa completo.
                </p>
              </div>
            )}

            {lineaActiva && (
              <DetalleLineaContenido
                cargandoDetalle={cargandoDetalle}
                detalleMapa={detalleMapa}
                detalleRecorrido={detalleRecorrido}
                errorDetalle={errorDetalle}
                grupoHorarioActivo={grupoHorarioActivo}
                gruposHorario={gruposHorario}
                lineaActiva={lineaActiva}
                onCambiarGrupoHorario={setGrupoHorarioActivoCodigo}
                onCambiarPestana={setPestanaDetalle}
                paradasVisibles={paradasVisibles}
                pestanaActiva={pestanaDetalle}
                sentidoActivo={sentidoActivo}
                sentidos={sentidos}
                setSentido={(sentido) => cargarDetalleSentido(lineaActiva, sentido)}
              />
            )}
          </section>
        )}
      </div>

      {esMovil && detalleMovilAbierto && lineaActiva && (
        <div className="linea-detalle-movil">
          <div
            className="linea-detalle-movil__fondo"
            onClick={() => setDetalleMovilAbierto(false)}
          />

          <section className="linea-detalle-movil__panel">
            <div className="linea-detalle-movil__tirador" />

            <DetalleLineaContenido
              cargandoDetalle={cargandoDetalle}
              detalleMapa={detalleMapa}
              detalleRecorrido={detalleRecorrido}
              errorDetalle={errorDetalle}
              esMovil
              grupoHorarioActivo={grupoHorarioActivo}
              gruposHorario={gruposHorario}
              lineaActiva={lineaActiva}
              onCambiarGrupoHorario={setGrupoHorarioActivoCodigo}
              onCambiarPestana={setPestanaDetalle}
              onCerrarMovil={() => setDetalleMovilAbierto(false)}
              paradasVisibles={paradasVisibles}
              pestanaActiva={pestanaDetalle}
              sentidoActivo={sentidoActivo}
              sentidos={sentidos}
              setSentido={(sentido) => cargarDetalleSentido(lineaActiva, sentido)}
            />
          </section>
        </div>
      )}
    </section>
  );
}

export default LineasPagina;
