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
public class RutaTransbordoServicio {

    private static final double VELOCIDAD_ANDANDO_METROS_POR_MINUTO = 80.0;

    private static final int MAX_PARADAS_ORIGEN = 6;
    private static final int MAX_PARADAS_DESTINO = 6;
    private static final int MAX_PRIMEROS_BUSES_POR_PARADA = 8;
    private static final int MAX_SEGUNDOS_BUSES_POR_TRANSBORDO = 8;
    private static final int MAX_PARADAS_POSIBLES_TRANSBORDO = 25;
    private static final int MAX_OPCIONES_CALCULADAS = 150;

    private static final int MARGEN_SEGURIDAD_MINUTOS = 1;
    private static final int MINUTOS_MINIMOS_TRANSBORDO = 2;

    private static final int MINUTOS_MINIMOS_PRIMER_TRAMO_BUS = 4;
    private static final int MINUTOS_MINIMOS_SEGUNDO_TRAMO_BUS = 4;

    private static final int AHORRO_MINIMO_TRANSBORDO_FRENTE_DIRECTO = 8;

    private static final int PENALIZACION_TRANSBORDO = 8;

    private final ParadaRepositorio paradaRepositorio;
    private final GtfsConsultaServicio gtfsConsultaServicio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;

    @Value("${paradabus.rutas.radio-origen-metros:700}")
    private Integer radioOrigenMetros;

    @Value("${paradabus.rutas.radio-destino-metros:700}")
    private Integer radioDestinoMetros;

