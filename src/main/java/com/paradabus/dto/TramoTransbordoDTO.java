package com.paradabus.dto;

public record TramoTransbordoDTO(
        Integer orden,
        String tipo,
        String linea,
        String destinoBus,
        String routeId,
        String tripId,
        ParadaRutaDTO paradaSalida,
        ParadaRutaDTO paradaLlegada,
        String horaSalidaBus,
        String horaLlegadaBus,
        Integer minutosBus
) {
}