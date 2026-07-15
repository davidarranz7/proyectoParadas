package com.paradabus.controlador;

import com.paradabus.dto.AvisoTransporteDTO;
import com.paradabus.servicio.AvisoTransporteServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/avisos/transporte")
@RequiredArgsConstructor
public class AvisoTransporteControlador {

    private final AvisoTransporteServicio avisoTransporteServicio;

    @GetMapping
    public List<AvisoTransporteDTO> listarAvisos(
            @RequestParam(defaultValue = "true") boolean soloActivos,
            @RequestParam(required = false) String linea,
            @RequestParam(required = false) Long paradaId,
            @RequestParam(required = false) Integer limite
    ) {
        return avisoTransporteServicio.listarAvisos(soloActivos, linea, paradaId, limite);
    }
}
