package com.paradabus.dto;

import java.util.List;

public record AvisoTransporteDTO(
        String id,
        String titulo,
        String resumen,
        String subcategoria,
        String fechaInicio,
        String fechaFin,
        boolean activo,
        List<String> lineasAfectadas,
        List<String> paradasAfectadas
) {
}
