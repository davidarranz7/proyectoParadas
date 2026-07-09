package com.paradabus.dto;

public record PuntoTrazadoGtfsDTO(
        Integer orden,
        Double lat,
        Double lon,
        Double distancia
) {
}