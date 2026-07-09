package com.paradabus.controlador;

import com.paradabus.dto.RutaDirectaResultadoDTO;
import com.paradabus.dto.RutaTransbordoResultadoDTO;
import com.paradabus.servicio.RutaDirectaServicio;
import com.paradabus.servicio.RutaTransbordoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rutas")
@RequiredArgsConstructor
public class RutaControlador {

    private final RutaDirectaServicio rutaDirectaServicio;
    private final RutaTransbordoServicio rutaTransbordoServicio;

    // Primera búsqueda de ruta directa.
    //
    // Ejemplo:
    // GET /api/rutas/directas?origenLat=42.232045931&origenLon=-8.708603793&destinoLat=42.2119&destinoLon=-8.7397&fecha=2026-07-09&hora=10:45:00
    @GetMapping("/directas")
    public RutaDirectaResultadoDTO buscarRutasDirectas(
            @RequestParam Double origenLat,
            @RequestParam Double origenLon,
            @RequestParam Double destinoLat,
            @RequestParam Double destinoLon,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String hora,
            @RequestParam(required = false) Integer maxResultados
    ) {
        return rutaDirectaServicio.buscarRutasDirectas(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fecha,
                hora,
                maxResultados
        );
    }

    // Primera búsqueda de rutas con 1 transbordo.
    //
    // De momento solo calcula transbordos en la misma parada.
    // Más adelante añadiremos transbordos caminando entre paradas cercanas.
    //
    // Ejemplo:
    // GET /api/rutas/transbordos?origenLat=42.232045931&origenLon=-8.708603793&destinoLat=42.2119&destinoLon=-8.7397&fecha=2026-07-09&hora=10:45:00
    @GetMapping("/transbordos")
    public RutaTransbordoResultadoDTO buscarRutasConTransbordo(
            @RequestParam Double origenLat,
            @RequestParam Double origenLon,
            @RequestParam Double destinoLat,
            @RequestParam Double destinoLon,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String hora,
            @RequestParam(required = false) Integer maxResultados
    ) {
        return rutaTransbordoServicio.buscarRutasConTransbordo(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fecha,
                hora,
                maxResultados
        );
    }
}