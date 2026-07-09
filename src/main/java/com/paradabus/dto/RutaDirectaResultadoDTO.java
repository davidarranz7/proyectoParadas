package com.paradabus.dto;

import java.util.List;

public record RutaDirectaResultadoDTO(
        Double origenLat,
        Double origenLon,
        Double destinoLat,
        Double destinoLon,

        String fecha,
        String horaConsulta,

        Integer totalOpciones,
        String mensaje,

        List<RutaDirectaOpcionDTO> opciones
) {
}