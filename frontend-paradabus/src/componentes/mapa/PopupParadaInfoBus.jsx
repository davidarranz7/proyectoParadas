import { useState } from 'react';
import { BusFront, Clock } from 'lucide-react';

import { obtenerInfoBusParada } from '../../servicios/infobusServicio';

function obtenerListaInfoBus(respuesta) {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  return (
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
    'Línea'
  );
}

function obtenerTextoDestino(item) {
  return (
    item.destino ||
    item.destinoBus ||
    item.cabecera ||
    item.nombreDestino ||
    item.tripHeadsign ||
    item.trip_headsign ||
    ''
  );
}

function obtenerTextoTiempo(item) {
  const minutos =
    item.minutos ??
    item.minutosLlegada ??
    item.tiempoMinutos ??
    item.tiempoEsperaMinutos;

  if (minutos !== undefined && minutos !== null) {
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

function PopupParadaInfoBus({ parada, zona }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [infoBus, setInfoBus] = useState(null);

  async function verInfoBus() {
    setError('');
    setInfoBus(null);

    if (!parada?.id) {
      setError('Esta parada no tiene ID de InfoBus.');
      return;
    }

    try {
      setCargando(true);

      const respuesta = await obtenerInfoBusParada(parada.id);
      const lista = obtenerListaInfoBus(respuesta);

      setInfoBus(lista);
    } catch (errorBackend) {
      setError(
        errorBackend.message ||
        'No se pudo cargar InfoBus de esta parada.'
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="popup-parada">
      <strong>{parada?.nombre || 'Parada'}</strong>

      {zona && (
        <span>
          Zona: {zona}
        </span>
      )}

      {parada?.distanciaMetros !== undefined && parada?.distanciaMetros !== null && (
        <span>
          Distancia: {parada.distanciaMetros} m
        </span>
      )}

      <span>
        ID InfoBus: {parada?.id || 'Sin id'}
      </span>

      <span>
        GTFS stop_id: {parada?.stopId || 'Sin stop_id'}
      </span>

      <button
        type="button"
        className="boton-infobus"
        onClick={verInfoBus}
        disabled={cargando || !parada?.id}
      >
        <BusFront size={15} />
        {cargando ? 'Cargando InfoBus...' : 'Ver InfoBus'}
      </button>

      {error && (
        <p className="popup-parada__error">
          {error}
        </p>
      )}

      {infoBus && infoBus.length === 0 && (
        <p className="popup-parada__vacio">
          No hay próximos buses disponibles ahora.
        </p>
      )}

      {infoBus && infoBus.length > 0 && (
        <div className="popup-infobus-lista">
          {infoBus.map((item, indice) => (
            <div
              className="popup-infobus-item"
              key={`${obtenerTextoLinea(item)}-${indice}`}
            >
              <span className="popup-infobus-item__linea">
                {obtenerTextoLinea(item)}
              </span>

              <div>
                <strong>
                  {obtenerTextoDestino(item) || 'Próximo bus'}
                </strong>

                <small>
                  <Clock size={13} />
                  {obtenerTextoTiempo(item)}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PopupParadaInfoBus;