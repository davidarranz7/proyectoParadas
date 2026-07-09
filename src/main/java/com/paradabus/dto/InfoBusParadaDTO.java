package com.paradabus.dto;

import java.util.List;

public record InfoBusParadaDTO(

        // ID de la parada.
        // Es el código que usa InfoBus / QR.
        Long idParada,

        // Código que aparece dentro de la página de InfoBus.
        String codigoParada,

        // Hora que devuelve InfoBus.
        // Ejemplo: "12:43"
        String hora,

        // Nombre de la parada según InfoBus.
        String nombreParada,

        // Lista de próximos buses que pasan por esa parada.
        List<ProximoBusDTO> proximosBuses
) {
}