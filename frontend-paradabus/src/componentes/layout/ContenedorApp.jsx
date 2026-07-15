import {
  BusFront,
  Clock3,
  Map,
  MapPinned,
  Route,
  Settings,
  Signal
} from 'lucide-react';

import BarraInferior from './BarraInferior';

const opcionesMenu = [
  {
    id: 'rutas',
    texto: 'Rutas',
    subtitulo: 'Buscar viaje',
    icono: Route
  },
  {
    id: 'mapa',
    texto: 'Mapa',
    subtitulo: 'Paradas e InfoBus',
    icono: Map
  },
  {
    id: 'lineas',
    texto: 'Lineas',
    subtitulo: 'Recorridos',
    icono: MapPinned
  },
  {
    id: 'ajustes',
    texto: 'Ajustes',
    subtitulo: 'Preferencias',
    icono: Settings
  }
];

function obtenerTituloPagina(paginaActiva) {
  if (paginaActiva === 'mapa') {
    return 'Explorar';
  }

  if (paginaActiva === 'lineas') {
    return 'Lineas';
  }

  if (paginaActiva === 'ajustes') {
    return 'Ajustes';
  }

  return 'Rutas';
}

function ContenedorApp({ children, paginaActiva, onCambiarPagina }) {
  const tituloPagina = obtenerTituloPagina(paginaActiva);

  return (
    <div className="app">
      <div className="app-fondo" />

      <aside className="panel-lateral">
        <div className="marca-app">
          <div className="marca-app__icono">
            <BusFront size={22} />
          </div>

          <div>
            <p className="marca-app__titulo">ParadaBus</p>
            <p className="marca-app__subtitulo">Movilidad urbana en Vigo</p>
          </div>
        </div>

        <section className="panel-lateral__hero">
          <p className="panel-lateral__hero-etiqueta">Vigo</p>
          <strong>Rutas, mapa y lineas.</strong>
          <span>Todo en una sola app.</span>

          <div className="panel-lateral__hero-pildoras">
            <span>Directa</span>
            <span>Tiempo real</span>
            <span>Avisos</span>
          </div>
        </section>

        <nav className="menu-lateral" aria-label="Navegacion principal">
          {opcionesMenu.map((opcion) => {
            const Icono = opcion.icono;
            const activo = paginaActiva === opcion.id;

            return (
              <button
                type="button"
                key={opcion.id}
                className={
                  activo
                    ? 'menu-lateral__item menu-lateral__item--activo'
                    : 'menu-lateral__item'
                }
                onClick={() => onCambiarPagina(opcion.id)}
              >
                <span className="menu-lateral__icono">
                  <Icono size={18} />
                </span>

                <span className="menu-lateral__texto">
                  <span>{opcion.texto}</span>
                  <small>{opcion.subtitulo}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="panel-lateral__estado">
          <div className="panel-lateral__estado-icono">
            <Signal size={17} />
          </div>

          <div>
            <p>Servicio</p>
            <span>Proximos buses y horarios</span>
          </div>
        </div>

        <div className="panel-lateral__tarjeta">
          <div className="panel-lateral__tarjeta-icono">
            <Clock3 size={16} />
          </div>

          <div>
            <p>Trayecto</p>
            <span>Seguimiento y aviso al bajar</span>
          </div>
        </div>
      </aside>

      <header className="barra-superior-movil">
        <div className="barra-superior-movil__marca">
          <div className="barra-superior-movil__logo">
            <BusFront size={19} />
          </div>

          <div>
            <p>ParadaBus</p>
            <span>{tituloPagina}</span>
          </div>
        </div>

        <div className="barra-superior-movil__bloque">
          <div className="barra-superior-movil__estado">
            <span className="barra-superior-movil__punto" />
            En vivo
          </div>

          <div className="barra-superior-movil__ciudad">
            Vigo
          </div>
        </div>
      </header>

      <main className="contenido-principal">
        {children}
      </main>

      <BarraInferior
        paginaActiva={paginaActiva}
        onCambiarPagina={onCambiarPagina}
      />
    </div>
  );
}

export default ContenedorApp;
