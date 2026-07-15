function normalizarMinutos(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function resolverEstadoTiempoReal(minutosEntrada, fuente = 'ESTIMADO') {
  const minutos = normalizarMinutos(minutosEntrada);
  const esTiempoReal = fuente === 'TIEMPO_REAL';

  if (minutos === null) {
    return {
      clase: 'gris',
      estado: esTiempoReal ? 'Sin tiempo' : 'Horario estimado',
      origen: esTiempoReal ? 'tiempo real' : 'estimado',
      valor: esTiempoReal ? 'Ahora' : 'Estimado'
    };
  }

  if (esTiempoReal) {
    if (minutos <= 3) {
      return {
        clase: 'rojo',
        estado: 'Llegando',
        origen: 'tiempo real',
        valor: `${minutos} min`
      };
    }

    if (minutos <= 5) {
      return {
        clase: 'naranja',
        estado: 'Muy cerca',
        origen: 'tiempo real',
        valor: `${minutos} min`
      };
    }

    return {
      clase: 'verde',
      estado: 'En camino',
      origen: 'tiempo real',
      valor: `${minutos} min`
    };
  }

  return {
    clase: minutos <= 5 ? 'naranja' : 'gris',
    estado: 'Horario estimado',
    origen: 'estimado',
    valor: `${minutos} min`
  };
}

function IndicadorTiempoReal({
  compacto = false,
  fuente = 'ESTIMADO',
  minutos,
  textoAlternativo = 'Sin tiempo'
}) {
  const estado = resolverEstadoTiempoReal(minutos, fuente);

  return (
    <div
      className={
        compacto
          ? `indicador-tiempo indicador-tiempo--compacto indicador-tiempo--${estado.clase}`
          : `indicador-tiempo indicador-tiempo--${estado.clase}`
      }
    >
      <strong>{estado.valor || textoAlternativo}</strong>
      <span>{estado.estado}</span>
      {!compacto && <small>{estado.origen}</small>}
    </div>
  );
}

export default IndicadorTiempoReal;
