package com.paradabus.controlador;

import com.paradabus.dto.ComparacionParadasDTO;
import com.paradabus.dto.ParadaCercanaDTO;
import com.paradabus.dto.ParadaDTO;
import com.paradabus.servicio.ParadaServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/paradas")
@RequiredArgsConstructor
public class ParadaControlador {

    private final ParadaServicio paradaServicio;

    // Listar todas las paradas
    // También permite buscar por nombre:
    // GET /api/paradas?buscar=Urzáiz
    @GetMapping
    public List<ParadaDTO> listarParadas(
            @RequestParam(required = false) String buscar
    ) {
        if (buscar != null && !buscar.trim().isEmpty()) {
            return paradaServicio.buscarParadasPorNombre(buscar);
        }

        return paradaServicio.listarParadas();
    }

    // Buscar paradas cercanas a una ubicación
    // Ejemplo:
    // GET /api/paradas/cercanas?lat=42.232045931&lon=-8.708603793&radio=300
    @GetMapping("/cercanas")
    public List<ParadaCercanaDTO> buscarParadasCercanas(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false) Double radio
    ) {
        return paradaServicio.buscarParadasCercanas(lat, lon, radio);
    }

    // Compara dos paradas para ver si tienen líneas en común
    // Ejemplo:
    // GET /api/paradas/comparar?origen=8630&destino=14264
    @GetMapping("/comparar")
    public ComparacionParadasDTO compararParadas(
            @RequestParam Long origen,
            @RequestParam Long destino
    ) {
        return paradaServicio.compararParadas(origen, destino);
    }

    // Buscar una parada concreta por ID
    // Ejemplo:
    // GET /api/paradas/8630
    @GetMapping("/{id}")
    public ParadaDTO buscarParadaPorId(@PathVariable Long id) {
        return paradaServicio.buscarParadaPorId(id);
    }

    // Endpoint temporal para importar paradas desde datos abiertos de Vigo
    // POST /api/paradas/importar
    @PostMapping("/importar")
    public String importarParadas() {
        int totalImportadas = paradaServicio.importarParadasDesdeDatosVigo();

        return "Paradas importadas correctamente: " + totalImportadas;
    }
}