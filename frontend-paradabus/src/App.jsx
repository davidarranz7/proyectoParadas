import { useState } from 'react';

import ContenedorApp from './componentes/layout/ContenedorApp';
import InicioPagina from './paginas/InicioPagina';
import MapaPagina from './paginas/MapaPagina';

function App() {
  const [paginaActiva, setPaginaActiva] = useState('rutas');

  function renderizarPagina() {
    if (paginaActiva === 'mapa') {
      return <MapaPagina />;
    }

    if (paginaActiva === 'lineas') {
      return (
        <section className="pagina-placeholder">
          <p className="pagina-inicio__mini">Líneas</p>
          <h1>Líneas</h1>
          <p>Más adelante veremos todas las líneas, sentidos, paradas y horarios aproximados.</p>
        </section>
      );
    }

    if (paginaActiva === 'ajustes') {
      return (
        <section className="pagina-placeholder">
          <p className="pagina-inicio__mini">Ajustes</p>
          <h1>Ajustes</h1>
          <p>Más adelante añadiremos preferencias, ubicación y configuración de la app.</p>
        </section>
      );
    }

    return <InicioPagina />;
  }

  return (
    <ContenedorApp
      paginaActiva={paginaActiva}
      onCambiarPagina={setPaginaActiva}
    >
      {renderizarPagina()}
    </ContenedorApp>
  );
}

export default App;