import { useState } from 'react';
import {
  ArrowRight,
  BusFront,
  Clock,
  Footprints,
  MapPin,
  Route,
  Search
} from 'lucide-react';

import SelectorLugar from '../componentes/comunes/SelectorLugar';
import { buscarRutasDirectas } from '../servicios/rutasServicio';
import MapaRuta from '../componentes/mapa/MapaRuta';

function obtenerFechaHoy() {
  const fecha = new Date();

  const anyo = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anyo}-${mes}-${dia}`;
}

function obtenerHoraActual() {
  const fecha = new Date();

  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');

  return `${horas}:${minutos}:00`;
}

function obtenerMensajeErrorUbicacion(error) {
  if (error.code === 1) {
    return 'Has rechazado el permiso de ubicación.';
  }

  if (error.code === 2) {
    return 'No se pudo obtener tu ubicación actual.';
  }

  if (error.code === 3) {
    return 'La ubicación está tardando demasiado. Inténtalo otra vez.';
  }

  return 'No se pudo obtener tu ubicación.';
}

function InicioPagina() {
  const [origenSeleccionado, setOrigenSeleccionado] = useState(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);

  const [buscando, setBuscando] = useState(false);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);

  const [resultado, setResultado] = useState(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);

  const [error, setError] = useState('');
  const [errorUbicacion, setErrorUbicacion] = useState('');

  const opciones = resultado?.opciones || [];
  const rutaPanel = rutaSeleccionada;

  function limpiarResultados() {
    setResultado(null);
    setRutaSeleccionada(null);
  }

  function cambiarOrigen(lugar) {
    setOrigenSeleccionado(lugar);
    setError('');
    limpiarResultados();
  }

  function cambiarDestino(lugar) {
    setDestinoSeleccionado(lugar);
    setError('');
    limpiarResultados();
  }

  function pedirUbicacionActual() {
    setError('');
    setErrorUbicacion('');

    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite usar ubicación.');
      return;
    }

    setCargandoUbicacion(true);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lat = posicion.coords.latitude;
        const lon = posicion.coords.longitude;

        const lugarUbicacionActual = {
          id: 'ubicacion-actual',
          nombre: 'Mi ubicación actual',
          descripcion: 'Ubicación exacta del dispositivo',
          lat,
          lon,
          tipo: 'ubicacion'
        };

        setOrigenSeleccionado(lugarUbicacionActual);
        setCargandoUbicacion(false);
        limpiarResultados();
      },
      (errorUbicacionNavegador) => {
        setErrorUbicacion(obtenerMensajeErrorUbicacion(errorUbicacionNavegador));
        setOrigenSeleccionado(null);
        setCargandoUbicacion(false);
        limpiarResultados();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  function elegirOrigenEnMapa() {
    setError('En el siguiente paso activamos elegir origen manualmente en el mapa.');
  }

  function elegirDestinoEnMapa() {
    setError('En el siguiente paso activamos elegir destino manualmente en el mapa.');
  }

  async function buscarRuta() {
    setError('');
    setErrorUbicacion('');
    setResultado(null);
    setRutaSeleccionada(null);

    if (!origenSeleccionado) {
      setError('Selecciona un origen o usa tu ubicación actual.');
      return;
    }

    if (!destinoSeleccionado) {
      setError('Selecciona un destino de las sugerencias.');
      return;
    }

    try {
      setBuscando(true);

      const respuesta = await buscarRutasDirectas({
        origenLat: origenSeleccionado.lat,
        origenLon: origenSeleccionado.lon,
        destinoLat: destinoSeleccionado.lat,
        destinoLon: destinoSeleccionado.lon,
        fecha: obtenerFechaHoy(),
        hora: obtenerHoraActual(),
        maxResultados: 5
      });

      setResultado(respuesta);
      setRutaSeleccionada(respuesta.opciones?.[0] || null);
    } catch (errorBackend) {
      setError(
        errorBackend.message ||
        'No se pudo conectar con el backend de rutas.'
      );
    } finally {
      setBuscando(false);
    }
  }

  return (
    <section className="inicio-layout">
      <div className="inicio-layout__buscador">
        <section className="pagina-inicio">
          <div className="inicio-cabecera">
            <p className="pagina-inicio__mini">Planificador de ruta</p>

            <h1>¿A dónde quieres ir?</h1>

            <p>
              Busca rutas en bus por Vigo teniendo en cuenta paradas cercanas,
              tiempo andando, esperas y transbordos.
            </p>
          </div>

          <form className="buscador-ruta">
            <SelectorLugar
              etiqueta="Origen"
              placeholder="Escribe un origen o usa tu ubicación"
              tipo="origen"
              valor={origenSeleccionado}
              onSeleccionar={cambiarOrigen}
              onUsarUbicacionActual={pedirUbicacionActual}
              onElegirEnMapa={elegirOrigenEnMapa}
            />

            {cargandoUbicacion && (
              <p className="mensaje-info">
                Obteniendo tu ubicación actual...
              </p>
            )}

            {errorUbicacion && (
              <p className="mensaje-error">
                {errorUbicacion}
              </p>
            )}

            <SelectorLugar
              etiqueta="Destino"
              placeholder="Ej: Samil, Plaza América, Vialia..."
              tipo="destino"
              valor={destinoSeleccionado}
              onSeleccionar={cambiarDestino}
              onElegirEnMapa={elegirDestinoEnMapa}
            />

            {error && (
              <p className="mensaje-error">
                {error}
              </p>
            )}

            <button
              className="boton-buscar"
              type="button"
              onClick={buscarRuta}
              disabled={buscando || cargandoUbicacion}
            >
              <Search size={20} />
              {buscando ? 'Buscando ruta...' : 'Buscar ruta'}
            </button>
          </form>

          {resultado && (
            <section className="resultados-rutas">
              <div className="resultados-rutas__cabecera">
                <div>
                  <p className="pagina-inicio__mini">Resultados</p>
                  <h2>{resultado.totalOpciones} opciones encontradas</h2>
                </div>

                <span>
                  {resultado.horaConsulta}
                </span>
              </div>

              {opciones.length === 0 && (
                <p className="mensaje-error">
                  {resultado.mensaje || 'No se encontraron rutas disponibles.'}
                </p>
              )}

              {opciones.map((opcion, indice) => {
                const seleccionada = rutaSeleccionada?.tripId === opcion.tripId;

                return (
                  <button
                    type="button"
                    className={
                      seleccionada
                        ? 'resultado-busqueda-demo resultado-busqueda-demo--boton resultado-busqueda-demo--seleccionada'
                        : 'resultado-busqueda-demo resultado-busqueda-demo--boton'
                    }
                    key={`${opcion.linea}-${opcion.tripId}-${indice}`}
                    onClick={() => setRutaSeleccionada(opcion)}
                  >
                    <div className="resultado-busqueda-demo__superior">
                      <div>
                        <p className="pagina-inicio__mini">
                          {opcion.recomendada ? 'Mejor opción' : 'Alternativa'}
                        </p>

                        <h2>
                          {opcion.linea} directo
                        </h2>
                      </div>

                      <span className="resultado-busqueda-demo__tiempo">
                        {opcion.minutosTotal} min
                      </span>
                    </div>

                    <div className="resultado-busqueda-demo__detalle">
                      <div>
                        <span>Salida bus</span>
                        <strong>{opcion.horaSalidaBus}</strong>
                      </div>

                      <ArrowRight size={18} />

                      <div>
                        <span>Llegada final</span>
                        <strong>{opcion.horaLlegadaFinal}</strong>
                      </div>
                    </div>

                    <div className="resultado-busqueda-demo__linea">
                      <span className="linea-bus-demo">
                        {opcion.linea}
                      </span>

                      <p>
                        {opcion.destinoBus} · {opcion.transbordos} transbordos ·
                        sales desde {opcion.paradaOrigen?.nombre}
                      </p>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </section>
      </div>

      <aside className="panel-ruta-demo">
        {!rutaPanel && (
          <section className="panel-ruta-vacio">
            <div className="panel-ruta-demo__icono">
              <Route size={22} />
            </div>

            <p className="pagina-inicio__mini">Ruta seleccionada</p>

            <h2>Busca una ruta</h2>

            <p>
              Elige un origen y un destino. Puedes escribir un lugar, usar tu
              ubicación actual o, más adelante, marcar un punto en el mapa.
            </p>
          </section>
        )}

        {rutaPanel && (
          <>
            <div className="panel-ruta-demo__cabecera">
              <div>
                <p className="pagina-inicio__mini">Ruta seleccionada</p>
                <h2>{rutaPanel.linea} directo</h2>
              </div>

              <div className="panel-ruta-demo__icono">
                <Route size={22} />
              </div>
            </div>

            <div className="tarjeta-ruta-demo">
              <div className="tarjeta-ruta-demo__linea">
                <span className="linea-bus-demo">
                  {rutaPanel.linea}
                </span>

                <div>
                  <strong>
                    {rutaPanel.linea} · {rutaPanel.destinoBus}
                  </strong>

                  <p>
                    {rutaPanel.minutosTotal} min · {rutaPanel.transbordos} transbordos
                  </p>
                </div>
              </div>

              <div className="ruta-tiempo-demo">
                <div>
                  <Clock size={18} />
                  <span>{rutaPanel.minutosTotal} min</span>
                </div>

                <ArrowRight size={18} />

                <div>
                  <BusFront size={18} />
                  <span>{rutaPanel.transbordos} transbordos</span>
                </div>
              </div>
            </div>

            <section className="detalle-ruta-seleccionada">
              <h3>Detalle del viaje</h3>

              <div className="paso-ruta">
                <div className="paso-ruta__icono">
                  <Footprints size={18} />
                </div>

                <div>
                  <span>Camina hasta la parada</span>
                  <strong>{rutaPanel.paradaOrigen?.nombre}</strong>
                  <p>{rutaPanel.minutosAndandoOrigen} min andando</p>
                </div>
              </div>

              <div className="paso-ruta">
                <div className="paso-ruta__icono paso-ruta__icono--bus">
                  <BusFront size={18} />
                </div>

                <div>
                  <span>Coge el bus</span>
                  <strong>
                    Línea {rutaPanel.linea} · sale {rutaPanel.horaSalidaBus}
                  </strong>
                  <p>{rutaPanel.destinoBus}</p>
                </div>
              </div>

              <div className="paso-ruta">
                <div className="paso-ruta__icono">
                  <MapPin size={18} />
                </div>

                <div>
                  <span>Baja en</span>
                  <strong>{rutaPanel.paradaDestino?.nombre}</strong>
                  <p>Llegada bus: {rutaPanel.horaLlegadaBus}</p>
                </div>
              </div>

              <div className="paso-ruta">
                <div className="paso-ruta__icono">
                  <Footprints size={18} />
                </div>

                <div>
                  <span>Camina hasta el destino</span>
                  <strong>{destinoSeleccionado?.nombre || 'Destino seleccionado'}</strong>
                  <p>
                    {rutaPanel.minutosAndandoDestino} min andando · llegada final {rutaPanel.horaLlegadaFinal}
                  </p>
                </div>
              </div>
            </section>

            <MapaRuta ruta={rutaPanel} />
          </>
        )}
      </aside>
    </section>
  );
}

export default InicioPagina;