package com.paradabus.dto;

public record HorarioSalidaLineaGtfsDTO(
        String tripId,
        Integer directionId,
        String destino,
        String paradaInicio,
        String paradaFin,
        String horaSalida,
        String horaLlegadaFinal,
        Integer totalParadas
) {
}
