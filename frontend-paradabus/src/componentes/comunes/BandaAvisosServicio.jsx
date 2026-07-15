import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { obtenerAvisosTransporte } from '../../servicios/avisosServicio';

function obtenerTextoSecundario(aviso) {
  if (aviso?.lineasAfectadas?.length > 0) {
    return aviso.lineasAfectadas.join(', ');
  }

  if (aviso?.subcategoria) {
    return aviso.subcategoria;
  }

  return 'Servicio';
}

function BandaAvisosServicio({
  linea,
  paradaId,
  limite = 3,
  mostrarVacio = false
}) {
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;

    async function cargarAvisos() {
      try {
        setCargando(true);
        setError('');

        const respuesta = await obtenerAvisosTransporte({
          linea,
          paradaId,
          limite
        });

        if (!cancelado) {
          setAvisos(Array.isArray(respuesta) ? respuesta : []);
        }
      } catch {
        if (!cancelado) {
          setError('No se pudieron cargar los avisos.');
          setAvisos([]);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargarAvisos();

    return () => {
      cancelado = true;
    };
  }, [limite, linea, paradaId]);

  if (cargando) {
    return (
      <section className="banda-avisos">
        <div className="banda-avisos__cabecera">
          <AlertTriangle size={16} />
          <strong>Cargando avisos...</strong>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="banda-avisos banda-avisos--error">
        <div className="banda-avisos__cabecera">
          <AlertTriangle size={16} />
          <strong>{error}</strong>
        </div>
      </section>
    );
  }

  if (avisos.length === 0 && !mostrarVacio) {
    return null;
  }

  if (avisos.length === 0) {
    return (
      <section className="banda-avisos banda-avisos--vacia">
        <div className="banda-avisos__cabecera">
          <AlertTriangle size={16} />
          <strong>Sin avisos activos</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="banda-avisos">
      <div className="banda-avisos__cabecera">
        <AlertTriangle size={16} />
        <strong>Avisos</strong>
      </div>

      <div className="banda-avisos__lista">
        {avisos.map((aviso) => (
          <article
            key={`${aviso.id || aviso.titulo}-${aviso.fechaInicio || 'sin-fecha'}`}
            className="banda-avisos__item"
          >
            <strong>{aviso.titulo || 'Aviso de servicio'}</strong>
            <span>{obtenerTextoSecundario(aviso)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BandaAvisosServicio;
