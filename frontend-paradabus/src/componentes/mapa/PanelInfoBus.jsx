import { BusFront, Clock, X } from 'lucide-react';

import IndicadorTiempoReal from '../comunes/IndicadorTiempoReal';
import MensajeError from '../comunes/MensajeError';
import SkeletonTarjeta from '../comunes/SkeletonTarjeta';

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

function PanelInfoBus({
  buses,
  cargando,
  error,
  onActualizar,
  onCerrar,
  parada
}) {
  return (
    <div className="panel-infobus">
      {onCerrar && (
        <button
          type="button"
          className="panel-infobus__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar panel"
        >
          <X size={18} />
        </button>
      )}

      <div className="panel-infobus__cabecera">
        <div className="panel-infobus__icono">
          <BusFront size={22} />
        </div>

        <div>
          <p>Proximo bus</p>
          <h2>{parada?.nombre || 'Parada'}</h2>
          <span>{parada?.lineasOriginal || 'Consulta de buses y tiempos'}</span>
        </div>
      </div>

      <div className="panel-infobus__acciones">
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
        >
          <Clock size={16} />
          Actualizar
        </button>
      </div>

      {cargando && (
        <div className="panel-infobus__skeleton">
          <SkeletonTarjeta cantidad={3} variante="infobus" />
        </div>
      )}

      <MensajeError className="panel-infobus__error-panel">
        {error}
      </MensajeError>

      {!cargando && !error && (!buses || buses.length === 0) && (
        <p className="panel-infobus__vacio">
          Sin buses proximos
        </p>
      )}

      {!cargando && !error && Array.isArray(buses) && buses.length > 0 && (
        <div className="panel-infobus__lista">
          {buses.map((bus, indice) => (
            <article
              className="panel-infobus__item"
              key={`${obtenerTextoLinea(bus)}-${indice}`}
            >
              <span className="panel-infobus__linea">
                {obtenerTextoLinea(bus)}
              </span>

              <div className="panel-infobus__datos">
                <strong>{obtenerTextoRuta(bus)}</strong>

                <small>
                  <Clock size={14} />
                  {bus.fuente === 'TIEMPO_REAL' ? 'Tiempo real' : 'Horario estimado'}
                </small>
              </div>

              <IndicadorTiempoReal
                compacto
                fuente={bus.fuente || 'ESTIMADO'}
                minutos={obtenerMinutos(bus)}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default PanelInfoBus;
