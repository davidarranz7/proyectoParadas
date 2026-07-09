package com.paradabus.dto;

public record OpcionBusDTO(

        // Línea del bus.
        // Ejemplo: "5A", "A", "4A", "C1"
        String linea,

        // Dirección o ruta que devuelve InfoBus.
        // Ejemplo: "NAVIA por FLORIDA"
        String ruta,

        // Minutos que faltan para que llegue el bus.
        Integer minutos,

        // Indica si esta línea sirve para llegar al destino elegido.
        Boolean sirveParaDestino
) {
}