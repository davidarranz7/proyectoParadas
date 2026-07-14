package com.paradabus.dto;

public record NotificacionPushConfiguracionDTO(
        Boolean disponible,
        Boolean clavesTemporales,
        String publicKey,
        String subject
) {
}
