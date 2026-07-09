package com.paradabus.dto;

public record ParadaRecorridoGtfsDTO(
        Integer orden,
        String stopId,
        Long paradaId,
        String nombre,
        Double lat,
        Double lon,
        String horaLlegada,
        String horaSalida
) {
}