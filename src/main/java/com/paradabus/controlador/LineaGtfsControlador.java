package com.paradabus.controlador;

import com.paradabus.dto.HorariosLineaGtfsDTO;
import com.paradabus.dto.LineaAgrupadaGtfsDTO;
import com.paradabus.dto.LineaGtfsDTO;
import com.paradabus.dto.RecorridoLineaGtfsDTO;
import com.paradabus.dto.RecorridoMapaLineaGtfsDTO;
import com.paradabus.dto.SentidoLineaGtfsDTO;
import com.paradabus.servicio.LineaGtfsServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/gtfs/lineas")
@RequiredArgsConstructor
public class LineaGtfsControlador {

    private final LineaGtfsServicio lineaGtfsServicio;

    @GetMapping
    public List<LineaGtfsDTO> listarLineas() {
        return lineaGtfsServicio.listarLineas();
    }

    @GetMapping("/agrupadas")
    public List<LineaAgrupadaGtfsDTO> listarLineasAgrupadas() {
        return lineaGtfsServicio.listarLineasAgrupadas();
    }

    @GetMapping("/{codigoLinea}/sentidos")
    public List<SentidoLineaGtfsDTO> listarSentidos(
            @PathVariable String codigoLinea
    ) {
        return lineaGtfsServicio.listarSentidosDeLinea(codigoLinea);
    }

    @GetMapping("/{codigoLinea}/horarios")
    public HorariosLineaGtfsDTO obtenerHorarios(
            @PathVariable String codigoLinea
    ) {
        return lineaGtfsServicio.obtenerHorariosLinea(codigoLinea);
    }

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
