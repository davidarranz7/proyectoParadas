package com.paradabus.dto;

import java.util.List;

public record ComparacionParadasDTO(

        // Parada desde donde sale el usuario
        ParadaDTO paradaOrigen,

        // Parada a la que quiere llegar el usuario
        ParadaDTO paradaDestino,

        // Líneas que pasan por las dos paradas
        // Si hay líneas comunes, podría existir ruta directa
        List<String> lineasComunes,

        // Indica si existe una posible ruta directa
        Boolean tieneRutaDirecta
) {
}