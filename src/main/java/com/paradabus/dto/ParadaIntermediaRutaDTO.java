package com.paradabus.dto;

public record ParadaIntermediaRutaDTO(
        Integer orden,
        String idParada,
        String stopId,
        String nombre,
        Double lat,
        Double lon,
        String horaLlegada,
        String horaSalida,
        String tipo
) {
}