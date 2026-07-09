import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Polyline, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import { obtenerRecorridoMapaLinea } from '../../servicios/lineasServicio';

function crearIconoMapa(tipo) {
  return L.divIcon({
    className: `marcador-mapa marcador-mapa--${tipo}`,
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
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

  // GeoJSON suele venir como [lon, lat]
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

function MapaRuta({ ruta }) {
  const [puntosBusCompletos, setPuntosBusCompletos] = useState([]);
  const [cargandoRecorrido, setCargandoRecorrido] = useState(false);
  const [errorRecorrido, setErrorRecorrido] = useState('');

  const paradaOrigen = useMemo(() => {
    if (ruta?.paradaOrigen) {
      return [ruta.paradaOrigen.lat, ruta.paradaOrigen.lon];
    }

    return [42.232045931, -8.708603793];
  }, [ruta?.paradaOrigen]);

  const paradaDestino = useMemo(() => {
    if (ruta?.paradaDestino) {
      return [ruta.paradaDestino.lat, ruta.paradaDestino.lon];
    }

    return [42.21315264, -8.738470803];
  }, [ruta?.paradaDestino]);

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
    if (puntosBusCompletos.length >= 2) {
      return recortarRecorridoEntreParadas(
        puntosBusCompletos,
        paradaOrigen,
        paradaDestino
      );
    }

    return [];
  }, [puntosBusCompletos, paradaOrigen, paradaDestino]);

  const puntosMapa = useMemo(() => {
    if (puntosBusRecortados.length >= 2) {
      return puntosBusRecortados;
    }

    return [paradaOrigen, paradaDestino];
  }, [puntosBusRecortados, paradaOrigen, paradaDestino]);

  return (
    <div className="mapa-ruta">
      {cargandoRecorrido && (
        <div className="mapa-ruta__estado">
          Cargando recorrido real del bus...
        </div>
      )}

      {!cargandoRecorrido && puntosBusRecortados.length >= 2 && (
        <div className="mapa-ruta__estado">
          Tramo real cargado · {puntosBusRecortados.length} puntos
        </div>
      )}

      {!cargandoRecorrido && errorRecorrido && (
        <div className="mapa-ruta__estado mapa-ruta__estado--error">
          {errorRecorrido}
        </div>
      )}

      <MapContainer
        center={paradaOrigen}
        zoom={14}
        scrollWheelZoom
        className="mapa-ruta__leaflet"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarVistaMapa puntos={puntosMapa} />

        <Polyline
          positions={puntosMapa}
          className="mapa-ruta__linea"
        />

        <Marker position={paradaOrigen} icon={crearIconoMapa('origen')}>
          <Popup>
            {ruta?.paradaOrigen?.nombre || 'Parada de subida'}
          </Popup>
        </Marker>

        <Marker position={paradaDestino} icon={crearIconoMapa('destino')}>
          <Popup>
            {ruta?.paradaDestino?.nombre || 'Parada de bajada'}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapaRuta;