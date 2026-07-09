package com.paradabus.dto;

public record ParadaDTO(

        // ID real de la parada.
        // Es el que usa InfoBus / QR.
        Long id,

        // Código stop_id del JSON oficial.
        String stopId,

        // Nombre visible de la parada.
        String nombre,

        // Latitud.
        Double lat,

        // Longitud.
        Double lon,

        // Líneas originales en texto.
        // Ejemplo: "C1, N4"
        String lineasOriginal
) {
}