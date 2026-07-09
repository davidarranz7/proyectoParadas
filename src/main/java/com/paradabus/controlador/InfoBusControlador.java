package com.paradabus.controlador;

import com.paradabus.dto.InfoBusParadaDTO;
import com.paradabus.servicio.InfoBusServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/infobus")
@RequiredArgsConstructor
public class InfoBusControlador {

    private final InfoBusServicio infoBusServicio;

    // Devuelve los próximos buses reales/estimados desde InfoBus QR.
    //
    // Ejemplo:
    // GET /api/infobus/paradas/8630/proximos
    @GetMapping("/paradas/{paradaId}/proximos")
    public InfoBusParadaDTO obtenerProximosBusesReales(
            @PathVariable Long paradaId
    ) {
        return infoBusServicio.obtenerProximosBusesReales(paradaId);
    }
}