    public RutaTransbordoResultadoDTO buscarRutasConTransbordo(
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

        List<RutaTransbordoOpcionDTO> opciones = new ArrayList<>();
        Set<String> clavesUsadas = new HashSet<>();

        for (ParadaCandidata paradaOrigen : paradasOrigen) {
            buscarTransbordosDesdeParadaOrigen(
                    paradaOrigen,
                    paradasDestinoPorStopId,
                    fechaConsulta,
                    horaConsulta,
                    opciones,
                    clavesUsadas
            );

            if (opciones.size() >= MAX_OPCIONES_CALCULADAS) {
                break;
            }
        }

        List<RutaTransbordoOpcionDTO> opcionesAgrupadas = agruparOpcionesParecidas(opciones);

        List<RutaTransbordoOpcionDTO> opcionesOrdenadas = opcionesAgrupadas.stream()
                .sorted(Comparator
                        .comparing(RutaTransbordoOpcionDTO::puntuacion, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaTransbordoOpcionDTO::minutosTotal, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaTransbordoOpcionDTO::minutosEsperaOrigen, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RutaTransbordoOpcionDTO::minutosEsperaTransbordo, Comparator.nullsLast(Integer::compareTo))
                )
                .limit(limiteResultados)
                .toList();

        List<RutaTransbordoOpcionDTO> opcionesFinales = marcarRecomendada(opcionesOrdenadas);

        String mensaje = opcionesFinales.isEmpty()
                ? "No se encontraron rutas con 1 transbordo útiles"
                : "Rutas con 1 transbordo calculadas correctamente";

        return new RutaTransbordoResultadoDTO(
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

    private void buscarTransbordosDesdeParadaOrigen(
            ParadaCandidata paradaOrigen,
            Map<String, ParadaCandidata> paradasDestinoPorStopId,
            LocalDate fechaConsulta,
            LocalTime horaConsulta,
            List<RutaTransbordoOpcionDTO> opciones,
            Set<String> clavesUsadas
    ) {
        if (paradaOrigen.parada().getStopId() == null || paradaOrigen.parada().getStopId().isBlank()) {
            return;
        }

        LocalTime horaMinimaPrimerBus = horaConsulta
                .plusMinutes(paradaOrigen.minutosAndando())
                .plusMinutes(MARGEN_SEGURIDAD_MINUTOS);

        ProximosBusesParadaGtfsDTO primerosBuses = gtfsConsultaServicio.buscarProximosBusesPorParada(
                paradaOrigen.parada().getId(),
                fechaConsulta,
                horaMinimaPrimerBus
        );

        if (primerosBuses.proximosBuses() == null || primerosBuses.proximosBuses().isEmpty()) {
            return;
        }

        int primerosRevisados = 0;

        for (ProximoBusGtfsDTO primerBus : primerosBuses.proximosBuses()) {
            if (primerosRevisados >= MAX_PRIMEROS_BUSES_POR_PARADA) {
                break;
            }

            primerosRevisados++;

            if (primerBus.tripId() == null || primerBus.tripId().isBlank()) {
                continue;
            }

            Optional<GtfsTrip> primerViajeOptional = gtfsTripRepositorio.findById(primerBus.tripId());

            if (primerViajeOptional.isEmpty()) {
                continue;
            }

            GtfsTrip primerViaje = primerViajeOptional.get();

            List<GtfsStopTime> horariosPrimerViaje = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(
                    primerBus.tripId()
            );

            if (horariosPrimerViaje.isEmpty()) {
                continue;
            }

            GtfsStopTime pasoOrigen = buscarPasoValidoDesdeHoraConsulta(
                    horariosPrimerViaje,
                    paradaOrigen.parada().getStopId(),
                    horaConsulta,
                    paradaOrigen.minutosAndando()
            );

            if (pasoOrigen == null) {
                continue;
            }

            buscarSegundosBusesDesdePosiblesTransbordos(
                    paradaOrigen,
                    primerBus,
                    primerViaje,
                    horariosPrimerViaje,
                    pasoOrigen,
                    paradasDestinoPorStopId,
                    fechaConsulta,
                    horaConsulta,
                    opciones,
                    clavesUsadas
            );

            if (opciones.size() >= MAX_OPCIONES_CALCULADAS) {
                return;
            }
        }
    }

    private void buscarSegundosBusesDesdePosiblesTransbordos(
            ParadaCandidata paradaOrigen,
            ProximoBusGtfsDTO primerBus,
            GtfsTrip primerViaje,
            List<GtfsStopTime> horariosPrimerViaje,
            GtfsStopTime pasoOrigen,
            Map<String, ParadaCandidata> paradasDestinoPorStopId,
            LocalDate fechaConsulta,
            LocalTime horaConsulta,
            List<RutaTransbordoOpcionDTO> opciones,
            Set<String> clavesUsadas
    ) {
        int ordenOrigen = pasoOrigen.getStopSequence() == null ? -1 : pasoOrigen.getStopSequence();
        int minutoSalidaPrimerBus = convertirHoraGtfsAMinutos(pasoOrigen.getDepartureTime());

        if (ordenOrigen < 0 || minutoSalidaPrimerBus < 0) {
            return;
        }

        OpcionDestinoCalculada destinoDirectoConPrimerBus = buscarMejorDestinoPosterior(
                horariosPrimerViaje,
                pasoOrigen,
                paradasDestinoPorStopId
        );

        int transbordosRevisados = 0;

        for (GtfsStopTime posibleTransbordo : horariosPrimerViaje) {
            if (posibleTransbordo.getStopSequence() == null || posibleTransbordo.getStopSequence() <= ordenOrigen) {
                continue;
            }

            if (transbordosRevisados >= MAX_PARADAS_POSIBLES_TRANSBORDO) {
                break;
            }

            transbordosRevisados++;

            if (posibleTransbordo.getStopId() == null || posibleTransbordo.getStopId().isBlank()) {
                continue;
            }

            int minutoLlegadaTransbordo = convertirHoraGtfsAMinutos(posibleTransbordo.getArrivalTime());

            if (minutoLlegadaTransbordo < 0) {
                continue;
            }

            minutoLlegadaTransbordo = ajustarMinutosPosteriores(
                    minutoLlegadaTransbordo,
                    minutoSalidaPrimerBus
            );

            Parada paradaTransbordo = buscarParadaPorStopId(posibleTransbordo.getStopId());

            if (paradaTransbordo == null) {
                continue;
            }

            ParadaCandidata paradaTransbordoCandidata = new ParadaCandidata(
                    paradaTransbordo,
                    0,
                    0
            );

            int minutoMinimoSegundoBus = minutoLlegadaTransbordo + MINUTOS_MINIMOS_TRANSBORDO;

            LocalTime horaSegundoBus = convertirMinutosGtfsALocalTime(minutoMinimoSegundoBus);

            ProximosBusesParadaGtfsDTO segundosBuses = gtfsConsultaServicio.buscarProximosBusesPorParada(
                    paradaTransbordo.getId(),
                    fechaConsulta,
                    horaSegundoBus
            );

            if (segundosBuses.proximosBuses() == null || segundosBuses.proximosBuses().isEmpty()) {
                continue;
            }

            int segundosRevisados = 0;

            for (ProximoBusGtfsDTO segundoBus : segundosBuses.proximosBuses()) {
                if (segundosRevisados >= MAX_SEGUNDOS_BUSES_POR_TRANSBORDO) {
                    break;
                }

                segundosRevisados++;

                if (segundoBus.tripId() == null || segundoBus.tripId().isBlank()) {
                    continue;
                }

                if (segundoBus.tripId().equals(primerBus.tripId())) {
                    continue;
                }

                if (mismoCodigoLinea(primerBus.linea(), segundoBus.linea())) {
                    continue;
                }

                // Evita rutas raras tipo:
                // coger C3d para ir a Pizarro y allí coger el 23,
                // cuando el 23 ya pasa directo desde la parada origen.
                if (existeRutaDirectaConMismaLineaDesdeOrigen(
                        paradaOrigen,
                        segundoBus,
                        paradasDestinoPorStopId,
                        fechaConsulta,
                        horaConsulta
                )) {
                    continue;
                }

                Optional<GtfsTrip> segundoViajeOptional = gtfsTripRepositorio.findById(segundoBus.tripId());

                if (segundoViajeOptional.isEmpty()) {
                    continue;
                }

                GtfsTrip segundoViaje = segundoViajeOptional.get();

                List<GtfsStopTime> horariosSegundoViaje = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(
                        segundoBus.tripId()
                );

                if (horariosSegundoViaje.isEmpty()) {
                    continue;
                }

                GtfsStopTime pasoSegundoBusEnTransbordo = buscarPasoValidoDesdeMinuto(
                        horariosSegundoViaje,
                        paradaTransbordo.getStopId(),
                        minutoMinimoSegundoBus
                );

                if (pasoSegundoBusEnTransbordo == null) {
                    continue;
                }

                OpcionDestinoCalculada destinoCalculado = buscarMejorDestinoPosterior(
                        horariosSegundoViaje,
                        pasoSegundoBusEnTransbordo,
                        paradasDestinoPorStopId
                );

                if (destinoCalculado == null) {
                    continue;
                }

                RutaTransbordoOpcionDTO opcion = construirOpcionTransbordo(
                        paradaOrigen,
                        paradaTransbordoCandidata,
                        destinoCalculado,
                        primerBus,
                        segundoBus,
                        primerViaje,
                        segundoViaje,
                        pasoOrigen,
                        posibleTransbordo,
                        pasoSegundoBusEnTransbordo,
                        horaConsulta,
                        minutoLlegadaTransbordo
                );

                if (opcion == null) {
                    continue;
                }

                if (!transbordoMereceLaPenaFrenteAlPrimerBusDirecto(opcion, destinoDirectoConPrimerBus)) {
                    continue;
                }

                String clave = crearClaveOpcion(opcion);

                if (clavesUsadas.add(clave)) {
                    opciones.add(opcion);
                }

                if (opciones.size() >= MAX_OPCIONES_CALCULADAS) {
                    return;
                }
            }
        }
    }

    private boolean existeRutaDirectaConMismaLineaDesdeOrigen(
            ParadaCandidata paradaOrigen,
            ProximoBusGtfsDTO segundoBus,
            Map<String, ParadaCandidata> paradasDestinoPorStopId,
            LocalDate fechaConsulta,
            LocalTime horaConsulta
    ) {
        if (segundoBus.linea() == null || segundoBus.linea().isBlank()) {
            return false;
        }

        LocalTime horaMinimaBusDirecto = horaConsulta
                .plusMinutes(paradaOrigen.minutosAndando())
                .plusMinutes(MARGEN_SEGURIDAD_MINUTOS);

        ProximosBusesParadaGtfsDTO busesDesdeOrigen = gtfsConsultaServicio.buscarProximosBusesPorParada(
                paradaOrigen.parada().getId(),
                fechaConsulta,
                horaMinimaBusDirecto
        );

        if (busesDesdeOrigen.proximosBuses() == null || busesDesdeOrigen.proximosBuses().isEmpty()) {
            return false;
        }

        int revisados = 0;

        for (ProximoBusGtfsDTO busDirecto : busesDesdeOrigen.proximosBuses()) {
            if (revisados >= 20) {
                break;
            }

            revisados++;

            if (!mismoCodigoLinea(busDirecto.linea(), segundoBus.linea())) {
                continue;
            }

            if (busDirecto.tripId() == null || busDirecto.tripId().isBlank()) {
                continue;
            }

            List<GtfsStopTime> horariosViajeDirecto = gtfsStopTimeRepositorio.findByTripIdOrderByStopSequenceAsc(
                    busDirecto.tripId()
            );

            if (horariosViajeDirecto.isEmpty()) {
                continue;
            }

            GtfsStopTime pasoOrigenDirecto = buscarPasoValidoDesdeHoraConsulta(
                    horariosViajeDirecto,
                    paradaOrigen.parada().getStopId(),
                    horaConsulta,
                    paradaOrigen.minutosAndando()
            );

            if (pasoOrigenDirecto == null) {
                continue;
            }

            OpcionDestinoCalculada destinoDirecto = buscarMejorDestinoPosterior(
                    horariosViajeDirecto,
                    pasoOrigenDirecto,
                    paradasDestinoPorStopId
            );

            if (destinoDirecto != null) {
                return true;
            }
        }

        return false;
    }

    private RutaTransbordoOpcionDTO construirOpcionTransbordo(
            ParadaCandidata paradaOrigen,
            ParadaCandidata paradaTransbordo,
            OpcionDestinoCalculada destinoCalculado,
            ProximoBusGtfsDTO primerBus,
            ProximoBusGtfsDTO segundoBus,
            GtfsTrip primerViaje,
            GtfsTrip segundoViaje,
            GtfsStopTime pasoOrigen,
            GtfsStopTime pasoTransbordoBajada,
            GtfsStopTime pasoTransbordoSubida,
            LocalTime horaConsulta,
            Integer minutoLlegadaTransbordoAjustado
    ) {
        int minutoConsulta = horaConsulta.toSecondOfDay() / 60;

        int minutoSalidaPrimerBus = convertirHoraGtfsAMinutos(pasoOrigen.getDepartureTime());
        int minutoSalidaSegundoBus = convertirHoraGtfsAMinutos(pasoTransbordoSubida.getDepartureTime());
        int minutoLlegadaDestino = destinoCalculado.minutoLlegadaAjustado();

        if (minutoSalidaPrimerBus < 0 || minutoSalidaSegundoBus < 0 || minutoLlegadaDestino < 0) {
            return null;
        }

        minutoSalidaPrimerBus = ajustarMinutosPosteriores(
                minutoSalidaPrimerBus,
                minutoConsulta + paradaOrigen.minutosAndando()
        );

        minutoSalidaSegundoBus = ajustarMinutosPosteriores(
                minutoSalidaSegundoBus,
                minutoLlegadaTransbordoAjustado + MINUTOS_MINIMOS_TRANSBORDO
        );

        int minutosEsperaOrigen = minutoSalidaPrimerBus - minutoConsulta - paradaOrigen.minutosAndando();
        int minutosPrimerBus = minutoLlegadaTransbordoAjustado - minutoSalidaPrimerBus;
        int minutosEsperaTransbordo = minutoSalidaSegundoBus - minutoLlegadaTransbordoAjustado;
        int minutosSegundoBus = minutoLlegadaDestino - minutoSalidaSegundoBus;

        if (minutosEsperaOrigen < MARGEN_SEGURIDAD_MINUTOS) {
            return null;
        }

        if (minutosEsperaTransbordo < MINUTOS_MINIMOS_TRANSBORDO) {
            return null;
        }

        if (minutosPrimerBus < MINUTOS_MINIMOS_PRIMER_TRAMO_BUS) {
            return null;
        }

        if (minutosSegundoBus < MINUTOS_MINIMOS_SEGUNDO_TRAMO_BUS) {
            return null;
        }

        int minutosTotal = paradaOrigen.minutosAndando()
                + minutosEsperaOrigen
                + minutosPrimerBus
                + minutosEsperaTransbordo
                + minutosSegundoBus
                + destinoCalculado.paradaDestino().minutosAndando();

        int distanciaAndandoTotal = paradaOrigen.distanciaMetros()
                + destinoCalculado.paradaDestino().distanciaMetros();

        String lineaPrimerBus = obtenerLinea(primerBus, primerViaje);
        String destinoPrimerBus = obtenerDestino(primerBus, primerViaje);
        String routeIdPrimerBus = obtenerRouteId(primerBus, primerViaje);

        String lineaSegundoBus = obtenerLinea(segundoBus, segundoViaje);
        String destinoSegundoBus = obtenerDestino(segundoBus, segundoViaje);
        String routeIdSegundoBus = obtenerRouteId(segundoBus, segundoViaje);

        String horaInicioRuta = formatearLocalTime(horaConsulta);
        String horaLlegadaParadaOrigen = sumarMinutosAHoraLocal(horaConsulta, paradaOrigen.minutosAndando());

        String horaSalidaPrimerBus = pasoOrigen.getDepartureTime();
        String horaLlegadaTransbordo = pasoTransbordoBajada.getArrivalTime();

        String horaSalidaSegundoBus = pasoTransbordoSubida.getDepartureTime();
        String horaLlegadaBusDestino = destinoCalculado.pasoDestino().getArrivalTime();

        String horaLlegadaFinal = sumarMinutosAHoraGtfs(
                horaLlegadaBusDestino,
                destinoCalculado.paradaDestino().minutosAndando()
        );

        int puntuacion = calcularPuntuacionTransbordo(
                minutosTotal,
                minutosEsperaOrigen,
                minutosEsperaTransbordo,
                distanciaAndandoTotal
        );

        ParadaRutaDTO paradaRutaOrigen = convertirParadaRuta(paradaOrigen);
        ParadaRutaDTO paradaRutaTransbordo = convertirParadaRuta(paradaTransbordo);
        ParadaRutaDTO paradaRutaDestino = convertirParadaRuta(destinoCalculado.paradaDestino());

        TramoTransbordoDTO tramo1 = new TramoTransbordoDTO(
                1,
                "BUS",
                normalizarCodigoLinea(lineaPrimerBus),
                destinoPrimerBus,
                routeIdPrimerBus,
                primerViaje.getTripId(),
                paradaRutaOrigen,
                paradaRutaTransbordo,
                horaSalidaPrimerBus,
                horaLlegadaTransbordo,
                minutosPrimerBus
        );

        TramoTransbordoDTO tramo2 = new TramoTransbordoDTO(
                2,
                "BUS",
                normalizarCodigoLinea(lineaSegundoBus),
                destinoSegundoBus,
                routeIdSegundoBus,
                segundoViaje.getTripId(),
                paradaRutaTransbordo,
                paradaRutaDestino,
                horaSalidaSegundoBus,
                horaLlegadaBusDestino,
                minutosSegundoBus
        );

        return new RutaTransbordoOpcionDTO(
                "TRANSBORDO",
                "Ruta con 1 transbordo",
                false,

                paradaRutaOrigen,
                paradaRutaTransbordo,
                paradaRutaDestino,

                horaInicioRuta,
                horaLlegadaParadaOrigen,

                horaSalidaPrimerBus,
                horaLlegadaTransbordo,

                horaSalidaSegundoBus,
                horaLlegadaBusDestino,
                horaLlegadaFinal,

                paradaOrigen.minutosAndando(),
                minutosEsperaOrigen,
                minutosPrimerBus,
                minutosEsperaTransbordo,
                minutosSegundoBus,
                destinoCalculado.paradaDestino().minutosAndando(),
                minutosTotal,

                distanciaAndandoTotal,
                1,
                puntuacion,

                "GTFS_PROGRAMADO",

                List.of(tramo1, tramo2)
        );
    }

    private boolean transbordoMereceLaPenaFrenteAlPrimerBusDirecto(
            RutaTransbordoOpcionDTO opcion,
            OpcionDestinoCalculada destinoDirectoConPrimerBus
    ) {
        if (destinoDirectoConPrimerBus == null) {
            return true;
        }

        int minutoFinalTransbordo = convertirHoraGtfsAMinutos(opcion.horaLlegadaFinal());

        if (minutoFinalTransbordo < 0) {
            return true;
        }

        int minutoFinalDirecto = destinoDirectoConPrimerBus.minutoLlegadaAjustado()
                + destinoDirectoConPrimerBus.paradaDestino().minutosAndando();

        return minutoFinalTransbordo + AHORRO_MINIMO_TRANSBORDO_FRENTE_DIRECTO <= minutoFinalDirecto;
    }

    private List<RutaTransbordoOpcionDTO> agruparOpcionesParecidas(List<RutaTransbordoOpcionDTO> opciones) {
        Map<String, RutaTransbordoOpcionDTO> mejoresPorGrupo = new LinkedHashMap<>();

        for (RutaTransbordoOpcionDTO opcion : opciones) {
            String clave = crearClaveGrupoParecido(opcion);

            RutaTransbordoOpcionDTO actual = mejoresPorGrupo.get(clave);

            if (actual == null || esMejorOpcion(opcion, actual)) {
                mejoresPorGrupo.put(clave, opcion);
            }
        }

        return new ArrayList<>(mejoresPorGrupo.values());
    }

    private String crearClaveGrupoParecido(RutaTransbordoOpcionDTO opcion) {
        if (opcion.tramos() == null || opcion.tramos().size() < 2) {
            return opcion.paradaOrigen().id() + "|" + opcion.paradaDestino().id();
        }

        TramoTransbordoDTO tramo1 = opcion.tramos().get(0);
        TramoTransbordoDTO tramo2 = opcion.tramos().get(1);

        return tramo1.linea()
                + "|"
                + tramo2.linea()
                + "|"
                + opcion.paradaOrigen().id()
                + "|"
                + opcion.paradaDestino().id();
    }

    private boolean esMejorOpcion(
            RutaTransbordoOpcionDTO nueva,
            RutaTransbordoOpcionDTO actual
    ) {
        int puntuacionNueva = nueva.puntuacion() == null ? Integer.MAX_VALUE : nueva.puntuacion();
        int puntuacionActual = actual.puntuacion() == null ? Integer.MAX_VALUE : actual.puntuacion();

        if (puntuacionNueva != puntuacionActual) {
            return puntuacionNueva < puntuacionActual;
        }

        int totalNueva = nueva.minutosTotal() == null ? Integer.MAX_VALUE : nueva.minutosTotal();
        int totalActual = actual.minutosTotal() == null ? Integer.MAX_VALUE : actual.minutosTotal();

        if (totalNueva != totalActual) {
            return totalNueva < totalActual;
        }

        int esperaTransbordoNueva = nueva.minutosEsperaTransbordo() == null ? Integer.MAX_VALUE : nueva.minutosEsperaTransbordo();
        int esperaTransbordoActual = actual.minutosEsperaTransbordo() == null ? Integer.MAX_VALUE : actual.minutosEsperaTransbordo();

        return esperaTransbordoNueva < esperaTransbordoActual;
    }

    private GtfsStopTime buscarPasoValidoDesdeHoraConsulta(
            List<GtfsStopTime> horariosViaje,
            String stopIdOrigen,
            LocalTime horaConsulta,
            Integer minutosAndandoOrigen
    ) {
        int minutoMinimoSalida = horaConsulta.toSecondOfDay() / 60
                + minutosAndandoOrigen
                + MARGEN_SEGURIDAD_MINUTOS;

        return buscarPasoValidoDesdeMinuto(
                horariosViaje,
                stopIdOrigen,
                minutoMinimoSalida
        );
    }

    private GtfsStopTime buscarPasoValidoDesdeMinuto(
            List<GtfsStopTime> horariosViaje,
            String stopId,
            Integer minutoMinimo
    ) {
        GtfsStopTime mejor = null;
        int mejorMinuto = Integer.MAX_VALUE;

        for (GtfsStopTime horario : horariosViaje) {
            if (!Objects.equals(horario.getStopId(), stopId)) {
                continue;
            }

            int minutoSalida = convertirHoraGtfsAMinutos(horario.getDepartureTime());

            if (minutoSalida < 0) {
                continue;
            }

            minutoSalida = ajustarMinutosPosteriores(minutoSalida, minutoMinimo);

            if (minutoSalida >= minutoMinimo && minutoSalida < mejorMinuto) {
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

    private Parada buscarParadaPorStopId(String stopId) {
        if (stopId == null || stopId.isBlank()) {
            return null;
        }

        List<Parada> paradas = paradaRepositorio.findByStopId(stopId);

        if (paradas == null || paradas.isEmpty()) {
            return null;
        }

        return paradas.get(0);
    }

    private List<RutaTransbordoOpcionDTO> marcarRecomendada(List<RutaTransbordoOpcionDTO> opciones) {
        List<RutaTransbordoOpcionDTO> resultado = new ArrayList<>();

        for (int i = 0; i < opciones.size(); i++) {
            RutaTransbordoOpcionDTO opcion = opciones.get(i);

            boolean recomendada = i == 0;

            String resumen = recomendada
                    ? "Mejor opción con transbordo"
                    : construirResumenAlternativa(opcion);

            resultado.add(copiarOpcion(
                    opcion,
                    resumen,
                    recomendada
            ));
        }

        return resultado;
    }

    private String construirResumenAlternativa(RutaTransbordoOpcionDTO opcion) {
        if (opcion.minutosTotal() != null && opcion.minutosTotal() <= 35) {
            return "Alternativa rápida con transbordo";
        }

        if (opcion.minutosEsperaTransbordo() != null && opcion.minutosEsperaTransbordo() >= 20) {
            return "Alternativa con más espera en transbordo";
        }

        return "Alternativa con transbordo";
    }

    private RutaTransbordoOpcionDTO copiarOpcion(
            RutaTransbordoOpcionDTO opcion,
            String resumen,
            Boolean recomendada
    ) {
        return new RutaTransbordoOpcionDTO(
                opcion.tipo(),
                resumen,
                recomendada,

                opcion.paradaOrigen(),
                opcion.paradaTransbordo(),
                opcion.paradaDestino(),

                opcion.horaInicioRuta(),
                opcion.horaLlegadaParadaOrigen(),

                opcion.horaSalidaPrimerBus(),
                opcion.horaLlegadaTransbordo(),

                opcion.horaSalidaSegundoBus(),
                opcion.horaLlegadaBusDestino(),
                opcion.horaLlegadaFinal(),

                opcion.minutosAndandoOrigen(),
                opcion.minutosEsperaOrigen(),
                opcion.minutosPrimerBus(),
                opcion.minutosEsperaTransbordo(),
                opcion.minutosSegundoBus(),
                opcion.minutosAndandoDestino(),
                opcion.minutosTotal(),

                opcion.distanciaAndandoTotalMetros(),
                opcion.transbordos(),
                opcion.puntuacion(),

                opcion.fuente(),

                opcion.tramos()
        );
    }

    private String crearClaveOpcion(RutaTransbordoOpcionDTO opcion) {
        String tramo1 = "";
        String tramo2 = "";

        if (opcion.tramos() != null && opcion.tramos().size() >= 2) {
            tramo1 = opcion.tramos().get(0).linea()
                    + "|"
                    + opcion.tramos().get(0).paradaSalida().id()
                    + "|"
                    + opcion.tramos().get(0).paradaLlegada().id();

            tramo2 = opcion.tramos().get(1).linea()
                    + "|"
                    + opcion.tramos().get(1).paradaSalida().id()
                    + "|"
                    + opcion.tramos().get(1).paradaLlegada().id();
        }

        return tramo1
                + "|"
                + tramo2
                + "|"
                + opcion.horaSalidaPrimerBus()
                + "|"
                + opcion.horaSalidaSegundoBus();
    }

    private String obtenerLinea(ProximoBusGtfsDTO bus, GtfsTrip viaje) {
        if (bus.linea() != null && !bus.linea().isBlank()) {
            return bus.linea();
        }

        Optional<GtfsRoute> rutaOptional = gtfsRouteRepositorio.findById(viaje.getRouteId());

        return rutaOptional
                .map(GtfsRoute::getRouteShortName)
                .orElse("");
    }

    private String obtenerDestino(ProximoBusGtfsDTO bus, GtfsTrip viaje) {
        if (bus.destino() != null && !bus.destino().isBlank()) {
            return bus.destino();
        }

        return viaje.getTripHeadsign();
    }

    private String obtenerRouteId(ProximoBusGtfsDTO bus, GtfsTrip viaje) {
        if (bus.routeId() != null && !bus.routeId().isBlank()) {
            return bus.routeId();
        }

        return viaje.getRouteId();
    }

    private boolean mismoCodigoLinea(String lineaA, String lineaB) {
        return normalizarCodigoLinea(lineaA).equalsIgnoreCase(normalizarCodigoLinea(lineaB));
    }

    private int calcularPuntuacionTransbordo(
            Integer minutosTotal,
            Integer minutosEsperaOrigen,
            Integer minutosEsperaTransbordo,
            Integer distanciaAndandoTotalMetros
    ) {
        int puntuacion = minutosTotal == null ? 9999 : minutosTotal;

        puntuacion += PENALIZACION_TRANSBORDO;

        if (minutosEsperaOrigen != null && minutosEsperaOrigen > 30) {
            puntuacion += 6;
        }

        if (minutosEsperaTransbordo != null && minutosEsperaTransbordo > 15) {
            puntuacion += 6;
        }

        if (minutosEsperaTransbordo != null && minutosEsperaTransbordo > 30) {
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

    private LocalTime convertirMinutosGtfsALocalTime(int minutosGtfs) {
        int minutosDelDia = minutosGtfs % (24 * 60);

        int horas = minutosDelDia / 60;
        int minutos = minutosDelDia % 60;

        return LocalTime.of(horas, minutos);
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

    private RutaTransbordoResultadoDTO respuestaVacia(
            Double origenLat,
            Double origenLon,
            Double destinoLat,
            Double destinoLon,
            LocalDate fechaConsulta,
            LocalTime horaConsulta,
            String mensaje
    ) {
        return new RutaTransbordoResultadoDTO(
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