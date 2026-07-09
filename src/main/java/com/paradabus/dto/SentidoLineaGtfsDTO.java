package com.paradabus.dto;

public record SentidoLineaGtfsDTO(
        String routeId,
        String codigoLinea,
        String destino,
        Integer directionId,
        String tripId,
        Integer totalParadas
) {
}