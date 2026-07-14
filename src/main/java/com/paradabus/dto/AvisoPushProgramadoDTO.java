package com.paradabus.dto;

import java.util.Map;

public record AvisoPushProgramadoDTO(
        String id,
        String scheduledAt,
        String titulo,
        String cuerpo,
        String tag,
        Boolean requireInteraction,
        Map<String, Object> data
) {
}
