package com.paradabus.dto;

import java.util.List;

public record ProgramacionTrayectoPushDTO(
        String trayectoId,
        String destinoFinal,
        List<AvisoPushProgramadoDTO> avisos
) {
}
