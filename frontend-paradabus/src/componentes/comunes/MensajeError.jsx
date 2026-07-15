function MensajeError({ children, className = '' }) {
  if (!children) {
    return null;
  }

  return (
    <div className={className ? `mensaje-error ${className}` : 'mensaje-error'}>
      {children}
    </div>
  );
}

export default MensajeError;
