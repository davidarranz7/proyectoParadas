import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

import TooltipAyuda from './TooltipAyuda';

function BotonAyuda({
  texto,
  etiqueta = 'Ayuda'
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    function manejarClickFuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) {
        setAbierto(false);
      }
    }

    document.addEventListener('mousedown', manejarClickFuera);

    return () => {
      document.removeEventListener('mousedown', manejarClickFuera);
    };
  }, []);

  return (
    <div className="boton-ayuda" ref={contenedorRef}>
      <button
        type="button"
        className="boton-ayuda__disparador"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label={etiqueta}
      >
        <Info size={15} />
      </button>

      <TooltipAyuda abierto={abierto} texto={texto} />
    </div>
  );
}

export default BotonAyuda;
