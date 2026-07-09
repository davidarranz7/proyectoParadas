package com.paradabus.dto;

public record RecorridoResumenLineaGtfsDTO(
        String routeId,
        String destino,
        Integer directionId,
        String tripId,
        Integer totalParadas
) {
}