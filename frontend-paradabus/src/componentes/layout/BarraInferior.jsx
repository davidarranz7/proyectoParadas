import { BusFront, Map, Route, Settings } from 'lucide-react';

function BarraInferior() {
  return (
    <nav className="barra-inferior">
      <a className="barra-inferior__item barra-inferior__item--activo" href="/">
        <Route size={22} />
        <span>Rutas</span>
      </a>

      <a className="barra-inferior__item" href="/">
        <Map size={22} />
        <span>Mapa</span>
      </a>

      <a className="barra-inferior__item" href="/">
        <BusFront size={22} />
        <span>Líneas</span>
      </a>

      <a className="barra-inferior__item" href="/">
        <Settings size={22} />
        <span>Ajustes</span>
      </a>
    </nav>
  );
}

export default BarraInferior;