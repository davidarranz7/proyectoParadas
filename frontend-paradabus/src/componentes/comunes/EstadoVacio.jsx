function EstadoVacio({
  acciones = null,
  descripcion,
  icono: Icono = null,
  titulo
}) {
  return (
    <div className="estado-vacio-app">
      {Icono && (
        <div className="estado-vacio-app__icono">
          <Icono size={20} />
        </div>
      )}

      <h3>{titulo}</h3>
      {descripcion && <p>{descripcion}</p>}
      {acciones && (
        <div className="estado-vacio-app__acciones">
          {acciones}
        </div>
      )}
    </div>
  );
}

export default EstadoVacio;
