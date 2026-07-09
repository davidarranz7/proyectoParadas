package com.paradabus.dto;

import java.util.List;

public record RecorridoLineaGtfsDTO(
        String routeId,
        String codigoLinea,
        String destino,
        Integer directionId,
        String tripId,
        Integer totalParadas,
        List<ParadaRecorridoGtfsDTO> paradas
) {
}