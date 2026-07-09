package com.paradabus.dto;

import java.util.List;

public record RutaTransbordoOpcionDTO(
        String tipo,
        String resumen,
        Boolean recomendada,

        ParadaRutaDTO paradaOrigen,
        ParadaRutaDTO paradaTransbordo,
        ParadaRutaDTO paradaDestino,

        String horaInicioRuta,
        String horaLlegadaParadaOrigen,

        String horaSalidaPrimerBus,
        String horaLlegadaTransbordo,

        String horaSalidaSegundoBus,
        String horaLlegadaBusDestino,
        String horaLlegadaFinal,

        Integer minutosAndandoOrigen,
        Integer minutosEsperaOrigen,
        Integer minutosPrimerBus,
        Integer minutosEsperaTransbordo,
        Integer minutosSegundoBus,
        Integer minutosAndandoDestino,
        Integer minutosTotal,

        Integer distanciaAndandoTotalMetros,
        Integer transbordos,
        Integer puntuacion,

        String fuente,

        List<TramoTransbordoDTO> tramos
) {
}