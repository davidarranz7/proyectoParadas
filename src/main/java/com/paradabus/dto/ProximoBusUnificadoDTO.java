package com.paradabus.dto;

public record ProximoBusUnificadoDTO(
        String linea,
        String ruta,
        Integer minutos,
        String fuente
) {
}