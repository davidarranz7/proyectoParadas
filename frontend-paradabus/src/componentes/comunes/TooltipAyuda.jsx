function TooltipAyuda({ abierto, texto }) {
  if (!abierto || !texto) {
    return null;
  }

  return (
    <div className="tooltip-ayuda" role="tooltip">
      {texto}
    </div>
  );
}

export default TooltipAyuda;
