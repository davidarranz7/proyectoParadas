package com.paradabus.controlador;

import com.paradabus.dto.LineaAgrupadaGtfsDTO;
import com.paradabus.dto.LineaGtfsDTO;
import com.paradabus.dto.RecorridoLineaGtfsDTO;
import com.paradabus.dto.RecorridoMapaLineaGtfsDTO;
import com.paradabus.dto.SentidoLineaGtfsDTO;
import com.paradabus.servicio.LineaGtfsServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gtfs/lineas")
@RequiredArgsConstructor
public class LineaGtfsControlador {

    private final LineaGtfsServicio lineaGtfsServicio;

    // Lista todas las rutas GTFS tal como vienen en routes.txt.
    //
    // Puede devolver códigos repetidos si GTFS separa variantes.
    //
    // Ejemplo:
    // GET /api/gtfs/lineas
    @GetMapping
    public List<LineaGtfsDTO> listarLineas() {
        return lineaGtfsServicio.listarLineas();
    }

    // Lista líneas agrupadas por código para usar en el frontend.
    //
    // Ejemplo:
    // GET /api/gtfs/lineas/agrupadas
    @GetMapping("/agrupadas")
    public List<LineaAgrupadaGtfsDTO> listarLineasAgrupadas() {
        return lineaGtfsServicio.listarLineasAgrupadas();
    }

    // Lista sentidos/destinos disponibles para una línea.
    //
    // Ejemplo:
    // GET /api/gtfs/lineas/15A/sentidos
    @GetMapping("/{codigoLinea}/sentidos")
    public List<SentidoLineaGtfsDTO> listarSentidos(
            @PathVariable String codigoLinea
    ) {
        return lineaGtfsServicio.listarSentidosDeLinea(codigoLinea);
    }

    // Devuelve el recorrido ordenado de una línea.
    //
    // Ejemplos:
    // GET /api/gtfs/lineas/15A/recorrido
    // GET /api/gtfs/lineas/15A/recorrido?directionId=0
    // GET /api/gtfs/lineas/15A/recorrido?tripId=...
    @GetMapping("/{codigoLinea}/recorrido")
    public RecorridoLineaGtfsDTO obtenerRecorrido(
            @PathVariable String codigoLinea,
            @RequestParam(required = false) Integer directionId,
            @RequestParam(required = false) String tripId
    ) {
        return lineaGtfsServicio.obtenerRecorridoLinea(
                codigoLinea,
                directionId,
                tripId
        );
    }

    // Devuelve el recorrido completo para pintar en mapa:
    // paradas ordenadas + trazado real de shapes.txt.
    //
    // Ejemplos:
    // GET /api/gtfs/lineas/15A/recorrido-mapa
    // GET /api/gtfs/lineas/15A/recorrido-mapa?directionId=1
    // GET /api/gtfs/lineas/15A/recorrido-mapa?tripId=L1503SP100_015003_4
    @GetMapping("/{codigoLinea}/recorrido-mapa")
    public RecorridoMapaLineaGtfsDTO obtenerRecorridoMapa(
            @PathVariable String codigoLinea,
            @RequestParam(required = false) Integer directionId,
            @RequestParam(required = false) String tripId
    ) {
        return lineaGtfsServicio.obtenerRecorridoMapaLinea(
                codigoLinea,
                directionId,
                tripId
        );
    }
}