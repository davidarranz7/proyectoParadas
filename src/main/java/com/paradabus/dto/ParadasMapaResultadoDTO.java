package com.paradabus.dto;

import java.util.List;

public record ParadasMapaResultadoDTO(
        Integer totalParadas,
        Integer totalDevueltas,
        Integer limite,
        Integer zoomMinimoRecomendado,
        List<ParadaDTO> paradas
) {
}
