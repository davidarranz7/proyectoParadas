package com.paradabus.servicio;

import com.paradabus.cliente.ClienteInfoBus;
import com.paradabus.dto.InfoBusParadaDTO;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.ParadaRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InfoBusServicio {

    private final ClienteInfoBus clienteInfoBus;
    private final ParadaRepositorio paradaRepositorio;

    public InfoBusParadaDTO obtenerProximosBusesReales(Long paradaId) {
        if (paradaId == null) {
            throw new RuntimeException("El id de parada es obligatorio");
        }

        Parada parada = paradaRepositorio.findById(paradaId)
                .orElseThrow(() -> new RuntimeException("No existe la parada con id: " + paradaId));

        InfoBusParadaDTO infoBus = clienteInfoBus.obtenerInfoBusParada(parada.getId());

        return new InfoBusParadaDTO(
                parada.getId(),
                infoBus.codigoParada(),
                infoBus.hora(),
                infoBus.nombreParada() != null ? infoBus.nombreParada() : parada.getNombre(),
                infoBus.proximosBuses()
        );
    }
}