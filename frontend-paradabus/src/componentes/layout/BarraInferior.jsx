import {
  Map,
  MapPinned,
  Route,
  Settings
} from 'lucide-react';

const opcionesBarra = [
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

function BarraInferior({ paginaActiva, onCambiarPagina }) {
  return (
    <nav className="barra-inferior">
      {opcionesBarra.map((opcion) => {
        const Icono = opcion.icono;
        const activo = paginaActiva === opcion.id;

        return (
          <button
            type="button"
            key={opcion.id}
            className={
              activo
                ? 'barra-inferior__item barra-inferior__item--activo'
                : 'barra-inferior__item'
            }
            onClick={() => onCambiarPagina(opcion.id)}
          >
            <Icono size={20} />
            <span>{opcion.texto}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BarraInferior;