package com.paradabus.controlador;

import com.paradabus.dto.GtfsArchivoDTO;
import com.paradabus.dto.GtfsImportacionResultadoDTO;
import com.paradabus.dto.GtfsVistaPreviaArchivoDTO;
import com.paradabus.dto.ProximosBusesParadaGtfsDTO;
import com.paradabus.servicio.GtfsConsultaServicio;
import com.paradabus.servicio.GtfsImportacionServicio;
import com.paradabus.servicio.GtfsServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/gtfs")
@RequiredArgsConstructor
public class GtfsControlador {

    private final GtfsServicio gtfsServicio;
    private final GtfsImportacionServicio gtfsImportacionServicio;
    private final GtfsConsultaServicio gtfsConsultaServicio;

    // Lista los archivos que vienen dentro del ZIP GTFS
    // Ejemplo:
    // GET /api/gtfs/archivos
    @GetMapping("/archivos")
    public List<GtfsArchivoDTO> listarArchivosGtfs() {
        return gtfsServicio.listarArchivosGtfs();
    }

    // Devuelve la cabecera y las primeras líneas de un archivo GTFS concreto
    // Ejemplo:
    // GET /api/gtfs/vista-previa?archivo=stops.txt
    // GET /api/gtfs/vista-previa?archivo=routes.txt&limite=10
    @GetMapping("/vista-previa")
    public GtfsVistaPreviaArchivoDTO obtenerVistaPreviaArchivo(
            @RequestParam String archivo,
            @RequestParam(required = false) Integer limite
    ) {
        return gtfsServicio.obtenerVistaPreviaArchivo(archivo, limite);
    }

    // Importa datos básicos del GTFS:
    // routes.txt -> gtfs_routes
    // stops.txt  -> gtfs_stops
    //
    // Ejemplo:
    // POST /api/gtfs/importar-basico
    @PostMapping("/importar-basico")
    public GtfsImportacionResultadoDTO importarGtfsBasico() {
        return gtfsImportacionServicio.importarGtfsBasico();
    }

    // Importa las fechas de servicio del GTFS:
    // calendar_dates.txt -> gtfs_calendar_dates
    //
    // Ejemplo:
    // POST /api/gtfs/importar-calendar-dates
    @PostMapping("/importar-calendar-dates")
    public GtfsImportacionResultadoDTO importarCalendarDates() {
        return gtfsImportacionServicio.importarCalendarDates();
    }

    // Importa los viajes del GTFS:
    // trips.txt -> gtfs_trips
    //
    // Ejemplo:
    // POST /api/gtfs/importar-trips
    @PostMapping("/importar-trips")
    public GtfsImportacionResultadoDTO importarTrips() {
        return gtfsImportacionServicio.importarTrips();
    }

    // Importa los horarios de paso del GTFS:
    // stop_times.txt -> gtfs_stop_times
    //
    // Ejemplo:
    // POST /api/gtfs/importar-stop-times
    @PostMapping("/importar-stop-times")
    public GtfsImportacionResultadoDTO importarStopTimes() {
        return gtfsImportacionServicio.importarStopTimes();
    }

    // Devuelve los próximos buses programados de una parada concreta usando GTFS.
    //
    // Ejemplo normal:
    // GET /api/gtfs/paradas/8630/proximos
    //
    // Ejemplo con fecha y hora manual:
    // GET /api/gtfs/paradas/8630/proximos?fecha=2026-07-09&hora=13:50:00
    @GetMapping("/paradas/{paradaId}/proximos")
    public ProximosBusesParadaGtfsDTO buscarProximosBusesPorParada(
            @PathVariable Long paradaId,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fecha,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.TIME)
            LocalTime hora
    ) {
        return gtfsConsultaServicio.buscarProximosBusesPorParada(
                paradaId,
                fecha,
                hora
        );
    }
}