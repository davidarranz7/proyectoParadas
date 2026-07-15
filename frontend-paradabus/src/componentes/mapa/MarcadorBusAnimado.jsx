import { useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

function crearIconoBusAnimado(variante) {
  return L.divIcon({
    className: `marcador-bus-animado marcador-bus-animado--${variante}`,
    html: '<span></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

const ICONOS = {
  estimado: crearIconoBusAnimado('estimado'),
  tiempoReal: crearIconoBusAnimado('tiempo-real')
};

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function interpolarPunto(puntoA, puntoB, factor) {
  return [
    puntoA[0] + ((puntoB[0] - puntoA[0]) * factor),
    puntoA[1] + ((puntoB[1] - puntoA[1]) * factor)
  ];
}

function obtenerPuntoRuta(puntos, progreso) {
  if (!Array.isArray(puntos) || puntos.length === 0) {
    return null;
  }

  if (puntos.length === 1) {
    return puntos[0];
  }

  const progresoAcotado = limitar(progreso, 0, 1);
  const progresoSegmentos = progresoAcotado * (puntos.length - 1);
  const indiceBase = Math.floor(progresoSegmentos);
  const indiceSiguiente = Math.min(indiceBase + 1, puntos.length - 1);
  const factor = progresoSegmentos - indiceBase;

  return interpolarPunto(
    puntos[indiceBase],
    puntos[indiceSiguiente],
    factor
  );
}

function MarcadorBusAnimado({
  puntos,
  progreso = 0.4,
  tiempoReal = false
}) {
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setFase((valor) => (valor + 1) % 160);
    }, 120);

    return () => window.clearInterval(intervalo);
  }, []);

  const progresoAnimado = useMemo(() => {
    const desplazamiento = Math.sin((fase / 160) * Math.PI * 2) * 0.015;
    return limitar(progreso + desplazamiento, 0, 1);
  }, [fase, progreso]);

  const posicion = useMemo(() => {
    return obtenerPuntoRuta(puntos, progresoAnimado);
  }, [puntos, progresoAnimado]);

  if (!posicion) {
    return null;
  }

  return (
    <Marker
      position={posicion}
      icon={tiempoReal ? ICONOS.tiempoReal : ICONOS.estimado}
    />
  );
}

export default MarcadorBusAnimado;
