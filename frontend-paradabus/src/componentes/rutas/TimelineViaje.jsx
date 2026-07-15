function TimelineViaje({ pasos }) {
  return (
    <div className="timeline-ruta">
      {pasos.map((paso) => {
        const Icono = paso.icono;

        return (
          <div
            key={paso.id}
            className={
              paso.activo
                ? 'timeline-ruta__paso timeline-ruta__paso--activo'
                : 'timeline-ruta__paso'
            }
          >
            <div className="timeline-ruta__icono">
              <Icono size={17} />
            </div>

            <div>
              <strong>{paso.titulo}</strong>
              <span>{paso.descripcion}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TimelineViaje;
