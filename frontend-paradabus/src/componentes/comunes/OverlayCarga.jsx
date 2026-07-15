import { Loader2 } from 'lucide-react';

function OverlayCarga({
  visible,
  compacto = false,
  texto = 'Cargando...',
  subtexto = ''
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className={compacto ? 'overlay-carga overlay-carga--compacto' : 'overlay-carga'}>
      <div className="overlay-carga__panel">
        <Loader2 className="overlay-carga__icono" size={20} />
        <strong>{texto}</strong>
        {subtexto && <span>{subtexto}</span>}
      </div>
    </div>
  );
}

export default OverlayCarga;
