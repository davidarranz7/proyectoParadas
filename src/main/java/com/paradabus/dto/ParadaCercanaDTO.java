package com.paradabus.dto;

public record ParadaCercanaDTO(

        // ID real de la parada.
        // Es el que usa InfoBus / QR.
        Long id,

        // Código stop_id del JSON oficial.
        String stopId,

        // Nombre visible de la parada.
        String nombre,

        // Latitud de la parada.
        Double lat,

        // Longitud de la parada.
        Double lon,

        // Líneas que pasan por esa parada.
        String lineasOriginal,

        // Distancia desde la ubicación del usuario hasta la parada.
        Double distanciaMetros
) {
}