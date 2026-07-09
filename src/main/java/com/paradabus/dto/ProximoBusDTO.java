package com.paradabus.dto;

public record ProximoBusDTO(

        // Línea del bus.
        // Ejemplo: "5A", "C3d", "H2"
        String linea,

        // Ruta o dirección que aparece en InfoBus.
        // Ejemplo: "NAVIA por FLORIDA"
        String ruta,

        // Minutos que faltan para que llegue el bus.
        Integer minutos
) {
}