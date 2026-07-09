package com.paradabus.servicio;

import com.paradabus.dto.LineaAgrupadaGtfsDTO;
import com.paradabus.dto.LineaGtfsDTO;
import com.paradabus.dto.ParadaRecorridoGtfsDTO;
import com.paradabus.dto.PuntoTrazadoGtfsDTO;
import com.paradabus.dto.RecorridoLineaGtfsDTO;
import com.paradabus.dto.RecorridoMapaLineaGtfsDTO;
import com.paradabus.dto.RecorridoResumenLineaGtfsDTO;
import com.paradabus.dto.SentidoLineaGtfsDTO;
import com.paradabus.modelo.GtfsRoute;
import com.paradabus.modelo.GtfsShape;
import com.paradabus.modelo.GtfsStop;
import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsTrip;
import com.paradabus.repositorio.GtfsRouteRepositorio;
import com.paradabus.repositorio.GtfsShapeRepositorio;
import com.paradabus.repositorio.GtfsStopRepositorio;
import com.paradabus.repositorio.GtfsStopTimeRepositorio;
import com.paradabus.repositorio.GtfsTripRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class LineaGtfsServicio {

    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;
    private final GtfsStopRepositorio gtfsStopRepositorio;
    private final GtfsShapeRepositorio gtfsShapeRepositorio;

    public List<LineaGtfsDTO> listarLineas() {
        return gtfsRouteRepositorio.findAll()
                .stream()
                .map(route -> new LineaGtfsDTO(
                        route.getRouteId(),
                        route.getRouteShortName(),
                        route.getRouteLongName(),
                        route.getRouteColor()
                ))
                .sorted(Comparator.comparing(
                        LineaGtfsDTO::codigo,
                        this::compararLineas
                ))
                .toList();
    }

    public List<LineaAgrupadaGtfsDTO> listarLineasAgrupadas() {
        List<GtfsRoute> rutas = gtfsRouteRepositorio.findAll();

        Map<String, List<GtfsRoute>> rutasPorCodigoLimpio = new LinkedHashMap<>();

        rutas.stream()
                .sorted(Comparator.comparing(
                        GtfsRoute::getRouteShortName,
                        this::compararLineas
                ))
                .forEach(ruta -> {
                    String codigoLimpio = normalizarCodigoLineaParaUsuario(ruta.getRouteShortName());

                    if (codigoLimpio.isBlank()) {
                        return;
                    }

                    rutasPorCodigoLimpio
                            .computeIfAbsent(codigoLimpio, clave -> new ArrayList<>())
                            .add(ruta);
                });

        List<LineaAgrupadaGtfsDTO> resultado = new ArrayList<>();

        for (Map.Entry<String, List<GtfsRoute>> entrada : rutasPorCodigoLimpio.entrySet()) {
            String codigo = entrada.getKey();
            List<GtfsRoute> rutasDeLinea = entrada.getValue();

            List<RecorridoResumenLineaGtfsDTO> recorridos = obtenerRecorridosResumenDeRutas(rutasDeLinea);

            if (recorridos.isEmpty()) {
                continue;
            }

            List<String> routeIds = rutasDeLinea.stream()
                    .map(GtfsRoute::getRouteId)
                    .distinct()
                    .toList();

            String nombrePrincipal = elegirNombrePrincipal(rutasDeLinea);
            String color = elegirColorPrincipal(rutasDeLinea);

            resultado.add(new LineaAgrupadaGtfsDTO(
                    codigo,
                    nombrePrincipal,
                    color,
                    routeIds.size(),
                    recorridos.size(),
                    routeIds,
                    recorridos
            ));
        }

        return resultado.stream()
                .sorted(Comparator.comparing(
                        LineaAgrupadaGtfsDTO::codigo,
                        this::compararLineas
                ))
                .toList();
    }

    public List<SentidoLineaGtfsDTO> listarSentidosDeLinea(String codigoLinea) {
        List<GtfsRoute> rutas = buscarRutasPorCodigo(codigoLinea);

        List<SentidoLineaGtfsDTO> sentidos = new ArrayList<>();

        for (GtfsRoute ruta : rutas) {
            List<GtfsTrip> viajes = gtfsTripRepositorio.findByRouteId(ruta.getRouteId());

            Map<String, SentidoLineaGtfsDTO> mejoresSentidos = new LinkedHashMap<>();

            for (GtfsTrip viaje : viajes) {
                long totalParadas = gtfsStopTimeRepositorio.countByTripId(viaje.getTripId());

                String clave = viaje.getDirectionId() + "|" + limpiarTexto(viaje.getTripHeadsign());

                SentidoLineaGtfsDTO sentidoActual = mejoresSentidos.get(clave);

                if (sentidoActual == null || totalParadas > sentidoActual.totalParadas()) {
                    mejoresSentidos.put(
                            clave,
                            new SentidoLineaGtfsDTO(
                                    ruta.getRouteId(),
                                    ruta.getRouteShortName(),
                                    viaje.getTripHeadsign(),
                                    viaje.getDirectionId(),
                                    viaje.getTripId(),
                                    Math.toIntExact(totalParadas)
                            )
                    );
                }
            }

            sentidos.addAll(mejoresSentidos.values());
        }

        return sentidos.stream()
                .sorted(Comparator
                        .comparing(SentidoLineaGtfsDTO::directionId, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(SentidoLineaGtfsDTO::destino, Comparator.nullsLast(String::compareToIgnoreCase))
                )
                .toList();
    }

    public RecorridoLineaGtfsDTO obtenerRecorridoLinea(
            String codigoLinea,
            Integer directionId,
            String tripId
    ) {
        GtfsTrip viajeElegido = obtenerViajeElegido(codigoLinea, directionId, tripId);

        GtfsRoute ruta = gtfsRouteRepositorio.findById(viajeElegido.getRouteId())
                .orElseThrow(() -> new RuntimeException("No existe la ruta GTFS: " + viajeElegido.getRouteId()));

        List<ParadaRecorridoGtfsDTO> paradas = obtenerParadasOrdenadasDeViaje(viajeElegido.getTripId());

        return new RecorridoLineaGtfsDTO(
                ruta.getRouteId(),
                normalizarCodigoLineaParaUsuario(ruta.getRouteShortName()),
                viajeElegido.getTripHeadsign(),
                viajeElegido.getDirectionId(),
                viajeElegido.getTripId(),
                paradas.size(),
                paradas
        );
    }

    public RecorridoMapaLineaGtfsDTO obtenerRecorridoMapaLinea(
            String codigoLinea,
            Integer directionId,
            String tripId
    ) {
        GtfsTrip viajeElegido = obtenerViajeElegido(codigoLinea, directionId, tripId);

        GtfsRoute ruta = gtfsRouteRepositorio.findById(viajeElegido.getRouteId())
                .orElseThrow(() -> new RuntimeException("No existe la ruta GTFS: " + viajeElegido.getRouteId()));

        List<ParadaRecorridoGtfsDTO> paradas = obtenerParadasOrdenadasDeViaje(viajeElegido.getTripId());
        List<PuntoTrazadoGtfsDTO> trazado = obtenerTrazadoDeViaje(viajeElegido);

        return new RecorridoMapaLineaGtfsDTO(
                ruta.getRouteId(),
                normalizarCodigoLineaParaUsuario(ruta.getRouteShortName()),
                viajeElegido.getTripHeadsign(),
                viajeElegido.getDirectionId(),
                viajeElegido.getTripId(),
                viajeElegido.getShapeId(),
                ruta.getRouteColor(),
                paradas.size(),
                trazado.size(),
                paradas,
                trazado
        );
    }

    private GtfsTrip obtenerViajeElegido(
            String codigoLinea,
            Integer directionId,
            String tripId
    ) {
        if (tripId != null && !tripId.isBlank()) {
            return gtfsTripRepositorio.findById(tripId)
                    .orElseThrow(() -> new RuntimeException("No existe el viaje GTFS con tripId: " + tripId));
        }

        return elegirViajeRepresentativo(codigoLinea, directionId);
    }

    private List<ParadaRecorridoGtfsDTO> obtenerParadasOrdenadasDeViaje(String tripId) {
        List<GtfsStopTime> horarios = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(tripId);

        List<ParadaRecorridoGtfsDTO> paradas = new ArrayList<>();

        for (GtfsStopTime horario : horarios) {
            Optional<GtfsStop> stopOptional = gtfsStopRepositorio.findById(horario.getStopId());

            if (stopOptional.isEmpty()) {
                continue;
            }

            GtfsStop stop = stopOptional.get();

            paradas.add(new ParadaRecorridoGtfsDTO(
                    horario.getStopSequence(),
                    stop.getStopId(),
                    obtenerParadaIdDesdeStopCode(stop.getStopCode()),
                    stop.getStopName(),
                    stop.getStopLat(),
                    stop.getStopLon(),
                    horario.getArrivalTime(),
                    horario.getDepartureTime()
            ));
        }

        return paradas;
    }

    private List<PuntoTrazadoGtfsDTO> obtenerTrazadoDeViaje(GtfsTrip viaje) {
        if (viaje.getShapeId() == null || viaje.getShapeId().isBlank()) {
            return List.of();
        }

        List<GtfsShape> puntos = gtfsShapeRepositorio.findByIdShapeIdOrderByIdShapePtSequenceAsc(
                viaje.getShapeId()
        );

        return puntos.stream()
                .map(punto -> new PuntoTrazadoGtfsDTO(
                        punto.getId().getShapePtSequence(),
                        punto.getShapePtLat(),
                        punto.getShapePtLon(),
                        punto.getShapeDistTraveled()
                ))
                .toList();
    }

    private List<RecorridoResumenLineaGtfsDTO> obtenerRecorridosResumenDeRutas(List<GtfsRoute> rutas) {
        Map<String, RecorridoResumenLineaGtfsDTO> recorridosPorClave = new LinkedHashMap<>();

        for (GtfsRoute ruta : rutas) {
            List<GtfsTrip> viajes = gtfsTripRepositorio.findByRouteId(ruta.getRouteId());

            for (GtfsTrip viaje : viajes) {
                String destino = limpiarTexto(viaje.getTripHeadsign());

                if (destino.isBlank()) {
                    destino = "Sin destino";
                }

                String clave = normalizarCodigoLineaParaUsuario(ruta.getRouteShortName())
                        + "|"
                        + ruta.getRouteId()
                        + "|"
                        + viaje.getDirectionId()
                        + "|"
                        + destino;

                long totalParadas = gtfsStopTimeRepositorio.countByTripId(viaje.getTripId());

                if (totalParadas <= 0) {
                    continue;
                }

                RecorridoResumenLineaGtfsDTO recorridoActual = recorridosPorClave.get(clave);

                if (recorridoActual == null || totalParadas > recorridoActual.totalParadas()) {
                    recorridosPorClave.put(
                            clave,
                            new RecorridoResumenLineaGtfsDTO(
                                    ruta.getRouteId(),
                                    destino,
                                    viaje.getDirectionId(),
                                    viaje.getTripId(),
                                    Math.toIntExact(totalParadas)
                            )
                    );
                }
            }
        }

        return recorridosPorClave.values()
                .stream()
                .sorted(Comparator
                        .comparing(RecorridoResumenLineaGtfsDTO::directionId, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RecorridoResumenLineaGtfsDTO::destino, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(RecorridoResumenLineaGtfsDTO::totalParadas, Comparator.reverseOrder())
                )
                .toList();
    }

    private String elegirNombrePrincipal(List<GtfsRoute> rutas) {
        return rutas.stream()
                .map(GtfsRoute::getRouteLongName)
                .map(this::limpiarTexto)
                .filter(nombre -> !nombre.isBlank())
                .max(Comparator.comparingInt(String::length))
                .orElse("");
    }

    private String elegirColorPrincipal(List<GtfsRoute> rutas) {
        return rutas.stream()
                .map(GtfsRoute::getRouteColor)
                .map(this::limpiarTexto)
                .filter(color -> !color.isBlank())
                .findFirst()
                .orElse(null);
    }

    private GtfsTrip elegirViajeRepresentativo(String codigoLinea, Integer directionId) {
        List<GtfsRoute> rutas = buscarRutasPorCodigo(codigoLinea);

        GtfsTrip mejorViaje = null;
        long mayorNumeroParadas = -1;

        for (GtfsRoute ruta : rutas) {
            List<GtfsTrip> viajes = gtfsTripRepositorio.findByRouteId(ruta.getRouteId());

            for (GtfsTrip viaje : viajes) {
                if (directionId != null && !directionId.equals(viaje.getDirectionId())) {
                    continue;
                }

                long totalParadas = gtfsStopTimeRepositorio.countByTripId(viaje.getTripId());

                if (totalParadas > mayorNumeroParadas) {
                    mayorNumeroParadas = totalParadas;
                    mejorViaje = viaje;
                }
            }
        }

        if (mejorViaje == null) {
            throw new RuntimeException("No se encontró recorrido para la línea: " + codigoLinea);
        }

        return mejorViaje;
    }

    private List<GtfsRoute> buscarRutasPorCodigo(String codigoLinea) {
        String codigoNormalizado = normalizarCodigoLineaParaUsuario(codigoLinea);

        if (codigoNormalizado.isBlank()) {
            throw new RuntimeException("El código de línea es obligatorio");
        }

        List<GtfsRoute> rutas = gtfsRouteRepositorio.findAll()
                .stream()
                .filter(ruta -> normalizarCodigoLineaParaUsuario(ruta.getRouteShortName()).equalsIgnoreCase(codigoNormalizado))
                .toList();

        if (rutas.isEmpty()) {
            throw new RuntimeException("No existe la línea GTFS: " + codigoLinea);
        }

        return rutas;
    }

    private Long obtenerParadaIdDesdeStopCode(String stopCode) {
        if (stopCode == null || stopCode.isBlank()) {
            return null;
        }

        String soloNumeros = stopCode.replaceAll("[^0-9]", "");

        if (soloNumeros.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(soloNumeros);
        } catch (Exception e) {
            return null;
        }
    }

    private String limpiarTexto(String texto) {
        if (texto == null) {
            return "";
        }

        return texto.trim().replaceAll("\\s+", " ");
    }

    private String normalizarCodigoLineaParaUsuario(String codigo) {
        String valor = limpiarTexto(codigo);

        if (valor.isBlank()) {
            return "";
        }

        valor = valor.toUpperCase();

        valor = valor.replaceAll("[.\\-]+$", "");

        valor = valor.replaceAll("^PSA\\s*(\\d+)$", "PSA $1");

        return valor.trim().replaceAll("\\s+", " ");
    }

    private int compararLineas(String lineaA, String lineaB) {
        int grupoA = obtenerGrupoLinea(lineaA);
        int grupoB = obtenerGrupoLinea(lineaB);

        if (grupoA != grupoB) {
            return Integer.compare(grupoA, grupoB);
        }

        Integer numeroA = extraerPrimerNumero(lineaA);
        Integer numeroB = extraerPrimerNumero(lineaB);

        if (numeroA != null && numeroB != null && !numeroA.equals(numeroB)) {
            return Integer.compare(numeroA, numeroB);
        }

        return lineaA.compareToIgnoreCase(lineaB);
    }

    private int obtenerGrupoLinea(String linea) {
        String valor = linea == null ? "" : linea.toUpperCase();

        if (valor.matches("^\\d+.*")) {
            return 1;
        }

        if (valor.startsWith("C")) {
            return 2;
        }

        if (valor.startsWith("A")) {
            return 3;
        }

        if (valor.startsWith("H")) {
            return 4;
        }

        if (valor.startsWith("N")) {
            return 5;
        }

        if (valor.startsWith("PSA")) {
            return 6;
        }

        return 7;
    }

    private Integer extraerPrimerNumero(String linea) {
        if (linea == null) {
            return null;
        }

        String numero = linea.replaceAll("^[^0-9]*([0-9]+).*$", "$1");

        if (!numero.matches("\\d+")) {
            return null;
        }

        try {
            return Integer.parseInt(numero);
        } catch (Exception e) {
            return null;
        }
    }
}