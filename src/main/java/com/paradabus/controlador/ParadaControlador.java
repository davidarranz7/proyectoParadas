package com.paradabus.controlador;

import com.paradabus.dto.ComparacionParadasDTO;
import com.paradabus.dto.ParadaCercanaDTO;
import com.paradabus.dto.ParadaDTO;
import com.paradabus.dto.ParadasMapaResultadoDTO;
import com.paradabus.servicio.ParadaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/paradas")
@RequiredArgsConstructor
public class ParadaControlador {

    private final ParadaServicio paradaServicio;

    @GetMapping
    public List<ParadaDTO> listarParadas(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Integer limite
    ) {
        if (buscar != null && !buscar.trim().isEmpty()) {
            return paradaServicio.buscarParadasPorNombre(buscar, limite);
        }

        return paradaServicio.listarParadas();
    }

    @GetMapping("/cercanas")
    public List<ParadaCercanaDTO> buscarParadasCercanas(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false) Double radio
    ) {
        return paradaServicio.buscarParadasCercanas(lat, lon, radio);
    }

    @GetMapping("/mapa")
    public ParadasMapaResultadoDTO listarParadasParaMapa(
            @RequestParam Double minLat,
            @RequestParam Double maxLat,
            @RequestParam Double minLon,
            @RequestParam Double maxLon,
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Integer limite
    ) {
        return paradaServicio.buscarParadasParaMapa(
                minLat,
                maxLat,
                minLon,
                maxLon,
                buscar,
                limite
        );
    }

    @GetMapping("/comparar")
    public ComparacionParadasDTO compararParadas(
            @RequestParam Long origen,
            @RequestParam Long destino
    ) {
        return paradaServicio.compararParadas(origen, destino);
    }

    @GetMapping("/{id}")
    public ParadaDTO buscarParadaPorId(@PathVariable Long id) {
        return paradaServicio.buscarParadaPorId(id);
    }

    @PostMapping("/importar")
    public String importarParadas() {
        int totalImportadas = paradaServicio.importarParadasDesdeDatosVigo();

        return "Paradas importadas correctamente: " + totalImportadas;
    }
}
