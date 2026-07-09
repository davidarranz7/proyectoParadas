import {
  BusFront,
  Map,
  MapPinned,
  Route,
  Settings
} from 'lucide-react';

import BarraInferior from './BarraInferior';

const opcionesMenu = [
  {
    id: 'rutas',
    texto: 'Rutas',
    icono: Route
  },
  {
    id: 'mapa',
    texto: 'Mapa',
    icono: Map
  },
  {
    id: 'lineas',
    texto: 'Líneas',
    icono: MapPinned
  },
  {
    id: 'ajustes',
    texto: 'Ajustes',
    icono: Settings
  }
];

function ContenedorApp({ children, paginaActiva, onCambiarPagina }) {
  return (
    <div className="app">
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

        <nav className="menu-lateral">
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
                <Icono size={18} />
                {opcion.texto}
              </button>
            );
          })}
        </nav>
      </aside>

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