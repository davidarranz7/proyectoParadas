import { X } from 'lucide-react';

function BottomSheet({
  abierto,
  children,
  className = '',
  onCerrar,
  titulo
}) {
  if (!abierto) {
    return null;
  }

  return (
    <div className="bottom-sheet" role="dialog" aria-modal="true">
      <div className="bottom-sheet__fondo" onClick={onCerrar} />

      <section className={className ? `bottom-sheet__panel ${className}` : 'bottom-sheet__panel'}>
        <div className="bottom-sheet__tirador" />

        <div className="bottom-sheet__cabecera">
          <strong>{titulo}</strong>

          <button
            type="button"
            className="bottom-sheet__cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bottom-sheet__contenido">
          {children}
        </div>
      </section>
    </div>
  );
}

export default BottomSheet;
