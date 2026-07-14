package com.paradabus.dto;

import java.util.List;

public record HorarioGrupoLineaGtfsDTO(
        String codigo,
        String etiqueta,
        String primeraSalida,
        String ultimaSalida,
        Integer totalSalidas,
        List<HorarioSalidaLineaGtfsDTO> salidas
) {
}
