package com.paradabus.dto;

public record ResultadoOperacionPushDTO(
        Boolean ok,
        String mensaje,
        Integer totalSuscripciones,
        Integer totalAvisos
) {
}
