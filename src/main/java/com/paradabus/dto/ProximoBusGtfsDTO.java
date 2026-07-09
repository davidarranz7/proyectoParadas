package com.paradabus.dto;

public record ProximoBusGtfsDTO(
        String linea,
        String destino,
        String horaLlegada,
        String horaSalida,
        Integer minutos,
        String tripId,
        String routeId,
        String serviceId
) {
}