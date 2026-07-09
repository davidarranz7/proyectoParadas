import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import { obtenerRecorridoMapaLinea } from '../../servicios/lineasServicio';
import { obtenerParadasCercanas } from '../../servicios/paradasServicio';
import PopupParadaInfoBus from './PopupParadaInfoBus';

function crearIconoMapa(tipo) {
  return L.divIcon({
    className: `marcador-mapa marcador-mapa--${tipo}`,
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function crearIconoParadaCercana(tipo) {
  return L.divIcon({
    className: `marcador-parada-cercana marcador-parada-cercana--${tipo}`,
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

function normalizarParada(parada, puntoReferencia) {
  const punto = obtenerPuntoLugar(parada);

  if (!punto) {
    return null;
  }

  const distanciaMetros = puntoReferencia
    ? Math.round(calcularDistanciaMetros(puntoReferencia, punto))
    : null;

  return {
    id: parada.id ?? parada.paradaId ?? parada.codigo ?? parada.codigoParada,
    stopId: parada.stopId ?? parada.stop_id ?? parada.gtfsStopId,
    nombre: parada.nombre ?? parada.name ?? parada.denominacion ?? 'Parada sin nombre',
    lat: punto[0],
    lon: punto[1],
    distanciaMetros
  };
}

function quitarParadasDuplicadas(paradas) {
  const mapa = new Map();

  paradas.forEach((parada) => {
    const clave = `${parada.id || ''}-${parada.stopId || ''}-${parada.lat}-${parada.lon}`;

    if (!mapa.has(clave)) {
      mapa.set(clave, parada);
    }
  });

  return Array.from(mapa.values());
}

function normalizarParadaRuta(parada, nombreFallback) {
  return {
    id: parada?.id ?? parada?.paradaId ?? parada?.codigo ?? parada?.codigoParada,
    stopId: parada?.stopId ?? parada?.stop_id ?? parada?.gtfsStopId,
    nombre: parada?.nombre ?? parada?.name ?? parada?.denominacion ?? nombreFallback,
    lat: parada?.lat ?? parada?.latitud ?? parada?.latitude,
    lon: parada?.lon ?? parada?.lng ?? parada?.longitud ?? parada?.longitude
  };
}

function MapaRuta({ ruta, origen, destino }) {
  const [puntosBusCompletos, setPuntosBusCompletos] = useState([]);
  const [paradasOrigen, setParadasOrigen] = useState([]);
  const [paradasDestino, setParadasDestino] = useState([]);

  const [cargandoRecorrido, setCargandoRecorrido] = useState(false);
  const [cargandoParadas, setCargandoParadas] = useState(false);

  const [errorRecorrido, setErrorRecorrido] = useState('');
  const [errorParadas, setErrorParadas] = useState('');

  const puntoOrigenUsuario = useMemo(() => {
    return obtenerPuntoLugar(origen);
  }, [origen]);

  const puntoDestinoUsuario = useMemo(() => {
    return obtenerPuntoLugar(destino);
  }, [destino]);

  const paradaOrigen = useMemo(() => {
    return obtenerPuntoLugar(ruta?.paradaOrigen);
  }, [ruta?.paradaOrigen]);

  const paradaDestino = useMemo(() => {
    return obtenerPuntoLugar(ruta?.paradaDestino);
  }, [ruta?.paradaDestino]);

  useEffect(() => {
    async function cargarParadasCercanas() {
      setParadasOrigen([]);
      setParadasDestino([]);
      setErrorParadas('');

      if (!puntoOrigenUsuario && !puntoDestinoUsuario) {
        return;
      }

      try {
        setCargandoParadas(true);

        const [respuestaOrigen, respuestaDestino] = await Promise.all([
          puntoOrigenUsuario
            ? obtenerParadasCercanas({
                lat: puntoOrigenUsuario[0],
                lon: puntoOrigenUsuario[1],
                radioMetros: 500
              })
            : Promise.resolve([]),

          puntoDestinoUsuario
            ? obtenerParadasCercanas({
                lat: puntoDestinoUsuario[0],
                lon: puntoDestinoUsuario[1],
                radioMetros: 500
              })
            : Promise.resolve([])
        ]);

        const paradasOrigenNormalizadas = respuestaOrigen
          .map((parada) => normalizarParada(parada, puntoOrigenUsuario))
          .filter(Boolean)
          .sort((a, b) => (a.distanciaMetros ?? 99999) - (b.distanciaMetros ?? 99999));

        const paradasDestinoNormalizadas = respuestaDestino
          .map((parada) => normalizarParada(parada, puntoDestinoUsuario))
          .filter(Boolean)
          .sort((a, b) => (a.distanciaMetros ?? 99999) - (b.distanciaMetros ?? 99999));

        setParadasOrigen(quitarParadasDuplicadas(paradasOrigenNormalizadas));
        setParadasDestino(quitarParadasDuplicadas(paradasDestinoNormalizadas));
      } catch (error) {
        console.error('Error cargando paradas cercanas:', error);
        setErrorParadas('No se pudieron cargar las paradas cercanas.');
      } finally {
        setCargandoParadas(false);
      }
    }

    cargarParadasCercanas();
  }, [puntoOrigenUsuario, puntoDestinoUsuario]);

  useEffect(() => {
    async function cargarRecorridoBus() {
      setPuntosBusCompletos([]);
      setErrorRecorrido('');

      if (!ruta?.linea || !ruta?.tripId) {
        setErrorRecorrido('Selecciona una ruta para cargar el recorrido real.');
        return;
      }

      try {
        setCargandoRecorrido(true);

        const respuesta = await obtenerRecorridoMapaLinea({
          codigoLinea: ruta.linea,
          tripId: ruta.tripId
        });

        const puntos = extraerPuntosRecorrido(respuesta);

        if (puntos.length < 2) {
          setErrorRecorrido('El backend no ha devuelto puntos reales del recorrido.');
          return;
        }

        setPuntosBusCompletos(puntos);
      } catch (error) {
        console.error('Error cargando recorrido real del bus:', error);
        setErrorRecorrido('No se pudo cargar el recorrido real del bus.');
      } finally {
        setCargandoRecorrido(false);
      }
    }

    cargarRecorridoBus();
  }, [ruta?.linea, ruta?.tripId]);

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

  const paradasCercanas = useMemo(() => {
    return quitarParadasDuplicadas([
      ...paradasOrigen.map((parada) => ({
        ...parada,
        zona: 'origen'
      })),
      ...paradasDestino.map((parada) => ({
        ...parada,
        zona: 'destino'
      }))
    ]);
  }, [paradasOrigen, paradasDestino]);

  const paradaOrigenPopup = useMemo(() => {
    return normalizarParadaRuta(ruta?.paradaOrigen, 'Parada de subida');
  }, [ruta?.paradaOrigen]);

  const paradaDestinoPopup = useMemo(() => {
    return normalizarParadaRuta(ruta?.paradaDestino, 'Parada de bajada');
  }, [ruta?.paradaDestino]);

  const centroMapa = puntoOrigenUsuario || paradaOrigen || [42.232045931, -8.708603793];

  return (
    <div className="mapa-ruta">
      {cargandoRecorrido && (
        <div className="mapa-ruta__estado">
          Cargando recorrido real del bus...
        </div>
      )}

      {cargandoParadas && (
        <div className="mapa-ruta__estado mapa-ruta__estado--secundario">
          Cargando paradas cercanas...
        </div>
      )}

      {!cargandoRecorrido && !cargandoParadas && puntosBusRecortados.length >= 2 && (
        <div className="mapa-ruta__estado">
          Ruta cargada · {paradasOrigen.length} paradas cerca del origen · {paradasDestino.length} cerca del destino
        </div>
      )}

      {!cargandoRecorrido && errorRecorrido && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error">
          {errorRecorrido}
        </div>
      )}

      {!cargandoParadas && errorParadas && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error">
          {errorParadas}
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

        {paradasCercanas.map((parada) => (
          <Marker
            key={`parada-cercana-${parada.zona}-${parada.id}-${parada.stopId}-${parada.lat}-${parada.lon}`}
            position={[parada.lat, parada.lon]}
            icon={crearIconoParadaCercana(parada.zona)}
          >
            <Popup>
              <PopupParadaInfoBus
                parada={parada}
                zona={parada.zona === 'origen' ? 'cerca del origen' : 'cerca del destino'}
              />
            </Popup>
          </Marker>
        ))}

        {puntoOrigenUsuario && (
          <Marker position={puntoOrigenUsuario} icon={crearIconoMapa('usuario')}>
            <Popup>
              {origen?.nombre || 'Origen'}
            </Popup>
          </Marker>
        )}

        {paradaOrigen && (
          <Marker position={paradaOrigen} icon={crearIconoMapa('parada')}>
            <Popup>
              <PopupParadaInfoBus
                parada={paradaOrigenPopup}
                zona="parada elegida para subir"
              />
            </Popup>
          </Marker>
        )}

        {paradaDestino && (
          <Marker position={paradaDestino} icon={crearIconoMapa('parada')}>
            <Popup>
              <PopupParadaInfoBus
                parada={paradaDestinoPopup}
                zona="parada elegida para bajar"
              />
            </Popup>
          </Marker>
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