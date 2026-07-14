import {
  BusFront,
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
    texto: 'Líneas',
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
    return 'Mapa';
  }

  if (paginaActiva === 'lineas') {
    return 'Líneas';
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
            <p className="marca-app__subtitulo">Vigo en bus</p>
          </div>
        </div>

        <nav className="menu-lateral" aria-label="Navegación principal">
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
            <p>InfoBus activo</p>
            <span>Datos en tiempo real</span>
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

        <div className="barra-superior-movil__estado">
          <span className="barra-superior-movil__punto" />
          Vigo
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