import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';

function convertirNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function normalizarColorLinea(color) {
  if (!color) {
    return '#ff6b3d';
  }

  const texto = String(color).replace('#', '').trim();

  if (!texto) {
    return '#ff6b3d';
  }

  return `#${texto}`;
}

function crearIconoMapa(tipo) {
  return L.divIcon({
    className: `marcador-mapa marcador-mapa--${tipo}`,
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function crearIconoParadaRecorrido() {
  return L.divIcon({
    className: 'marcador-parada-recorrido marcador-parada-recorrido--intermedia',
    html: '<span></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function AjustarVistaMapa({ puntos }) {
  const map = useMap();

  useEffect(() => {
    if (puntos.length >= 2) {
      map.fitBounds(L.latLngBounds(puntos), {
        padding: [40, 40]
      });
      return;
    }

    if (puntos.length === 1) {
      map.flyTo(puntos[0], 14, {
        duration: 0.6
      });
    }
  }, [map, puntos]);

  return null;
}

function obtenerPuntosTrazado(detalleMapa) {
  return (detalleMapa?.trazado || [])
    .map((punto) => {
      const lat = convertirNumero(punto?.lat);
      const lon = convertirNumero(punto?.lon);

      if (lat === null || lon === null) {
        return null;
      }

      return [lat, lon];
    })
    .filter(Boolean);
}

function obtenerParadas(detalleMapa, detalleRecorrido) {
  const paradasBase = Array.isArray(detalleRecorrido?.paradas) && detalleRecorrido.paradas.length > 0
    ? detalleRecorrido.paradas
    : (detalleMapa?.paradas || []);

  return paradasBase
    .map((parada) => {
      const lat = convertirNumero(parada?.lat);
      const lon = convertirNumero(parada?.lon);

      if (lat === null || lon === null) {
        return null;
      }

      return {
        orden: parada?.orden,
        stopId: parada?.stopId,
        nombre: parada?.nombre || 'Parada',
        lat,
        lon,
        horaLlegada: parada?.horaLlegada,
        horaSalida: parada?.horaSalida
      };
    })
    .filter(Boolean);
}

function MapaLineaDetalle({
  detalleMapa,
  detalleRecorrido,
  destino,
  cargando = false
}) {
  const puntosTrazado = useMemo(() => obtenerPuntosTrazado(detalleMapa), [detalleMapa]);
  const paradas = useMemo(
    () => obtenerParadas(detalleMapa, detalleRecorrido),
    [detalleMapa, detalleRecorrido]
  );

  const puntosVista = useMemo(() => {
    const puntosParadas = paradas.map((parada) => [parada.lat, parada.lon]);

    return [
      ...puntosTrazado,
      ...puntosParadas
    ];
  }, [paradas, puntosTrazado]);

  const centroMapa = puntosVista[0] || [42.232045931, -8.708603793];
  const colorLinea = normalizarColorLinea(detalleMapa?.color);
  const ultimoIndice = paradas.length - 1;

  return (
    <div className="linea-detalle-mapa">
      {cargando && (
        <div className="mapa-ruta__estado">
          Cargando recorrido de la linea...
        </div>
      )}

      {!cargando && puntosTrazado.length >= 2 && (
        <div className="mapa-ruta__estado">
          {destino || 'Recorrido cargado'} - {paradas.length || detalleMapa?.totalParadas || 0} paradas
        </div>
      )}

      {!cargando && puntosTrazado.length < 2 && (
        <div className="linea-detalle-mapa__vacio">
          Todavia no hay trazado suficiente para pintar esta linea.
        </div>
      )}

      <MapContainer
        center={centroMapa}
        zoom={13}
        scrollWheelZoom
        className="linea-detalle-mapa__leaflet"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarVistaMapa puntos={puntosVista.length > 0 ? puntosVista : [centroMapa]} />

        {puntosTrazado.length >= 2 && (
          <Polyline
            positions={puntosTrazado}
            pathOptions={{
              color: colorLinea,
              weight: 5,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {paradas.map((parada, indice) => {
          const esPrimera = indice === 0;
          const esUltima = indice === ultimoIndice;
          const icono = esPrimera
            ? crearIconoMapa('origen')
            : (esUltima ? crearIconoMapa('destino') : crearIconoParadaRecorrido());

          return (
            <Marker
              key={`${parada.stopId || parada.nombre}-${indice}`}
              position={[parada.lat, parada.lon]}
              icon={icono}
            >
              <Popup>
                <div className="popup-parada">
                  <strong>{parada.nombre}</strong>
                  <span>
                    {esPrimera
                      ? 'Cabecera de salida'
                      : (esUltima ? 'Cabecera de llegada' : `Parada ${indice + 1}`)}
                  </span>

                  {parada.horaSalida && (
                    <span>Salida: {parada.horaSalida}</span>
                  )}

                  {parada.horaLlegada && (
                    <span>Llegada: {parada.horaLlegada}</span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapaLineaDetalle;
