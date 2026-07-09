import { BusFront, Map, Route, Settings } from 'lucide-react';
import BarraInferior from './BarraInferior';

function ContenedorApp({ children }) {
  return (
    <div className="app">
      <aside className="panel-lateral">
        <div className="marca-app">
          <div className="marca-app__icono">
            <BusFront size={24} />
          </div>

          <div>
            <p className="marca-app__titulo">ParadaBus</p>
            <p className="marca-app__subtitulo">Vigo en bus</p>
          </div>
        </div>

        <nav className="menu-lateral">
          <a className="menu-lateral__item menu-lateral__item--activo" href="/">
            <Route size={20} />
            <span>Rutas</span>
          </a>

          <a className="menu-lateral__item" href="/">
            <Map size={20} />
            <span>Mapa</span>
          </a>

          <a className="menu-lateral__item" href="/">
            <BusFront size={20} />
            <span>Líneas</span>
          </a>

          <a className="menu-lateral__item" href="/">
            <Settings size={20} />
            <span>Ajustes</span>
          </a>
        </nav>
      </aside>

      <main className="contenido-principal">
        {children}
      </main>

      <BarraInferior />
    </div>
  );
}

export default ContenedorApp;