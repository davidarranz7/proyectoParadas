package com.paradabus.dto;

import java.util.List;

public record HorarioSentidoLineaGtfsDTO(
        Integer directionId,
        String destino,
        String paradaInicio,
        String paradaFin,
        String tripIdRepresentativo,
        String primeraSalida,
        String ultimaSalida,
        Integer totalSalidas,
        List<HorarioSalidaLineaGtfsDTO> salidas,
        List<HorarioGrupoLineaGtfsDTO> grupos
) {
}
