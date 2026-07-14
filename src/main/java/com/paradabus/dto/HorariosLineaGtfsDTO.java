package com.paradabus.dto;

import java.util.List;

public record HorariosLineaGtfsDTO(
        String codigoLinea,
        Integer totalSentidos,
        List<HorarioSentidoLineaGtfsDTO> sentidos
) {
}
