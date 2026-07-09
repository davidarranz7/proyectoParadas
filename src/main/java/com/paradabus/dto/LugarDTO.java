package com.paradabus.dto;

public record LugarDTO(
        String nombre,
        String direccion,
        Double lat,
        Double lon,
        String fuente
) {
}