import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import { resolverEstadoTiempoReal } from '../comunes/IndicadorTiempoReal';
import { obtenerRecorridoMapaLinea } from '../../servicios/lineasServicio';
import { obtenerParadasTrip } from '../../servicios/paradasTripServicio';
import MarcadorBusAnimado from './MarcadorBusAnimado';

function crearIconoMapa(tipo) {
  return L.divIcon({
    className: `marcador-mapa marcador-mapa--${tipo}`,
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function crearIconoParadaRecorrido(tipo) {
  return L.divIcon({
    className: `marcador-parada-recorrido marcador-parada-recorrido--${tipo}`,
    html: '<span></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function convertirNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function normalizarPuntoObjeto(punto) {
  const lat = convertirNumero(
    punto.lat ??
    punto.latitud ??
    punto.latitude ??
    punto.shapePtLat ??
    punto.shape_pt_lat
  );

  const lon = convertirNumero(
    punto.lon ??
    punto.lng ??
    punto.longitud ??
    punto.longitude ??
    punto.shapePtLon ??
    punto.shape_pt_lon
  );

  if (lat === null || lon === null) {
    return null;
  }

  return [lat, lon];
}

function normalizarPuntoArray(punto) {
  if (!Array.isArray(punto) || punto.length < 2) {
    return null;
  }

  const primero = convertirNumero(punto[0]);
  const segundo = convertirNumero(punto[1]);

  if (primero === null || segundo === null) {
    return null;
  }

  if (primero < -7 && primero > -10 && segundo > 41 && segundo < 43) {
    return [segundo, primero];
  }

  return [primero, segundo];
}

function normalizarPunto(punto) {
  if (Array.isArray(punto)) {
    return normalizarPuntoArray(punto);
  }

  if (punto && typeof punto === 'object') {
    return normalizarPuntoObjeto(punto);
  }

  return null;
}

function buscarArraysDePuntos(valor, resultado = []) {
  if (!valor) {
    return resultado;
  }

  if (Array.isArray(valor)) {
    const puntosDirectos = valor
      .map(normalizarPunto)
      .filter(Boolean);

    if (puntosDirectos.length >= 2) {
      resultado.push(puntosDirectos);
      return resultado;
    }

    valor.forEach((elemento) => buscarArraysDePuntos(elemento, resultado));
    return resultado;
  }

  if (typeof valor === 'object') {
    Object.values(valor).forEach((elemento) => buscarArraysDePuntos(elemento, resultado));
  }

  return resultado;
}

function extraerPuntosRecorrido(respuesta) {
  const posiblesListas = [
    respuesta?.puntos,
    respuesta?.puntosRecorrido,
    respuesta?.puntosMapa,
    respuesta?.coordenadas,
    respuesta?.recorrido,
    respuesta?.shape,
    respuesta?.geometry?.coordinates,
    respuesta?.features?.[0]?.geometry?.coordinates
  ];

  for (const lista of posiblesListas) {
    if (Array.isArray(lista)) {
      const puntos = lista
        .map(normalizarPunto)
        .filter(Boolean);

      if (puntos.length >= 2) {
        return puntos;
      }
    }
  }

  const arraysEncontrados = buscarArraysDePuntos(respuesta);

  if (arraysEncontrados.length === 0) {
    return [];
  }

  return arraysEncontrados.reduce((mejor, actual) => {
    return actual.length > mejor.length ? actual : mejor;
  }, []);
}

function calcularDistanciaMetros(puntoA, puntoB) {
  const radioTierra = 6371000;
  const lat1 = puntoA[0] * Math.PI / 180;
  const lat2 = puntoB[0] * Math.PI / 180;
  const diferenciaLat = (puntoB[0] - puntoA[0]) * Math.PI / 180;
  const diferenciaLon = (puntoB[1] - puntoA[1]) * Math.PI / 180;

  const a =
    Math.sin(diferenciaLat / 2) * Math.sin(diferenciaLat / 2) +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(diferenciaLon / 2) *
    Math.sin(diferenciaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierra * c;
}

function buscarIndicePuntoMasCercano(puntos, puntoReferencia) {
  let indiceMasCercano = 0;
  let distanciaMasCercana = Infinity;

  puntos.forEach((punto, indice) => {
    const distancia = calcularDistanciaMetros(punto, puntoReferencia);

    if (distancia < distanciaMasCercana) {
      distanciaMasCercana = distancia;
      indiceMasCercano = indice;
    }
  });

  return indiceMasCercano;
}

function recortarRecorridoEntreParadas(puntosBus, paradaOrigen, paradaDestino) {
  if (puntosBus.length < 2) {
    return [];
  }

  const indiceOrigen = buscarIndicePuntoMasCercano(puntosBus, paradaOrigen);
  const indiceDestino = buscarIndicePuntoMasCercano(puntosBus, paradaDestino);

  const inicio = Math.min(indiceOrigen, indiceDestino);
  const fin = Math.max(indiceOrigen, indiceDestino);

  const puntosRecortados = puntosBus.slice(inicio, fin + 1);

  if (puntosRecortados.length < 2) {
    return [paradaOrigen, paradaDestino];
  }

  return puntosRecortados;
}

function AjustarVistaMapa({ puntos }) {
  const map = useMap();

  useEffect(() => {
    if (puntos.length >= 2) {
      const limites = L.latLngBounds(puntos);

      map.fitBounds(limites, {
        padding: [45, 45]
      });
    }
  }, [map, puntos]);

  return null;
}

function obtenerPuntoLugar(lugar) {
  if (!lugar) {
    return null;
  }

  const lat = convertirNumero(
    lugar.lat ??
    lugar.latitud ??
    lugar.latitude
  );

  const lon = convertirNumero(
    lugar.lon ??
    lugar.lng ??
    lugar.longitud ??
    lugar.longitude
  );

  if (lat === null || lon === null) {
    return null;
  }

  return [lat, lon];
}

function obtenerStopIdParada(parada) {
  return (
    parada?.stopId ??
    parada?.stop_id ??
    parada?.gtfsStopId ??
    parada?.gtfs_stop_id ??
    null
  );
}

function normalizarTipoParada(tipo) {
  return String(tipo || 'INTERMEDIA').toUpperCase();
}

function normalizarParadaTrip(parada) {
  const punto = obtenerPuntoLugar(parada);

  if (!punto) {
    return null;
  }

  return {
    orden: parada.orden ?? parada.stopSequence ?? parada.stop_sequence,
    idParada: parada.idParada ?? parada.id ?? parada.paradaId,
    stopId: parada.stopId ?? parada.stop_id,
    nombre: parada.nombre ?? parada.stopName ?? parada.stop_name ?? 'Parada',
    lat: punto[0],
    lon: punto[1],
    horaLlegada: parada.horaLlegada ?? parada.arrivalTime ?? parada.arrival_time,
    horaSalida: parada.horaSalida ?? parada.departureTime ?? parada.departure_time,
    tipo: normalizarTipoParada(parada.tipo)
  };
}

function obtenerListaParadasTrip(respuesta) {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  return (
    respuesta?.paradas ||
    respuesta?.paradasTrip ||
    respuesta?.resultados ||
    []
  );
}

function obtenerTramoMapa(ruta, segmentoSeguimiento) {
  if (segmentoSeguimiento) {
    return segmentoSeguimiento;
  }

  if (ruta?.tramoMapaInicial) {
    return ruta.tramoMapaInicial;
  }

  if (Array.isArray(ruta?.tramos) && ruta.tramos.length > 0) {
    return ruta.tramos[0];
  }

  return {
    linea: ruta?.linea,
    tripId: ruta?.tripId,
    paradaSalida: ruta?.paradaOrigen,
    paradaLlegada: ruta?.paradaDestino
  };
}

function obtenerMinutosVisuales(ruta) {
  const posiblesValores = [
    ruta?.minutosInfoBus,
    ruta?.minutosTiempoReal,
    ruta?.minutosEsperaReal,
    ruta?.minutosEspera,
    ruta?.siguientesSalidas?.[0]?.minutos,
    ruta?.siguientesSalidas?.[0]?.minutosHastaSalida
  ];

  const valor = posiblesValores.find((item) => item !== undefined && item !== null);
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function calcularProgresoVisualBus({
  minutosVisuales,
  paradasTrip,
  segmentoSeguimiento,
  trayectoActivo
}) {
  const totalParadasSegmento = segmentoSeguimiento?.paradas?.length || 0;

  if (totalParadasSegmento > 1) {
    return Math.min(
      1,
      Math.max(0, (segmentoSeguimiento?.progresoIndice || 0) / (totalParadasSegmento - 1))
    );
  }

  if (paradasTrip.length > 1 && trayectoActivo?.estadoActual?.paradasRestantes !== undefined) {
    const totalSaltos = paradasTrip.length - 1;
    const completadas = Math.max(0, totalSaltos - trayectoActivo.estadoActual.paradasRestantes);

    return Math.min(1, completadas / totalSaltos);
  }

  if (minutosVisuales === null) {
    return 0.34;
  }

  if (minutosVisuales <= 3) {
    return 0.84;
  }

  if (minutosVisuales <= 5) {
    return 0.68;
  }

  return 0.38;
}

function MapaRuta({
  ruta,
  origen,
  destino,
  trayectoActivo = null,
  segmentoSeguimiento = null,
  ubicacionUsuario = null
}) {
  const [puntosBusCompletos, setPuntosBusCompletos] = useState([]);
  const [paradasTrip, setParadasTrip] = useState([]);
  const [cargandoRecorrido, setCargandoRecorrido] = useState(false);
  const [cargandoParadasTrip, setCargandoParadasTrip] = useState(false);
  const [errorRecorrido, setErrorRecorrido] = useState('');
  const [errorParadasTrip, setErrorParadasTrip] = useState('');

  const tramoMapa = useMemo(() => {
    return obtenerTramoMapa(ruta, segmentoSeguimiento);
  }, [ruta, segmentoSeguimiento]);

  const puntoOrigenUsuario = useMemo(() => {
    return ubicacionUsuario
      ? [ubicacionUsuario.lat, ubicacionUsuario.lon]
      : obtenerPuntoLugar(origen);
  }, [origen, ubicacionUsuario]);

  const puntoDestinoUsuario = useMemo(() => {
    return obtenerPuntoLugar(destino);
  }, [destino]);

  const paradaOrigen = useMemo(() => {
    return obtenerPuntoLugar(tramoMapa?.paradaSalida || ruta?.paradaOrigen);
  }, [ruta?.paradaOrigen, tramoMapa]);

  const paradaDestino = useMemo(() => {
    return obtenerPuntoLugar(tramoMapa?.paradaLlegada || ruta?.paradaDestino);
  }, [ruta?.paradaDestino, tramoMapa]);

  const stopOrigen = useMemo(() => {
    return obtenerStopIdParada(tramoMapa?.paradaSalida || ruta?.paradaOrigen);
  }, [ruta?.paradaOrigen, tramoMapa]);

  const stopDestino = useMemo(() => {
    return obtenerStopIdParada(tramoMapa?.paradaLlegada || ruta?.paradaDestino);
  }, [ruta?.paradaDestino, tramoMapa]);

  const lineaMapa = tramoMapa?.linea || ruta?.linea;
  const tripIdMapa = tramoMapa?.tripId || ruta?.tripId;

  useEffect(() => {
    async function cargarRecorridoBus() {
      setPuntosBusCompletos([]);
      setErrorRecorrido('');

      if (!lineaMapa || !tripIdMapa) {
        setErrorRecorrido('Selecciona una ruta para cargar el recorrido real.');
        return;
      }

      try {
        setCargandoRecorrido(true);

        const respuesta = await obtenerRecorridoMapaLinea({
          codigoLinea: lineaMapa,
          tripId: tripIdMapa
        });

        const puntos = extraerPuntosRecorrido(respuesta);

        if (puntos.length < 2) {
          setErrorRecorrido('El backend no ha devuelto puntos reales del recorrido.');
          return;
        }

        setPuntosBusCompletos(puntos);
      } catch {
        setErrorRecorrido('No se pudo cargar el recorrido real del bus.');
      } finally {
        setCargandoRecorrido(false);
      }
    }

    cargarRecorridoBus();
  }, [lineaMapa, tripIdMapa]);

  useEffect(() => {
    async function cargarParadasDelTrip() {
      setParadasTrip([]);
      setErrorParadasTrip('');

      if (!tripIdMapa) {
        return;
      }

      try {
        setCargandoParadasTrip(true);

        const respuesta = await obtenerParadasTrip({
          tripId: tripIdMapa,
          stopOrigen,
          stopDestino
        });

        const lista = obtenerListaParadasTrip(respuesta);

        const paradasNormalizadas = lista
          .map(normalizarParadaTrip)
          .filter(Boolean);

        setParadasTrip(paradasNormalizadas);
      } catch {
        setErrorParadasTrip('No se pudieron cargar las paradas intermedias.');
      } finally {
        setCargandoParadasTrip(false);
      }
    }

    cargarParadasDelTrip();
  }, [tripIdMapa, stopDestino, stopOrigen]);

  const puntosBusRecortados = useMemo(() => {
    if (puntosBusCompletos.length >= 2 && paradaOrigen && paradaDestino) {
      return recortarRecorridoEntreParadas(
        puntosBusCompletos,
        paradaOrigen,
        paradaDestino
      );
    }

    return [];
  }, [puntosBusCompletos, paradaOrigen, paradaDestino]);

  const puntosAndandoOrigen = useMemo(() => {
    if (puntoOrigenUsuario && paradaOrigen) {
      return [puntoOrigenUsuario, paradaOrigen];
    }

    return [];
  }, [puntoOrigenUsuario, paradaOrigen]);

  const puntosAndandoDestino = useMemo(() => {
    if (paradaDestino && puntoDestinoUsuario) {
      return [paradaDestino, puntoDestinoUsuario];
    }

    return [];
  }, [paradaDestino, puntoDestinoUsuario]);

  const puntosMapa = useMemo(() => {
    return [
      ...puntosAndandoOrigen,
      ...puntosBusRecortados,
      ...puntosAndandoDestino
    ].filter(Boolean);
  }, [puntosAndandoOrigen, puntosBusRecortados, puntosAndandoDestino]);

  const paradasIntermedias = useMemo(() => {
    return paradasTrip.filter((parada) => {
      const esSubida = parada.tipo === 'SUBIDA' || parada.stopId === stopOrigen;
      const esBajada = parada.tipo === 'BAJADA' || parada.stopId === stopDestino;

      return !esSubida && !esBajada;
    });
  }, [paradasTrip, stopDestino, stopOrigen]);

  const numeroParadasHastaBajar = useMemo(() => {
    if (paradasTrip.length <= 1) {
      return 0;
    }

    return paradasTrip.length - 1;
  }, [paradasTrip]);

  const centroMapa = puntoOrigenUsuario || paradaOrigen || [42.232045931, -8.708603793];
  const minutosVisuales = useMemo(() => obtenerMinutosVisuales(ruta), [ruta]);
  const progresoBusVisual = useMemo(() => {
    return calcularProgresoVisualBus({
      minutosVisuales,
      paradasTrip,
      segmentoSeguimiento,
      trayectoActivo
    });
  }, [minutosVisuales, paradasTrip, segmentoSeguimiento, trayectoActivo]);
  const estadoBusVisual = useMemo(() => {
    return resolverEstadoTiempoReal(
      minutosVisuales,
      minutosVisuales === null ? 'ESTIMADO' : 'TIEMPO_REAL'
    );
  }, [minutosVisuales]);

  const paradaSiguienteTrayecto = trayectoActivo?.estadoActual?.paradaSiguiente
    ? [trayectoActivo.estadoActual.paradaSiguiente.lat, trayectoActivo.estadoActual.paradaSiguiente.lon]
    : null;

  return (
    <div className="mapa-ruta">
      {cargandoRecorrido && (
        <div className="mapa-ruta__estado">
          Cargando recorrido real del bus...
        </div>
      )}

      {cargandoParadasTrip && (
        <div className="mapa-ruta__estado mapa-ruta__estado--secundario">
          Cargando paradas del recorrido...
        </div>
      )}

      {!cargandoRecorrido && !cargandoParadasTrip && puntosBusRecortados.length >= 2 && (
        <div className="mapa-ruta__estado">
          {trayectoActivo?.estadoActual
            ? `Seguimiento activo - ${trayectoActivo.estadoActual.paradasRestantes} paradas restantes`
            : `Ruta cargada - baja dentro de ${numeroParadasHastaBajar} paradas`}
        </div>
      )}

      {!cargandoRecorrido && puntosBusRecortados.length >= 2 && (
        <div className="mapa-ruta__estado mapa-ruta__estado--bus">
          {estadoBusVisual.valor} - {estadoBusVisual.estado} ({estadoBusVisual.origen})
        </div>
      )}

      {!cargandoRecorrido && errorRecorrido && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error">
          {errorRecorrido}
        </div>
      )}

      {!cargandoParadasTrip && errorParadasTrip && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error">
          {errorParadasTrip}
        </div>
      )}

      <MapContainer
        center={centroMapa}
        zoom={14}
        scrollWheelZoom
        className="mapa-ruta__leaflet"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarVistaMapa puntos={puntosMapa.length >= 2 ? puntosMapa : [centroMapa]} />

        {puntosAndandoOrigen.length >= 2 && (
          <Polyline
            positions={puntosAndandoOrigen}
            className="mapa-ruta__linea-andando"
          />
        )}

        {puntosBusRecortados.length >= 2 && (
          <Polyline
            positions={puntosBusRecortados}
            className="mapa-ruta__linea-bus"
          />
        )}

        {puntosAndandoDestino.length >= 2 && (
          <Polyline
            positions={puntosAndandoDestino}
            className="mapa-ruta__linea-andando"
          />
        )}

        {paradasIntermedias.map((parada, indice) => (
          <Marker
            key={`parada-intermedia-${parada.stopId}-${parada.orden}-${indice}`}
            position={[parada.lat, parada.lon]}
            icon={crearIconoParadaRecorrido('intermedia')}
          >
            <Popup>
              <div className="popup-parada">
                <strong>{parada.nombre}</strong>
                <span>Parada intermedia</span>
                <span>
                  Parada {indice + 1} de {paradasIntermedias.length}
                </span>
                {parada.horaSalida && (
                  <span>
                    Hora aproximada: {parada.horaSalida}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {puntoOrigenUsuario && (
          <Marker position={puntoOrigenUsuario} icon={crearIconoMapa('usuario')}>
            <Popup>
              {ubicacionUsuario ? 'Tu ubicacion actual' : (origen?.nombre || 'Origen')}
            </Popup>
          </Marker>
        )}

        {paradaOrigen && (
          <Marker position={paradaOrigen} icon={crearIconoMapa('parada')}>
            <Popup>
              <div className="popup-parada">
                <strong>{tramoMapa?.paradaSalida?.nombre || ruta?.paradaOrigen?.nombre || 'Parada de subida'}</strong>
                <span>Parada donde subes</span>
                <span>ID InfoBus: {tramoMapa?.paradaSalida?.id || ruta?.paradaOrigen?.id || 'Sin id'}</span>
                <span>GTFS stop_id: {stopOrigen || 'Sin stop_id'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {paradaDestino && (
          <Marker position={paradaDestino} icon={crearIconoMapa('parada')}>
            <Popup>
              <div className="popup-parada">
                <strong>{tramoMapa?.paradaLlegada?.nombre || ruta?.paradaDestino?.nombre || 'Parada de bajada'}</strong>
                <span>Parada donde bajas</span>
                <span>ID InfoBus: {tramoMapa?.paradaLlegada?.id || ruta?.paradaDestino?.id || 'Sin id'}</span>
                <span>GTFS stop_id: {stopDestino || 'Sin stop_id'}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {paradaSiguienteTrayecto && (
          <Marker position={paradaSiguienteTrayecto} icon={crearIconoMapa('transbordo')}>
            <Popup>
              <div className="popup-parada">
                <strong>{trayectoActivo?.estadoActual?.paradaSiguiente?.nombre || 'Siguiente parada'}</strong>
                <span>Siguiente parada del trayecto activo</span>
              </div>
            </Popup>
          </Marker>
        )}

        {puntosBusRecortados.length >= 2 && (
          <MarcadorBusAnimado
            puntos={puntosBusRecortados}
            progreso={progresoBusVisual}
            tiempoReal={minutosVisuales !== null}
          />
        )}

        {puntoDestinoUsuario && (
          <Marker position={puntoDestinoUsuario} icon={crearIconoMapa('destino')}>
            <Popup>
              {destino?.nombre || 'Destino'}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default MapaRuta;
