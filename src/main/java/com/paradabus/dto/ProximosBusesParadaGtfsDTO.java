package com.paradabus.dto;

import java.util.List;

public record ProximosBusesParadaGtfsDTO(
        Long paradaId,
        String stopId,
        String nombreParada,
        String fecha,
        String horaConsulta,
        List<ProximoBusGtfsDTO> proximosBuses,
        String mensaje
) {
}