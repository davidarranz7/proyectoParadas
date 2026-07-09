package com.paradabus.servicio;

import com.paradabus.dto.ProximoBusGtfsDTO;
import com.paradabus.dto.ProximosBusesParadaGtfsDTO;
import com.paradabus.modelo.GtfsCalendarDate;
import com.paradabus.modelo.GtfsRoute;
import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsTrip;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.GtfsCalendarDateRepositorio;
import com.paradabus.repositorio.GtfsRouteRepositorio;
import com.paradabus.repositorio.GtfsStopTimeRepositorio;
import com.paradabus.repositorio.GtfsTripRepositorio;
import com.paradabus.repositorio.ParadaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GtfsConsultaServicio {

    private static final ZoneId ZONA_HORARIA = ZoneId.of("Europe/Madrid");
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm:ss");

    private static final int LIMITE_PROXIMOS_BUSES = 20;

    private final ParadaRepositorio paradaRepositorio;

    private final GtfsStopTimeRepositorio gtfsStopTimeRepositorio;
    private final GtfsTripRepositorio gtfsTripRepositorio;
    private final GtfsRouteRepositorio gtfsRouteRepositorio;
    private final GtfsCalendarDateRepositorio gtfsCalendarDateRepositorio;

    // Método normal: usa la fecha y hora actuales.
    public ProximosBusesParadaGtfsDTO buscarProximosBusesPorParada(Long paradaId) {
        return buscarProximosBusesPorParada(
                paradaId,
                LocalDate.now(ZONA_HORARIA),
                LocalTime.now(ZONA_HORARIA)
        );
    }

    // Método de prueba: permite pasar fecha y hora manual.
    public ProximosBusesParadaGtfsDTO buscarProximosBusesPorParada(
            Long paradaId,
            LocalDate fechaConsulta,
            LocalTime horaConsulta
    ) {
        Parada parada = paradaRepositorio.findById(paradaId)
                .orElseThrow(() -> new RuntimeException("No existe la parada con id: " + paradaId));

        if (fechaConsulta == null) {
            fechaConsulta = LocalDate.now(ZONA_HORARIA);
        }

        if (horaConsulta == null) {
            horaConsulta = LocalTime.now(ZONA_HORARIA);
        }

        String horaConsultaTexto = horaConsulta.format(FORMATO_HORA);

        if (parada.getStopId() == null || parada.getStopId().isBlank()) {
            return new ProximosBusesParadaGtfsDTO(
                    parada.getId(),
                    parada.getStopId(),
                    parada.getNombre(),
                    fechaConsulta.toString(),
                    horaConsultaTexto,
                    List.of(),
                    "Esta parada no tiene stop_id relacionado con GTFS"
            );
        }

        Set<String> serviciosActivos = obtenerServiciosActivosPorFecha(fechaConsulta);

        if (serviciosActivos.isEmpty()) {
            return new ProximosBusesParadaGtfsDTO(
                    parada.getId(),
                    parada.getStopId(),
                    parada.getNombre(),
                    fechaConsulta.toString(),
                    horaConsultaTexto,
                    List.of(),
                    "No hay servicios GTFS activos para la fecha indicada"
            );
        }

        List<GtfsStopTime> horariosParada = gtfsStopTimeRepositorio
                .findTop100ByStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(
                        parada.getStopId(),
                        horaConsultaTexto
                );

        List<ProximoBusGtfsDTO> proximosBuses = new ArrayList<>();

        for (GtfsStopTime horario : horariosParada) {
            if (proximosBuses.size() >= LIMITE_PROXIMOS_BUSES) {
                break;
            }

            GtfsTrip viaje = gtfsTripRepositorio.findById(horario.getTripId())
                    .orElse(null);

            if (viaje == null) {
                continue;
            }

            if (!serviciosActivos.contains(viaje.getServiceId())) {
                continue;
            }

            GtfsRoute ruta = gtfsRouteRepositorio.findById(viaje.getRouteId())
                    .orElse(null);

            String linea = obtenerLinea(ruta, viaje);
            String destino = obtenerDestino(viaje);

            Integer minutos = calcularMinutosHastaSalida(
                    horaConsulta,
                    horario.getDepartureTime()
            );

            if (minutos == null || minutos < 0) {
                continue;
            }

            ProximoBusGtfsDTO proximoBus = new ProximoBusGtfsDTO(
                    linea,
                    destino,
                    horario.getArrivalTime(),
                    horario.getDepartureTime(),
                    minutos,
                    viaje.getTripId(),
                    viaje.getRouteId(),
                    viaje.getServiceId()
            );

            proximosBuses.add(proximoBus);
        }

        String mensaje = proximosBuses.isEmpty()
                ? "No se encontraron próximos buses programados para esta parada en la fecha y hora indicadas"
                : "Próximos buses programados encontrados correctamente";

        return new ProximosBusesParadaGtfsDTO(
                parada.getId(),
                parada.getStopId(),
                parada.getNombre(),
                fechaConsulta.toString(),
                horaConsultaTexto,
                proximosBuses,
                mensaje
        );
    }

    private Set<String> obtenerServiciosActivosPorFecha(LocalDate fechaConsulta) {
        return gtfsCalendarDateRepositorio
                .findByServiceDateAndExceptionType(fechaConsulta, 1)
                .stream()
                .map(GtfsCalendarDate::getServiceId)
                .collect(Collectors.toSet());
    }

    private String obtenerLinea(GtfsRoute ruta, GtfsTrip viaje) {
        if (ruta != null && ruta.getRouteShortName() != null && !ruta.getRouteShortName().isBlank()) {
            return ruta.getRouteShortName();
        }

        return viaje.getRouteId();
    }

    private String obtenerDestino(GtfsTrip viaje) {
        if (viaje.getTripHeadsign() == null || viaje.getTripHeadsign().isBlank()) {
            return "Destino no indicado";
        }

        return viaje.getTripHeadsign();
    }

    private Integer calcularMinutosHastaSalida(
            LocalTime horaConsulta,
            String departureTime
    ) {
        if (departureTime == null || departureTime.isBlank()) {
            return null;
        }

        int minutosConsulta = horaConsulta.getHour() * 60 + horaConsulta.getMinute();
        int minutosSalida = convertirHoraGtfsAMinutos(departureTime);

        return minutosSalida - minutosConsulta;
    }

    private int convertirHoraGtfsAMinutos(String horaGtfs) {
        String[] partes = horaGtfs.split(":");

        if (partes.length < 2) {
            return 0;
        }

        int horas = Integer.parseInt(partes[0]);
        int minutos = Integer.parseInt(partes[1]);

        return horas * 60 + minutos;
    }
}