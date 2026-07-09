package com.paradabus.dto;

import java.util.List;

public record ProximosBusesUnificadosDTO(
        Long paradaId,
        String stopId,
        String nombreParada,
        String horaConsulta,
        String fuentePrincipal,
        Boolean tiempoReal,
        String mensaje,
        List<ProximoBusUnificadoDTO> proximosBuses
) {
}