import { useMemo, useState } from 'react';

import ContenedorApp from './componentes/layout/ContenedorApp';
import AjustesPagina from './paginas/AjustesPagina';
import InicioPagina from './paginas/InicioPagina';
import LineasPagina from './paginas/LineasPagina';
import MapaPagina from './paginas/MapaPagina';

const paginas = {
  rutas: InicioPagina,
  mapa: MapaPagina,
  lineas: LineasPagina,
  ajustes: AjustesPagina
};

function App() {
  const [paginaActiva, setPaginaActiva] = useState('rutas');

  const PaginaActiva = useMemo(() => {
    return paginas[paginaActiva] || InicioPagina;
  }, [paginaActiva]);

  return (
    <ContenedorApp
      paginaActiva={paginaActiva}
      onCambiarPagina={setPaginaActiva}
    >
      <PaginaActiva />
    </ContenedorApp>
  );
}

export default App;
