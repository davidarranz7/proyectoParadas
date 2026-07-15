function SkeletonTarjeta({
  cantidad = 1,
  variante = 'ruta'
}) {
  return (
    <div className={`skeleton-tarjetas skeleton-tarjetas--${variante}`}>
      {Array.from({ length: cantidad }).map((_, indice) => (
        <div key={`${variante}-${indice}`} className="skeleton-tarjeta">
          <div className="skeleton-tarjeta__linea skeleton-tarjeta__linea--ancha" />
          <div className="skeleton-tarjeta__linea skeleton-tarjeta__linea--media" />
          <div className="skeleton-tarjeta__fila">
            <div className="skeleton-tarjeta__bloque" />
            <div className="skeleton-tarjeta__bloque" />
            <div className="skeleton-tarjeta__bloque" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonTarjeta;
