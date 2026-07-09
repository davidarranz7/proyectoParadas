package com.paradabus.servicio;

import com.paradabus.cliente.ClienteGtfs;
import com.paradabus.dto.GtfsImportacionResultadoDTO;
import com.paradabus.modelo.GtfsCalendarDate;
import com.paradabus.modelo.GtfsRoute;
import com.paradabus.modelo.GtfsStop;
import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsTrip;
import com.paradabus.repositorio.GtfsCalendarDateRepositorio;
import com.paradabus.repositorio.GtfsRouteRepositorio;
import com.paradabus.repositorio.GtfsStopRepositorio;
import com.paradabus.repositorio.GtfsStopTimeRepositorio;
import com.paradabus.repositorio.GtfsTripRepositorio;
import com.paradabus.repositorio.ParadaRepositorio;
import com.paradabus.utilidad.GtfsCsvUtilidad;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class GtfsImportacionServicio {

    private static final int TAMANO_BLOQUE_GUARDADO = 5000;

    private final ClienteGtfs clienteGtfs;

    private final GtfsStopRepositorio gtfsStopRepositorio;
    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsCalendarDateRepositorio gtfsCalendarDateRepositorio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;

    private final ParadaRepositorio paradaRepositorio;

    // Importa los datos básicos del GTFS:
    // stops.txt -> gtfs_stops
    // routes.txt -> gtfs_routes
    @Transactional
    public GtfsImportacionResultadoDTO importarGtfsBasico() {
        OffsetDateTime ahora = OffsetDateTime.now();

        int totalRoutes = importarRoutes(ahora);
        int totalStops = importarStops(ahora);

        return new GtfsImportacionResultadoDTO(
                totalStops,
                totalRoutes,
                0,
                0,
                0,
                "GTFS básico importado correctamente"
        );
    }

    // Importa calendar_dates.txt -> gtfs_calendar_dates
    @Transactional
    public GtfsImportacionResultadoDTO importarCalendarDates() {
        OffsetDateTime ahora = OffsetDateTime.now();

        int totalCalendarDates = importarCalendarDatesDesdeArchivo(ahora);

        return new GtfsImportacionResultadoDTO(
                0,
                0,
                0,
                0,
                totalCalendarDates,
                "Fechas de servicio GTFS importadas correctamente"
        );
    }

    // Importa trips.txt -> gtfs_trips
    @Transactional
    public GtfsImportacionResultadoDTO importarTrips() {
        OffsetDateTime ahora = OffsetDateTime.now();

        int totalTrips = importarTripsDesdeArchivo(ahora);

        return new GtfsImportacionResultadoDTO(
                0,
                0,
                totalTrips,
                0,
                0,
                "Viajes GTFS importados correctamente"
        );
    }

    // Importa stop_times.txt -> gtfs_stop_times
    @Transactional
    public GtfsImportacionResultadoDTO importarStopTimes() {
        OffsetDateTime ahora = OffsetDateTime.now();

        int totalStopTimes = importarStopTimesDesdeArchivo(ahora);

        return new GtfsImportacionResultadoDTO(
                0,
                0,
                0,
                totalStopTimes,
                0,
                "Horarios de paso GTFS importados correctamente"
        );
    }

    // Importa routes.txt
    private int importarRoutes(OffsetDateTime ahora) {
        List<String> lineas = clienteGtfs.leerLineasArchivo("routes.txt");

        List<GtfsRoute> routes = lineas.stream()
                .map(linea -> convertirLineaEnGtfsRoute(linea, ahora))
                .filter(Objects::nonNull)
                .toList();

        gtfsRouteRepositorio.saveAll(routes);

        return routes.size();
    }

    // Importa stops.txt
    private int importarStops(OffsetDateTime ahora) {
        List<String> lineas = clienteGtfs.leerLineasArchivo("stops.txt");

        List<GtfsStop> stops = lineas.stream()
                .map(linea -> convertirLineaEnGtfsStop(linea, ahora))
                .filter(Objects::nonNull)
                .toList();

        gtfsStopRepositorio.saveAll(stops);

        return stops.size();
    }

    // Importa calendar_dates.txt
    private int importarCalendarDatesDesdeArchivo(OffsetDateTime ahora) {
        List<String> lineas = clienteGtfs.leerLineasArchivo("calendar_dates.txt");

        List<GtfsCalendarDate> calendarDates = lineas.stream()
                .map(linea -> convertirLineaEnGtfsCalendarDate(linea, ahora))
                .filter(Objects::nonNull)
                .toList();

        // Borramos las fechas anteriores porque calendar_dates.txt es la fuente actual.
        // Así evitamos dejar fechas antiguas si el GTFS cambia.
        gtfsCalendarDateRepositorio.deleteAllInBatch();

        gtfsCalendarDateRepositorio.saveAll(calendarDates);

        return calendarDates.size();
    }

    // Importa trips.txt
    private int importarTripsDesdeArchivo(OffsetDateTime ahora) {
        List<String> lineas = clienteGtfs.leerLineasArchivo("trips.txt");

        List<GtfsTrip> trips = lineas.stream()
                .map(linea -> convertirLineaEnGtfsTrip(linea, ahora))
                .filter(Objects::nonNull)
                .toList();

        // Borramos los viajes anteriores porque trips.txt es la fuente actual.
        // Más adelante stop_times depende de estos viajes.
        gtfsTripRepositorio.deleteAllInBatch();

        gtfsTripRepositorio.saveAll(trips);

        return trips.size();
    }

    // Importa stop_times.txt
    private int importarStopTimesDesdeArchivo(OffsetDateTime ahora) {
        List<String> lineas = clienteGtfs.leerLineasArchivo("stop_times.txt");

        // Borramos los horarios anteriores porque stop_times.txt es la fuente actual.
        gtfsStopTimeRepositorio.deleteAllInBatch();

        List<GtfsStopTime> bloque = new ArrayList<>();
        int totalImportados = 0;

        for (String linea : lineas) {
            GtfsStopTime stopTime = convertirLineaEnGtfsStopTime(linea, ahora);

            if (stopTime == null) {
                continue;
            }

            bloque.add(stopTime);

            if (bloque.size() >= TAMANO_BLOQUE_GUARDADO) {
                gtfsStopTimeRepositorio.saveAll(bloque);
                totalImportados += bloque.size();
                bloque.clear();
            }
        }

        if (!bloque.isEmpty()) {
            gtfsStopTimeRepositorio.saveAll(bloque);
            totalImportados += bloque.size();
            bloque.clear();
        }

        return totalImportados;
    }

    // Convierte una línea de routes.txt en entidad GtfsRoute
    private GtfsRoute convertirLineaEnGtfsRoute(
            String linea,
            OffsetDateTime ahora
    ) {
        List<String> campos = GtfsCsvUtilidad.separarLineaCsv(linea);

        String routeId = GtfsCsvUtilidad.obtenerTextoONull(campos, 0);

        if (routeId == null) {
            return null;
        }

        GtfsRoute route = gtfsRouteRepositorio.findById(routeId)
                .orElseGet(() -> GtfsRoute.builder()
                        .routeId(routeId)
                        .fechaCreacion(ahora)
                        .build());

        route.setAgencyId(GtfsCsvUtilidad.obtenerTextoONull(campos, 1));
        route.setRouteShortName(GtfsCsvUtilidad.obtenerTextoONull(campos, 2));
        route.setRouteLongName(GtfsCsvUtilidad.obtenerTextoONull(campos, 3));
        route.setRouteDesc(GtfsCsvUtilidad.obtenerTextoONull(campos, 4));
        route.setRouteType(GtfsCsvUtilidad.obtenerIntegerONull(campos, 5));
        route.setRouteUrl(GtfsCsvUtilidad.obtenerTextoONull(campos, 6));
        route.setRouteColor(GtfsCsvUtilidad.obtenerTextoONull(campos, 7));
        route.setRouteTextColor(GtfsCsvUtilidad.obtenerTextoONull(campos, 8));

        if (route.getFechaCreacion() == null) {
            route.setFechaCreacion(ahora);
        }

        route.setFechaActualizacion(ahora);

        return route;
    }

    // Convierte una línea de stops.txt en entidad GtfsStop
    private GtfsStop convertirLineaEnGtfsStop(
            String linea,
            OffsetDateTime ahora
    ) {
        List<String> campos = GtfsCsvUtilidad.separarLineaCsv(linea);

        String stopId = GtfsCsvUtilidad.obtenerTextoONull(campos, 0);
        String stopName = GtfsCsvUtilidad.obtenerTextoONull(campos, 2);
        Double stopLat = GtfsCsvUtilidad.obtenerDoubleONull(campos, 4);
        Double stopLon = GtfsCsvUtilidad.obtenerDoubleONull(campos, 5);

        if (stopId == null || stopName == null || stopLat == null || stopLon == null) {
            return null;
        }

        GtfsStop stop = gtfsStopRepositorio.findById(stopId)
                .orElseGet(() -> GtfsStop.builder()
                        .stopId(stopId)
                        .fechaCreacion(ahora)
                        .build());

        String stopCode = GtfsCsvUtilidad.obtenerTextoONull(campos, 1);

        stop.setStopCode(stopCode);
        stop.setStopName(stopName);
        stop.setStopDesc(GtfsCsvUtilidad.obtenerTextoONull(campos, 3));
        stop.setStopLat(stopLat);
        stop.setStopLon(stopLon);
        stop.setZoneId(GtfsCsvUtilidad.obtenerTextoONull(campos, 6));
        stop.setStopUrl(GtfsCsvUtilidad.obtenerTextoONull(campos, 7));
        stop.setLocationType(GtfsCsvUtilidad.obtenerIntegerONull(campos, 8));
        stop.setParentStation(GtfsCsvUtilidad.obtenerTextoONull(campos, 9));
        stop.setStopTimezone(GtfsCsvUtilidad.obtenerTextoONull(campos, 10));
        stop.setWheelchairBoarding(GtfsCsvUtilidad.obtenerIntegerONull(campos, 11));

        Long paradaId = obtenerParadaIdRelacionada(stopCode);
        stop.setParadaId(paradaId);

        if (stop.getFechaCreacion() == null) {
            stop.setFechaCreacion(ahora);
        }

        stop.setFechaActualizacion(ahora);

        return stop;
    }

    // Convierte una línea de calendar_dates.txt en entidad GtfsCalendarDate
    private GtfsCalendarDate convertirLineaEnGtfsCalendarDate(
            String linea,
            OffsetDateTime ahora
    ) {
        List<String> campos = GtfsCsvUtilidad.separarLineaCsv(linea);

        String serviceId = GtfsCsvUtilidad.obtenerTextoONull(campos, 0);

        if (serviceId == null) {
            return null;
        }

        if (GtfsCsvUtilidad.obtenerFechaGtfsONull(campos, 1) == null) {
            return null;
        }

        if (GtfsCsvUtilidad.obtenerIntegerONull(campos, 2) == null) {
            return null;
        }

        return GtfsCalendarDate.builder()
                .serviceId(serviceId)
                .serviceDate(GtfsCsvUtilidad.obtenerFechaGtfsONull(campos, 1))
                .exceptionType(GtfsCsvUtilidad.obtenerIntegerONull(campos, 2))
                .fechaCreacion(ahora)
                .fechaActualizacion(ahora)
                .build();
    }

    // Convierte una línea de trips.txt en entidad GtfsTrip
    private GtfsTrip convertirLineaEnGtfsTrip(
            String linea,
            OffsetDateTime ahora
    ) {
        List<String> campos = GtfsCsvUtilidad.separarLineaCsv(linea);

        String routeId = GtfsCsvUtilidad.obtenerTextoONull(campos, 0);
        String serviceId = GtfsCsvUtilidad.obtenerTextoONull(campos, 1);
        String tripId = GtfsCsvUtilidad.obtenerTextoONull(campos, 2);

        if (routeId == null || serviceId == null || tripId == null) {
            return null;
        }

        return GtfsTrip.builder()
                .routeId(routeId)
                .serviceId(serviceId)
                .tripId(tripId)
                .tripHeadsign(GtfsCsvUtilidad.obtenerTextoONull(campos, 3))
                .directionId(GtfsCsvUtilidad.obtenerIntegerONull(campos, 4))
                .blockId(GtfsCsvUtilidad.obtenerTextoONull(campos, 5))
                .shapeId(GtfsCsvUtilidad.obtenerTextoONull(campos, 6))
                .wheelchairAccessible(GtfsCsvUtilidad.obtenerIntegerONull(campos, 7))
                .fechaCreacion(ahora)
                .fechaActualizacion(ahora)
                .build();
    }

    // Convierte una línea de stop_times.txt en entidad GtfsStopTime
    private GtfsStopTime convertirLineaEnGtfsStopTime(
            String linea,
            OffsetDateTime ahora
    ) {
        List<String> campos = GtfsCsvUtilidad.separarLineaCsv(linea);

        String tripId = GtfsCsvUtilidad.obtenerTextoONull(campos, 0);
        String stopId = GtfsCsvUtilidad.obtenerTextoONull(campos, 3);
        Integer stopSequence = GtfsCsvUtilidad.obtenerIntegerONull(campos, 4);

        if (tripId == null || stopId == null || stopSequence == null) {
            return null;
        }

        return GtfsStopTime.builder()
                .tripId(tripId)
                .arrivalTime(GtfsCsvUtilidad.obtenerTextoONull(campos, 1))
                .departureTime(GtfsCsvUtilidad.obtenerTextoONull(campos, 2))
                .stopId(stopId)
                .stopSequence(stopSequence)
                .stopHeadsign(GtfsCsvUtilidad.obtenerTextoONull(campos, 5))
                .pickupType(GtfsCsvUtilidad.obtenerIntegerONull(campos, 6))
                .dropOffType(GtfsCsvUtilidad.obtenerIntegerONull(campos, 7))
                .shapeDistTraveled(GtfsCsvUtilidad.obtenerDoubleONull(campos, 8))
                .fechaCreacion(ahora)
                .fechaActualizacion(ahora)
                .build();
    }

    // Convierte stop_code en parada_id y comprueba que exista en nuestra tabla paradas
    private Long obtenerParadaIdRelacionada(String stopCode) {
        Long paradaId = GtfsCsvUtilidad.obtenerParadaIdDesdeStopCode(stopCode);

        if (paradaId == null) {
            return null;
        }

        if (!paradaRepositorio.existsById(paradaId)) {
            return null;
        }

        return paradaId;
    }
}