package com.paradabus.dto;

public record ParadaRutaDTO(
        Long id,
        String stopId,
        String nombre,
        Double lat,
        Double lon,
        Integer distanciaMetros,
        Integer minutosAndando
) {
}