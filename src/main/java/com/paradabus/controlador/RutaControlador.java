package com.paradabus.controlador;

import com.paradabus.dto.RutaBusquedaResultadoDTO;
import com.paradabus.dto.RutaDirectaResultadoDTO;
import com.paradabus.dto.RutaTransbordoResultadoDTO;
import com.paradabus.servicio.RutaBusquedaServicio;
import com.paradabus.servicio.RutaDirectaServicio;
import com.paradabus.servicio.RutaTransbordoServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rutas")
@RequiredArgsConstructor
public class RutaControlador {

    private final RutaBusquedaServicio rutaBusquedaServicio;
    private final RutaDirectaServicio rutaDirectaServicio;
    private final RutaTransbordoServicio rutaTransbordoServicio;

    @GetMapping("/buscar")
    public RutaBusquedaResultadoDTO buscarRutas(
            @RequestParam Double origenLat,
            @RequestParam Double origenLon,
            @RequestParam Double destinoLat,
            @RequestParam Double destinoLon,
            @RequestParam(required = false) String fecha,
            @RequestParam(required = false) String hora,
            @RequestParam(required = false) Integer maxResultados,
            @RequestParam(required = false) Boolean forzarTransbordos
    ) {
        return rutaBusquedaServicio.buscarRutas(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fecha,
                hora,
                maxResultados,
                forzarTransbordos
        );
    }

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
