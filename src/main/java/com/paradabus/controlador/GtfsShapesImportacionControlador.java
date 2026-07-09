package com.paradabus.controlador;

import com.paradabus.dto.GtfsShapesImportacionResultadoDTO;
import com.paradabus.servicio.GtfsShapesImportacionServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gtfs")
@RequiredArgsConstructor
public class GtfsShapesImportacionControlador {

    private final GtfsShapesImportacionServicio gtfsShapesImportacionServicio;

    // Importa shapes.txt desde el ZIP GTFS oficial.
    //
    // Esto sirve para pintar el recorrido real de las líneas en el mapa.
    //
    // Ejemplo:
    // POST /api/gtfs/importar-shapes
    @PostMapping("/importar-shapes")
    public GtfsShapesImportacionResultadoDTO importarShapes() {
        return gtfsShapesImportacionServicio.importarShapes();
    }
}