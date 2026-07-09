package com.paradabus.servicio;

import com.paradabus.dto.*;
import com.paradabus.modelo.GtfsRoute;
import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsTrip;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.GtfsRouteRepositorio;
import com.paradabus.repositorio.GtfsStopTimeRepositorio;
import com.paradabus.repositorio.GtfsTripRepositorio;
import com.paradabus.repositorio.ParadaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RutaDirectaServicio {

    private static final double VELOCIDAD_ANDANDO_METROS_POR_MINUTO = 80.0;

    private static final int MAX_PARADAS_ORIGEN = 8;
    private static final int MAX_PARADAS_DESTINO = 8;
    private static final int MAX_BUSES_POR_PARADA = 25;

    private static final int MARGEN_SEGURIDAD_MINUTOS = 1;
    private static final int MAX_SIGUIENTES_SALIDAS = 5;

    private final ParadaRepositorio paradaRepositorio;
    private final GtfsConsultaServicio gtfsConsultaServicio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;

    @Value("${paradabus.rutas.radio-origen-metros:700}")
    private Integer radioOrigenMetros;

    @Value("${paradabus.rutas.radio-destino-metros:700}")
    private Integer radioDestinoMetros;

    public RutaDirectaResultadoDTO buscarRutasDirectas(
            Double origenLat,
            Double origenLon,
            Double destinoLat,
            Double destinoLon,
            String fechaTexto,
            String horaTexto,
            Integer maxResultados
    ) {
        validarCoordenadas(origenLat, origenLon, destinoLat, destinoLon);

        LocalDate fechaConsulta = parsearFecha(fechaTexto);
        LocalTime horaConsulta = parsearHora(horaTexto);

        int limiteResultados = maxResultados == null || maxResultados <= 0 ? 8 : Math.min(maxResultados, 20);

        List<ParadaCandidata> paradasOrigen = buscarParadasCercanas(
                origenLat,
                origenLon,
                radioOrigenMetros,
                MAX_PARADAS_ORIGEN
        );

        List<ParadaCandidata> paradasDestino = buscarParadasCercanas(
                destinoLat,
                destinoLon,
                radioDestinoMetros,
                MAX_PARADAS_DESTINO
        );

        if (paradasOrigen.isEmpty()) {
            return respuestaVacia(
                    origenLat,
                    origenLon,
                    destinoLat,
                    destinoLon,
                    fechaConsulta,
                    horaConsulta,
                    "No hay paradas cercanas al origen"
            );
        }

        if (paradasDestino.isEmpty()) {
            return respuestaVacia(
                    origenLat,
                    origenLon,
                    destinoLat,
                    destinoLon,
                    fechaConsulta,
                    horaConsulta,
                    "No hay paradas cercanas al destino"
            );
        }

        Map<String, ParadaCandidata> paradasDestinoPorStopId = new HashMap<>();

        for (ParadaCandidata paradaDestino : paradasDestino) {
            if (paradaDestino.parada().getStopId() != null) {
                paradasDestinoPorStopId.put(paradaDestino.parada().getStopId(), paradaDestino);
            }
        }

        List<RutaDirectaOpcionDTO> opcionesSinAgrupar = new ArrayList<>();
        Set<String> clavesUsadas = new HashSet<>();

        for (ParadaCandidata paradaOrigen : paradasOrigen) {
            buscarOpcionesDesdeParadaOrigen(
                    paradaOrigen,
                    paradasDestinoPorStopId,
                    fechaConsulta,
                    horaConsulta,
                    opcionesSinAgrupar,
                    clavesUsadas
            );
        }

        List<RutaDirectaOpcionDTO> opcionesAgrupadas = agruparOpcionesDirectas(opcionesSinAgrupar);

        List<RutaDirectaOpcionDTO> opcionesOrdenadas = opcionesAgrupadas.stream()
                .sorted(Comparator
                        .comparing(RutaDirectaOpcionDTO::puntuacion, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaDirectaOpcionDTO::minutosTotal, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaDirectaOpcionDTO::minutosAndandoOrigen, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaDirectaOpcionDTO::minutosEspera, Comparator.nullsLast(Integer::compareTo))
                )
                .limit(limiteResultados)
                .toList();

        List<RutaDirectaOpcionDTO> opcionesFinales = marcarRecomendadaYOpciones(opcionesOrdenadas);

        String mensaje = opcionesFinales.isEmpty()
                ? "No se encontraron rutas directas con las paradas cercanas"
                : "Rutas directas calculadas correctamente";

        return new RutaDirectaResultadoDTO(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fechaConsulta.toString(),
                horaConsulta.toString(),
                opcionesFinales.size(),
                mensaje,
                opcionesFinales
        );
    }

    private void buscarOpcionesDesdeParadaOrigen(
            ParadaCandidata paradaOrigen,
            Map<String, ParadaCandidata> paradasDestinoPorStopId,
            LocalDate fechaConsulta,
            LocalTime horaConsulta,
            List<RutaDirectaOpcionDTO> opciones,
            Set<String> clavesUsadas
    ) {
        if (paradaOrigen.parada().getStopId() == null || paradaOrigen.parada().getStopId().isBlank()) {
            return;
        }

        LocalTime horaMinimaSalida = horaConsulta
                .plusMinutes(paradaOrigen.minutosAndando())
                .plusMinutes(MARGEN_SEGURIDAD_MINUTOS);

        ProximosBusesParadaGtfsDTO proximosBuses = gtfsConsultaServicio.buscarProximosBusesPorParada(
                paradaOrigen.parada().getId(),
                fechaConsulta,
                horaMinimaSalida
        );

        if (proximosBuses.proximosBuses() == null || proximosBuses.proximosBuses().isEmpty()) {
            return;
        }

        int totalRevisados = 0;

        for (ProximoBusGtfsDTO bus : proximosBuses.proximosBuses()) {
            if (totalRevisados >= MAX_BUSES_POR_PARADA) {
                break;
            }

            totalRevisados++;

            if (bus.tripId() == null || bus.tripId().isBlank()) {
                continue;
            }

            Optional<GtfsTrip> viajeOptional = gtfsTripRepositorio.findById(bus.tripId());

            if (viajeOptional.isEmpty()) {
                continue;
            }

            GtfsTrip viaje = viajeOptional.get();

            List<GtfsStopTime> horariosViaje = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(
                    bus.tripId()
            );

            if (horariosViaje.isEmpty()) {
                continue;
            }

            GtfsStopTime pasoOrigen = buscarPasoOrigenValido(
                    horariosViaje,
                    paradaOrigen.parada().getStopId(),
                    horaConsulta,
                    paradaOrigen.minutosAndando()
            );

            if (pasoOrigen == null) {
                continue;
            }

            OpcionDestinoCalculada mejorDestino = buscarMejorDestinoPosterior(
                    horariosViaje,
                    pasoOrigen,
                    paradasDestinoPorStopId
            );

            if (mejorDestino == null) {
                continue;
            }

            RutaDirectaOpcionDTO opcion = construirOpcion(
                    paradaOrigen,
                    mejorDestino,
                    pasoOrigen,
                    viaje,
                    bus,
                    horaConsulta
            );

            if (opcion == null) {
                continue;
            }

            String clave = opcion.tripId()
                    + "|"
                    + opcion.paradaOrigen().id()
                    + "|"
                    + opcion.paradaDestino().id()
                    + "|"
                    + opcion.horaSalidaBus()
                    + "|"
                    + opcion.horaLlegadaBus();

            if (clavesUsadas.add(clave)) {
                opciones.add(opcion);
            }
        }
    }

    private GtfsStopTime buscarPasoOrigenValido(
            List<GtfsStopTime> horariosViaje,
            String stopIdOrigen,
            LocalTime horaConsulta,
            Integer minutosAndandoOrigen
    ) {
        int minutoMinimoSalida = horaConsulta.toSecondOfDay() / 60
                + minutosAndandoOrigen
                + MARGEN_SEGURIDAD_MINUTOS;

        GtfsStopTime mejor = null;
        int mejorMinuto = Integer.MAX_VALUE;

        for (GtfsStopTime horario : horariosViaje) {
            if (!Objects.equals(horario.getStopId(), stopIdOrigen)) {
                continue;
            }

            int minutoSalida = convertirHoraGtfsAMinutos(horario.getDepartureTime());

            if (minutoSalida < 0) {
                continue;
            }

            minutoSalida = ajustarMinutosPosteriores(minutoSalida, minutoMinimoSalida);

            if (minutoSalida >= minutoMinimoSalida && minutoSalida < mejorMinuto) {
                mejor = horario;
                mejorMinuto = minutoSalida;
            }
        }

        return mejor;
    }

    private OpcionDestinoCalculada buscarMejorDestinoPosterior(
            List<GtfsStopTime> horariosViaje,
            GtfsStopTime pasoOrigen,
            Map<String, ParadaCandidata> paradasDestinoPorStopId
    ) {
        int ordenOrigen = pasoOrigen.getStopSequence() == null ? -1 : pasoOrigen.getStopSequence();
        int minutoSalidaOrigen = convertirHoraGtfsAMinutos(pasoOrigen.getDepartureTime());

        if (ordenOrigen < 0 || minutoSalidaOrigen < 0) {
            return null;
        }

        OpcionDestinoCalculada mejorDestino = null;
        int mejorCoste = Integer.MAX_VALUE;

        for (GtfsStopTime posibleDestino : horariosViaje) {
            if (posibleDestino.getStopSequence() == null || posibleDestino.getStopSequence() <= ordenOrigen) {
                continue;
            }

            ParadaCandidata paradaDestino = paradasDestinoPorStopId.get(posibleDestino.getStopId());

            if (paradaDestino == null) {
                continue;
            }

            int minutoLlegadaDestino = convertirHoraGtfsAMinutos(posibleDestino.getArrivalTime());

            if (minutoLlegadaDestino < 0) {
                continue;
            }

            minutoLlegadaDestino = ajustarMinutosPosteriores(minutoLlegadaDestino, minutoSalidaOrigen);

            int minutosBus = minutoLlegadaDestino - minutoSalidaOrigen;

            if (minutosBus < 0) {
                continue;
            }

            int coste = minutosBus + paradaDestino.minutosAndando();

            if (coste < mejorCoste) {
                mejorCoste = coste;
                mejorDestino = new OpcionDestinoCalculada(
                        paradaDestino,
                        posibleDestino,
                        minutoLlegadaDestino
                );
            }
        }

        return mejorDestino;
    }

    private RutaDirectaOpcionDTO construirOpcion(
            ParadaCandidata paradaOrigen,
            OpcionDestinoCalculada destinoCalculado,
            GtfsStopTime pasoOrigen,
            GtfsTrip viaje,
            ProximoBusGtfsDTO bus,
            LocalTime horaConsulta
    ) {
        int minutoConsulta = horaConsulta.toSecondOfDay() / 60;

        int minutoSalida = convertirHoraGtfsAMinutos(pasoOrigen.getDepartureTime());

        if (minutoSalida < 0) {
            return null;
        }

        minutoSalida = ajustarMinutosPosteriores(
                minutoSalida,
                minutoConsulta + paradaOrigen.minutosAndando()
        );

        int minutoLlegada = destinoCalculado.minutoLlegadaAjustado();

        int minutosEspera = minutoSalida - minutoConsulta - paradaOrigen.minutosAndando();
        int minutosBus = minutoLlegada - minutoSalida;

        if (minutosEspera < MARGEN_SEGURIDAD_MINUTOS || minutosBus < 0) {
            return null;
        }

        int minutosTotal = paradaOrigen.minutosAndando()
                + minutosEspera
                + minutosBus
                + destinoCalculado.paradaDestino().minutosAndando();

        int distanciaAndandoTotal = paradaOrigen.distanciaMetros()
                + destinoCalculado.paradaDestino().distanciaMetros();

        String linea = bus.linea();
        String destinoBus = bus.destino();
        String routeId = bus.routeId();

        Optional<GtfsRoute> rutaOptional = gtfsRouteRepositorio.findById(viaje.getRouteId());

        if (rutaOptional.isPresent()) {
            GtfsRoute ruta = rutaOptional.get();

            if (linea == null || linea.isBlank()) {
                linea = ruta.getRouteShortName();
            }

            if (destinoBus == null || destinoBus.isBlank()) {
                destinoBus = viaje.getTripHeadsign();
            }

            routeId = ruta.getRouteId();
        }

        String horaInicioRuta = formatearLocalTime(horaConsulta);
        String horaLlegadaParada = sumarMinutosAHoraLocal(horaConsulta, paradaOrigen.minutosAndando());
        String horaSalidaBus = pasoOrigen.getDepartureTime();
        String horaLlegadaBus = destinoCalculado.pasoDestino().getArrivalTime();
        String horaLlegadaFinal = sumarMinutosAHoraGtfs(
                horaLlegadaBus,
                destinoCalculado.paradaDestino().minutosAndando()
        );

        int puntuacion = calcularPuntuacionDirecta(
                minutosTotal,
                minutosEspera,
                distanciaAndandoTotal
        );

        return new RutaDirectaOpcionDTO(
                "DIRECTA",
                "Ruta directa",
                false,

                normalizarCodigoLinea(linea),
                destinoBus,
                routeId,
                viaje.getTripId(),

                convertirParadaRuta(paradaOrigen),
                convertirParadaRuta(destinoCalculado.paradaDestino()),

                horaInicioRuta,
                horaLlegadaParada,
                horaSalidaBus,
                horaLlegadaBus,
                horaLlegadaFinal,

                paradaOrigen.minutosAndando(),
                minutosEspera,
                minutosBus,
                destinoCalculado.paradaDestino().minutosAndando(),
                minutosTotal,

                distanciaAndandoTotal,
                minutosEspera,

                0,
                puntuacion,

                "GTFS_PROGRAMADO",

                List.of()
        );
    }

    private List<RutaDirectaOpcionDTO> agruparOpcionesDirectas(List<RutaDirectaOpcionDTO> opciones) {
        Map<String, List<RutaDirectaOpcionDTO>> opcionesPorGrupo = new LinkedHashMap<>();

        for (RutaDirectaOpcionDTO opcion : opciones) {
            String clave = crearClaveGrupoDirecto(opcion);

            opcionesPorGrupo
                    .computeIfAbsent(clave, valor -> new ArrayList<>())
                    .add(opcion);
        }

        List<RutaDirectaOpcionDTO> resultado = new ArrayList<>();

        for (List<RutaDirectaOpcionDTO> grupo : opcionesPorGrupo.values()) {
            RutaDirectaOpcionDTO mejor = grupo.stream()
                    .min(Comparator
                            .comparing(RutaDirectaOpcionDTO::puntuacion, Comparator.nullsLast(Integer::compareTo))
                            .thenComparing(RutaDirectaOpcionDTO::minutosTotal, Comparator.nullsLast(Integer::compareTo))
                            .thenComparing(RutaDirectaOpcionDTO::minutosEspera, Comparator.nullsLast(Integer::compareTo))
                            .thenComparing(RutaDirectaOpcionDTO::minutosAndandoOrigen, Comparator.nullsLast(Integer::compareTo))
                    )
                    .orElse(null);

            if (mejor == null) {
                continue;
            }

            List<SiguienteSalidaRutaDTO> siguientesSalidas = obtenerSiguientesSalidasDelMismoRecorrido(
                    mejor,
                    grupo
            );

            resultado.add(copiarOpcion(
                    mejor,
                    mejor.resumen(),
                    mejor.recomendada(),
                    siguientesSalidas
            ));
        }

        return resultado;
    }

    private String crearClaveGrupoDirecto(RutaDirectaOpcionDTO opcion) {
        String linea = opcion.linea() == null ? "" : opcion.linea();
        String destino = opcion.destinoBus() == null ? "" : opcion.destinoBus();

        return linea.trim().toUpperCase()
                + "|"
                + destino.trim().toUpperCase();
    }

    private List<SiguienteSalidaRutaDTO> obtenerSiguientesSalidasDelMismoRecorrido(
            RutaDirectaOpcionDTO mejor,
            List<RutaDirectaOpcionDTO> grupo
    ) {
        Map<String, SiguienteSalidaRutaDTO> salidasUnicas = new LinkedHashMap<>();

        for (RutaDirectaOpcionDTO opcion : grupo) {
            if (!Objects.equals(opcion.paradaOrigen().id(), mejor.paradaOrigen().id())) {
                continue;
            }

            if (!Objects.equals(opcion.paradaDestino().id(), mejor.paradaDestino().id())) {
                continue;
            }

            SiguienteSalidaRutaDTO salida = new SiguienteSalidaRutaDTO(
                    opcion.tripId(),
                    opcion.horaSalidaBus(),
                    opcion.horaLlegadaBus(),
                    opcion.horaLlegadaFinal(),
                    opcion.minutosEspera(),
                    opcion.minutosBus(),
                    opcion.minutosTotal()
            );

            String clave = salida.tripId()
                    + "|"
                    + salida.horaSalidaBus()
                    + "|"
                    + salida.horaLlegadaBus();

            salidasUnicas.putIfAbsent(clave, salida);
        }

        return salidasUnicas.values()
                .stream()
                .sorted(Comparator.comparingInt(salida -> convertirHoraGtfsASegundosSeguro(salida.horaSalidaBus())))
                .limit(MAX_SIGUIENTES_SALIDAS)
                .toList();
    }

    private List<RutaDirectaOpcionDTO> marcarRecomendadaYOpciones(List<RutaDirectaOpcionDTO> opciones) {
        List<RutaDirectaOpcionDTO> resultado = new ArrayList<>();

        for (int i = 0; i < opciones.size(); i++) {
            RutaDirectaOpcionDTO opcion = opciones.get(i);

            boolean recomendada = i == 0;

            String resumen = recomendada
                    ? "Mejor opción directa"
                    : construirResumenAlternativa(opcion);

            resultado.add(copiarOpcion(
                    opcion,
                    resumen,
                    recomendada,
                    opcion.siguientesSalidas()
            ));
        }

        return resultado;
    }

    private String construirResumenAlternativa(RutaDirectaOpcionDTO opcion) {
        if (opcion.minutosEspera() != null && opcion.minutosEspera() >= 30) {
            return "Alternativa directa con más espera";
        }

        if (opcion.minutosTotal() != null && opcion.minutosTotal() <= 35) {
            return "Alternativa directa rápida";
        }

        return "Alternativa directa";
    }

    private RutaDirectaOpcionDTO copiarOpcion(
            RutaDirectaOpcionDTO opcion,
            String resumen,
            Boolean recomendada,
            List<SiguienteSalidaRutaDTO> siguientesSalidas
    ) {
        return new RutaDirectaOpcionDTO(
                opcion.tipo(),
                resumen,
                recomendada,

                opcion.linea(),
                opcion.destinoBus(),
                opcion.routeId(),
                opcion.tripId(),

                opcion.paradaOrigen(),
                opcion.paradaDestino(),

                opcion.horaInicioRuta(),
                opcion.horaLlegadaParada(),
                opcion.horaSalidaBus(),
                opcion.horaLlegadaBus(),
                opcion.horaLlegadaFinal(),

                opcion.minutosAndandoOrigen(),
                opcion.minutosEspera(),
                opcion.minutosBus(),
                opcion.minutosAndandoDestino(),
                opcion.minutosTotal(),

                opcion.distanciaAndandoTotalMetros(),
                opcion.margenLlegadaParadaMinutos(),

                opcion.transbordos(),
                opcion.puntuacion(),

                opcion.fuente(),

                siguientesSalidas == null ? List.of() : siguientesSalidas
        );
    }

    private int calcularPuntuacionDirecta(
            Integer minutosTotal,
            Integer minutosEspera,
            Integer distanciaAndandoTotalMetros
    ) {
        int puntuacion = minutosTotal == null ? 9999 : minutosTotal;

        if (minutosEspera != null && minutosEspera > 30) {
            puntuacion += 6;
        }

        if (minutosEspera != null && minutosEspera > 60) {
            puntuacion += 10;
        }

        if (distanciaAndandoTotalMetros != null && distanciaAndandoTotalMetros > 600) {
            puntuacion += 5;
        }

        return puntuacion;
    }

    private List<ParadaCandidata> buscarParadasCercanas(
            Double lat,
            Double lon,
            Integer radioMetros,
            Integer limite
    ) {
        return paradaRepositorio.findAll()
                .stream()
                .filter(parada -> parada.getLat() != null && parada.getLon() != null)
                .map(parada -> {
                    int distancia = calcularDistanciaMetros(lat, lon, parada.getLat(), parada.getLon());
                    int minutosAndando = calcularMinutosAndando(distancia);

                    return new ParadaCandidata(
                            parada,
                            distancia,
                            minutosAndando
                    );
                })
                .filter(candidata -> candidata.distanciaMetros() <= radioMetros)
                .sorted(Comparator.comparing(ParadaCandidata::distanciaMetros))
                .limit(limite)
                .toList();
    }

    private ParadaRutaDTO convertirParadaRuta(ParadaCandidata candidata) {
        Parada parada = candidata.parada();

        return new ParadaRutaDTO(
                parada.getId(),
                parada.getStopId(),
                parada.getNombre(),
                parada.getLat(),
                parada.getLon(),
                candidata.distanciaMetros(),
                candidata.minutosAndando()
        );
    }

    private int calcularMinutosAndando(int distanciaMetros) {
        return Math.max(1, (int) Math.ceil(distanciaMetros / VELOCIDAD_ANDANDO_METROS_POR_MINUTO));
    }

    private int calcularDistanciaMetros(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {
        final double radioTierraMetros = 6371000.0;

        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);

        double diferenciaLat = Math.toRadians(lat2 - lat1);
        double diferenciaLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(diferenciaLat / 2) * Math.sin(diferenciaLat / 2)
                + Math.cos(lat1Rad) * Math.cos(lat2Rad)
                * Math.sin(diferenciaLon / 2) * Math.sin(diferenciaLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return (int) Math.round(radioTierraMetros * c);
    }

    private int convertirHoraGtfsAMinutos(String horaGtfs) {
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

            return horas * 60 + minutos;
        } catch (Exception e) {
            return -1;
        }
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

    private int ajustarMinutosPosteriores(int minutoEvento, int minutoReferencia) {
        int resultado = minutoEvento;

        while (resultado < minutoReferencia) {
            resultado += 24 * 60;
        }

        return resultado;
    }

    private String sumarMinutosAHoraGtfs(String horaGtfs, int minutosASumar) {
        int segundos = convertirHoraGtfsASegundos(horaGtfs);

        if (segundos < 0) {
            return horaGtfs;
        }

        return convertirSegundosAHora(segundos + minutosASumar * 60);
    }

    private String sumarMinutosAHoraLocal(LocalTime hora, int minutosASumar) {
        return formatearLocalTime(hora.plusMinutes(minutosASumar));
    }

    private String formatearLocalTime(LocalTime hora) {
        return String.format(
                "%02d:%02d:%02d",
                hora.getHour(),
                hora.getMinute(),
                hora.getSecond()
        );
    }

    private String convertirSegundosAHora(int totalSegundos) {
        int horas = totalSegundos / 3600;
        int resto = totalSegundos % 3600;
        int minutos = resto / 60;
        int segundos = resto % 60;

        return String.format("%02d:%02d:%02d", horas, minutos, segundos);
    }

    private void validarCoordenadas(
            Double origenLat,
            Double origenLon,
            Double destinoLat,
            Double destinoLon
    ) {
        if (origenLat == null || origenLon == null || destinoLat == null || destinoLon == null) {
            throw new RuntimeException("Las coordenadas de origen y destino son obligatorias");
        }
    }

    private LocalDate parsearFecha(String fechaTexto) {
        if (fechaTexto == null || fechaTexto.isBlank()) {
            return LocalDate.now(ZoneId.of("Europe/Madrid"));
        }

        return LocalDate.parse(fechaTexto);
    }

    private LocalTime parsearHora(String horaTexto) {
        if (horaTexto == null || horaTexto.isBlank()) {
            return LocalTime.now(ZoneId.of("Europe/Madrid")).withNano(0);
        }

        String valor = horaTexto.trim();

        if (valor.matches("^\\d{1,2}:\\d{2}$")) {
            valor = valor + ":00";
        }

        return LocalTime.parse(valor);
    }

    private String normalizarCodigoLinea(String codigo) {
        if (codigo == null) {
            return "";
        }

        String valor = codigo.trim().replaceAll("\\s+", " ").toUpperCase();

        valor = valor.replaceAll("[.\\-]+$", "");
        valor = valor.replaceAll("^PSA\\s*(\\d+)$", "PSA $1");

        if (valor.matches("^C3D$")) {
            return "C3d";
        }

        if (valor.matches("^C3I$")) {
            return "C3i";
        }

        return valor;
    }

    private RutaDirectaResultadoDTO respuestaVacia(
            Double origenLat,
            Double origenLon,
            Double destinoLat,
            Double destinoLon,
            LocalDate fechaConsulta,
            LocalTime horaConsulta,
            String mensaje
    ) {
        return new RutaDirectaResultadoDTO(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fechaConsulta.toString(),
                horaConsulta.toString(),
                0,
                mensaje,
                List.of()
        );
    }

    private record ParadaCandidata(
            Parada parada,
            Integer distanciaMetros,
            Integer minutosAndando
    ) {
    }

    private record OpcionDestinoCalculada(
            ParadaCandidata paradaDestino,
            GtfsStopTime pasoDestino,
            Integer minutoLlegadaAjustado
    ) {
    }
}