package com.paradabus.servicio;

import com.paradabus.dto.*;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.ParadaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProximosBusesServicio {

    private final InfoBusServicio infoBusServicio;
    private final GtfsConsultaServicio gtfsConsultaServicio;
    private final ParadaRepositorio paradaRepositorio;

    public ProximosBusesUnificadosDTO buscarProximosBuses(Long paradaId) {
        Parada parada = paradaRepositorio.findById(paradaId)
                .orElseThrow(() -> new RuntimeException("No existe la parada con id: " + paradaId));

        try {
            InfoBusParadaDTO infoBus = infoBusServicio.obtenerProximosBusesReales(paradaId);

            if (infoBus.proximosBuses() != null && !infoBus.proximosBuses().isEmpty()) {
                List<ProximoBusUnificadoDTO> buses = infoBus.proximosBuses()
                        .stream()
                        .map(bus -> new ProximoBusUnificadoDTO(
                                bus.linea(),
                                bus.ruta(),
                                bus.minutos(),
                                "TIEMPO_REAL"
                        ))
                        .sorted(Comparator.comparing(
                                ProximoBusUnificadoDTO::minutos,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                        .toList();

                return new ProximosBusesUnificadosDTO(
                        parada.getId(),
                        parada.getStopId(),
                        parada.getNombre(),
                        infoBus.hora(),
                        "INFOBUS",
                        true,
                        "Datos obtenidos desde InfoBus en tiempo real",
                        buses
                );
            }

        } catch (Exception e) {
            // Si InfoBus falla, no rompemos la app.
            // Pasamos automáticamente a GTFS.
        }

        return buscarDesdeGtfs(parada);
    }

    private ProximosBusesUnificadosDTO buscarDesdeGtfs(Parada parada) {
        ProximosBusesParadaGtfsDTO gtfs = gtfsConsultaServicio.buscarProximosBusesPorParada(parada.getId());

        List<ProximoBusUnificadoDTO> buses = new ArrayList<>();

        if (gtfs.proximosBuses() != null) {
            buses = gtfs.proximosBuses()
                    .stream()
                    .map(bus -> new ProximoBusUnificadoDTO(
                            bus.linea(),
                            bus.destino(),
                            bus.minutos(),
                            "GTFS"
                    ))
                    .sorted(Comparator.comparing(
                            ProximoBusUnificadoDTO::minutos,
                            Comparator.nullsLast(Integer::compareTo)
                    ))
                    .toList();
        }

        String mensaje = gtfs.mensaje();

        if (mensaje == null || mensaje.isBlank()) {
            mensaje = "Datos obtenidos desde GTFS programado";
        }

        return new ProximosBusesUnificadosDTO(
                parada.getId(),
                parada.getStopId(),
                parada.getNombre(),
                LocalTime.now().withNano(0).toString(),
                "GTFS",
                false,
                mensaje,
                buses
        );
    }
}