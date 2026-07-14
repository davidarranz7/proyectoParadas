package com.paradabus.dto;

public record SuscripcionPushDTO(
        String endpoint,
        Long expirationTime,
        ClavesSuscripcionPushDTO keys
) {
}
