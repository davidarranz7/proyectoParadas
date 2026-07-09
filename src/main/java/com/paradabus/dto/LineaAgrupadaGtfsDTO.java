package com.paradabus.dto;

import java.util.List;

public record LineaAgrupadaGtfsDTO(
        String codigo,
        String nombrePrincipal,
        String color,
        Integer totalRouteIds,
        Integer totalRecorridos,
        List<String> routeIds,
        List<RecorridoResumenLineaGtfsDTO> recorridos
) {
}