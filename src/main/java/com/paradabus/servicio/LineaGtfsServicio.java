package com.paradabus.servicio;

import com.paradabus.dto.HorarioGrupoLineaGtfsDTO;
import com.paradabus.dto.HorarioSalidaLineaGtfsDTO;
import com.paradabus.dto.HorarioSentidoLineaGtfsDTO;
import com.paradabus.dto.HorariosLineaGtfsDTO;
import com.paradabus.dto.LineaAgrupadaGtfsDTO;
import com.paradabus.dto.LineaGtfsDTO;
import com.paradabus.dto.ParadaRecorridoGtfsDTO;
import com.paradabus.dto.PuntoTrazadoGtfsDTO;
import com.paradabus.dto.RecorridoLineaGtfsDTO;
import com.paradabus.dto.RecorridoMapaLineaGtfsDTO;
import com.paradabus.dto.RecorridoResumenLineaGtfsDTO;
import com.paradabus.dto.SentidoLineaGtfsDTO;
import com.paradabus.modelo.GtfsCalendarDate;
import com.paradabus.modelo.GtfsRoute;
import com.paradabus.modelo.GtfsShape;
import com.paradabus.modelo.GtfsStop;
import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsTrip;
import com.paradabus.repositorio.GtfsCalendarDateRepositorio;
import com.paradabus.repositorio.GtfsRouteRepositorio;
import com.paradabus.repositorio.GtfsShapeRepositorio;
import com.paradabus.repositorio.GtfsStopRepositorio;
import com.paradabus.repositorio.GtfsStopTimeRepositorio;
import com.paradabus.repositorio.GtfsTripRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LineaGtfsServicio {

    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;
    private final GtfsStopRepositorio gtfsStopRepositorio;
    private final GtfsShapeRepositorio gtfsShapeRepositorio;
    private final GtfsCalendarDateRepositorio gtfsCalendarDateRepositorio;

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

    public HorariosLineaGtfsDTO obtenerHorariosLinea(String codigoLinea) {
        List<GtfsRoute> rutas = buscarRutasPorCodigo(codigoLinea);
        List<GtfsTrip> viajes = rutas.stream()
                .map(GtfsRoute::getRouteId)
                .map(gtfsTripRepositorio::findByRouteId)
                .flatMap(List::stream)
                .toList();
        Map<String, Set<String>> gruposPorServiceId = obtenerGruposDiaPorServiceId(viajes);
        Map<String, Map<String, List<HorarioSalidaLineaGtfsDTO>>> salidasPorSentido = new LinkedHashMap<>();

        for (GtfsRoute ruta : rutas) {
            List<GtfsTrip> viajesRuta = viajes.stream()
                    .filter(viaje -> Objects.equals(viaje.getRouteId(), ruta.getRouteId()))
                    .toList();

            for (GtfsTrip viaje : viajesRuta) {
                List<GtfsStopTime> horarios = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(viaje.getTripId());

                if (horarios.isEmpty()) {
                    continue;
                }

                GtfsStopTime primeraParada = horarios.get(0);
                GtfsStopTime ultimaParada = horarios.get(horarios.size() - 1);

                if (primeraParada.getDepartureTime() == null || primeraParada.getDepartureTime().isBlank()) {
                    continue;
                }

                String destino = limpiarTexto(viaje.getTripHeadsign()).isBlank()
                        ? "Sin destino"
                        : limpiarTexto(viaje.getTripHeadsign());

                String paradaInicio = obtenerNombreParada(primeraParada.getStopId());
                String paradaFin = obtenerNombreParada(ultimaParada.getStopId());

                HorarioSalidaLineaGtfsDTO salida = new HorarioSalidaLineaGtfsDTO(
                        viaje.getTripId(),
                        viaje.getDirectionId(),
                        destino,
                        paradaInicio,
                        paradaFin,
                        primeraParada.getDepartureTime(),
                        ultimaParada.getArrivalTime(),
                        horarios.size()
                );

                String clave = viaje.getDirectionId() + "|" + destino + "|" + paradaInicio + "|" + paradaFin;
                Set<String> gruposDia = gruposPorServiceId.getOrDefault(
                        viaje.getServiceId(),
                        inferirGruposPorServiceId(viaje.getServiceId())
                );

                for (String grupoDia : gruposDia) {
                    salidasPorSentido
                            .computeIfAbsent(clave, valor -> new LinkedHashMap<>())
                            .computeIfAbsent(grupoDia, valor -> new ArrayList<>())
                            .add(salida);
                }
            }
        }

        List<HorarioSentidoLineaGtfsDTO> sentidos = salidasPorSentido.entrySet()
                .stream()
                .map((entrada) -> construirHorarioSentido(entrada.getValue()))
                .sorted(Comparator
                        .comparing(HorarioSentidoLineaGtfsDTO::directionId, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(HorarioSentidoLineaGtfsDTO::destino, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        return new HorariosLineaGtfsDTO(
                normalizarCodigoLineaParaUsuario(codigoLinea),
                sentidos.size(),
                sentidos
        );
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

    private HorarioSentidoLineaGtfsDTO construirHorarioSentido(Map<String, List<HorarioSalidaLineaGtfsDTO>> gruposSalidas) {
        List<HorarioGrupoLineaGtfsDTO> grupos = gruposSalidas.entrySet()
                .stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, List<HorarioSalidaLineaGtfsDTO>> entrada) ->
                        ordenarGrupoDia(entrada.getKey())))
                .map((entrada) -> construirHorarioGrupo(entrada.getKey(), entrada.getValue()))
                .filter(Objects::nonNull)
                .toList();

        List<HorarioSalidaLineaGtfsDTO> salidasOrdenadas = grupos.stream()
                .flatMap((grupo) -> grupo.salidas().stream())
                .sorted(Comparator.comparing(
                        HorarioSalidaLineaGtfsDTO::horaSalida,
                        this::compararHorasGtfs
                ))
                .toList();

        HorarioSalidaLineaGtfsDTO primera = salidasOrdenadas.get(0);
        HorarioSalidaLineaGtfsDTO ultima = salidasOrdenadas.get(salidasOrdenadas.size() - 1);

        return new HorarioSentidoLineaGtfsDTO(
                primera.directionId(),
                primera.destino(),
                primera.paradaInicio(),
                primera.paradaFin(),
                primera.tripId(),
                primera.horaSalida(),
                ultima.horaSalida(),
                salidasOrdenadas.size(),
                salidasOrdenadas.stream().limit(14).toList(),
                grupos
        );
    }

    private HorarioGrupoLineaGtfsDTO construirHorarioGrupo(
            String codigoGrupo,
            List<HorarioSalidaLineaGtfsDTO> salidas
    ) {
        if (salidas == null || salidas.isEmpty()) {
            return null;
        }

        List<HorarioSalidaLineaGtfsDTO> salidasOrdenadas = salidas.stream()
                .sorted(Comparator.comparing(
                        HorarioSalidaLineaGtfsDTO::horaSalida,
                        this::compararHorasGtfs
                ))
                .toList();

        return new HorarioGrupoLineaGtfsDTO(
                codigoGrupo,
                obtenerEtiquetaGrupoDia(codigoGrupo),
                salidasOrdenadas.get(0).horaSalida(),
                salidasOrdenadas.get(salidasOrdenadas.size() - 1).horaSalida(),
                salidasOrdenadas.size(),
                salidasOrdenadas.stream().limit(18).toList()
        );
    }

    private Map<String, Set<String>> obtenerGruposDiaPorServiceId(List<GtfsTrip> viajes) {
        List<String> serviceIds = viajes.stream()
                .map(GtfsTrip::getServiceId)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter((valor) -> !valor.isBlank())
                .distinct()
                .toList();

        if (serviceIds.isEmpty()) {
            return Map.of();
        }

        LocalDate hoy = LocalDate.now();
        LocalDate fechaFin = hoy.plusDays(90);
        List<GtfsCalendarDate> fechasServicio = gtfsCalendarDateRepositorio
                .findByServiceIdInAndExceptionTypeAndServiceDateBetween(serviceIds, 1, hoy, fechaFin);

        Map<String, Set<String>> gruposPorServiceId = new LinkedHashMap<>();

        for (GtfsCalendarDate fechaServicio : fechasServicio) {
            gruposPorServiceId
                    .computeIfAbsent(fechaServicio.getServiceId(), (clave) -> new LinkedHashSet<>())
                    .add(convertirFechaEnGrupoDia(fechaServicio.getServiceDate()));
        }

        serviceIds.forEach((serviceId) -> gruposPorServiceId.putIfAbsent(serviceId, inferirGruposPorServiceId(serviceId)));

        return gruposPorServiceId;
    }

    private Set<String> inferirGruposPorServiceId(String serviceId) {
        String texto = limpiarTexto(serviceId).toUpperCase(Locale.ROOT);

        if (texto.contains("SAB")) {
            return new LinkedHashSet<>(List.of("SABADO"));
        }

        if (texto.contains("DOM") || texto.contains("FES")) {
            return new LinkedHashSet<>(List.of("DOMINGO"));
        }

        return new LinkedHashSet<>(List.of("LABORABLE"));
    }

    private String convertirFechaEnGrupoDia(LocalDate fecha) {
        DayOfWeek dayOfWeek = fecha.getDayOfWeek();

        if (dayOfWeek == DayOfWeek.SATURDAY) {
            return "SABADO";
        }

        if (dayOfWeek == DayOfWeek.SUNDAY) {
            return "DOMINGO";
        }

        return "LABORABLE";
    }

    private String obtenerEtiquetaGrupoDia(String codigoGrupo) {
        return switch (codigoGrupo) {
            case "SABADO" -> "Sabado";
            case "DOMINGO" -> "Domingo";
            default -> "Lunes a viernes";
        };
    }

    private int ordenarGrupoDia(String codigoGrupo) {
        return switch (codigoGrupo) {
            case "LABORABLE" -> 1;
            case "SABADO" -> 2;
            case "DOMINGO" -> 3;
            default -> 4;
        };
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

    private String obtenerNombreParada(String stopId) {
        if (stopId == null || stopId.isBlank()) {
            return "Parada";
        }

        return gtfsStopRepositorio.findById(stopId)
                .map(GtfsStop::getStopName)
                .map(this::limpiarTexto)
                .filter(nombre -> !nombre.isBlank())
                .orElse("Parada");
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

    private int compararHorasGtfs(String horaA, String horaB) {
        return Integer.compare(
                convertirHoraGtfsASegundosSeguro(horaA),
                convertirHoraGtfsASegundosSeguro(horaB)
        );
    }

    private int convertirHoraGtfsASegundosSeguro(String horaGtfs) {
        int segundos = convertirHoraGtfsASegundos(horaGtfs);

        return segundos < 0 ? Integer.MAX_VALUE : segundos;
    }

    private int convertirHoraGtfsASegundos(String horaGtfs) {
        if (horaGtfs == null || horaGtfs.isBlank()) {
            return -1;
        }

        String[] partes = horaGtfs.trim().split(":");

        if (partes.length < 2) {
            return -1;
        }

        try {
            int horas = Integer.parseInt(partes[0]);
            int minutos = Integer.parseInt(partes[1]);
            int segundos = partes.length >= 3 ? Integer.parseInt(partes[2]) : 0;

            return horas * 3600 + minutos * 60 + segundos;
        } catch (Exception e) {
            return -1;
        }
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
