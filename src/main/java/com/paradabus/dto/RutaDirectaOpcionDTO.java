package com.paradabus.dto;

import java.util.List;

public record RutaDirectaOpcionDTO(
        String tipo,
        String resumen,
        Boolean recomendada,

        String linea,
        String destinoBus,
        String routeId,
        String tripId,

        ParadaRutaDTO paradaOrigen,
        ParadaRutaDTO paradaDestino,

        String horaInicioRuta,
        String horaLlegadaParada,
        String horaSalidaBus,
        String horaLlegadaBus,
        String horaLlegadaFinal,

        Integer minutosAndandoOrigen,
        Integer minutosEspera,
        Integer minutosBus,
        Integer minutosAndandoDestino,
        Integer minutosTotal,

        Integer distanciaAndandoTotalMetros,
        Integer margenLlegadaParadaMinutos,

        Integer transbordos,
        Integer puntuacion,

        String fuente,

        List<SiguienteSalidaRutaDTO> siguientesSalidas
) {
}