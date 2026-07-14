package com.paradabus.dto;

import java.util.List;

public record RutaBusquedaResultadoDTO(
        Double origenLat,
        Double origenLon,
        Double destinoLat,
        Double destinoLon,

        String fecha,
        String horaConsulta,

        Integer totalDirectas,
        Integer totalTransbordos,
        Integer totalOpciones,

        Boolean transbordosConsultados,
        String mensaje,

        List<RutaDirectaOpcionDTO> directas,
        List<RutaTransbordoOpcionDTO> transbordos
) {
}
