package com.paradabus.dto;

import java.util.List;

public record RecorridoMapaLineaGtfsDTO(
        String routeId,
        String codigoLinea,
        String destino,
        Integer directionId,
        String tripId,
        String shapeId,
        String color,
        Integer totalParadas,
        Integer totalPuntosTrazado,
        List<ParadaRecorridoGtfsDTO> paradas,
        List<PuntoTrazadoGtfsDTO> trazado
) {
}