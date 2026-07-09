package com.paradabus.controlador;

import com.paradabus.dto.ProximosBusesUnificadosDTO;
import com.paradabus.servicio.ProximosBusesServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/paradas")
@RequiredArgsConstructor
public class ProximosBusesControlador {

    private final ProximosBusesServicio proximosBusesServicio;

    // Endpoint único para el frontend.
    //
    // Primero intenta InfoBus.
    // Si InfoBus falla, usa GTFS.
    //
    // Ejemplo:
    // GET /api/paradas/8630/proximos
    @GetMapping("/{paradaId}/proximos")
    public ProximosBusesUnificadosDTO obtenerProximosBuses(
            @PathVariable Long paradaId
    ) {
        return proximosBusesServicio.buscarProximosBuses(paradaId);
    }
}