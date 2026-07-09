package com.paradabus.controlador;

import com.paradabus.dto.ParadaIntermediaRutaDTO;
import com.paradabus.servicio.ParadasTripServicio;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ParadasTripControlador {

    private final ParadasTripServicio paradasTripServicio;

    public ParadasTripControlador(ParadasTripServicio paradasTripServicio) {
        this.paradasTripServicio = paradasTripServicio;
    }

    @GetMapping("/api/rutas/trips/{tripId}/paradas")
    public List<ParadaIntermediaRutaDTO> obtenerParadasTrip(
            @PathVariable String tripId,
            @RequestParam(required = false) String stopOrigen,
            @RequestParam(required = false) String stopDestino
    ) {
        return paradasTripServicio.obtenerParadasTrip(
                tripId,
                stopOrigen,
                stopDestino
        );
    }
}