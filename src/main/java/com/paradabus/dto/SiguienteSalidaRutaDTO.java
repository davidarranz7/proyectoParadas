package com.paradabus.dto;

public record SiguienteSalidaRutaDTO(
        String tripId,
        String horaSalidaBus,
        String horaLlegadaBus,
        String horaLlegadaFinal,
        Integer minutosEspera,
        Integer minutosBus,
        Integer minutosTotal
) {
}