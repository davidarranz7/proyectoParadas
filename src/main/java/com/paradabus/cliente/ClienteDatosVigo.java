package com.paradabus.cliente;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ClienteDatosVigo {

    private final RestClient.Builder restClientBuilder;

    @Value("${paradabus.fuentes.paradas}")
    private String urlParadas;

    // Lee el archivo paradas.json desde datos abiertos de Vigo
    public List<ParadaDatosVigo> obtenerParadas() {
        RestClient restClient = restClientBuilder.build();

        return restClient
                .get()
                .uri(urlParadas)
                .retrieve()
                .body(new ParameterizedTypeReference<List<ParadaDatosVigo>>() {});
    }

    // Representa una parada tal como viene en paradas.json
    public record ParadaDatosVigo(

            // Texto original de líneas.
            // Ejemplo: "C1, N4"
            String lineas,

            // stop_id viene con guion bajo en el JSON
            @JsonProperty("stop_id")
            String stopId,

            // Longitud
            Double lon,

            // ID real de la parada.
            // Este es el que usa InfoBus / QR.
            Long id,

            // Nombre de la parada
            String nombre,

            // Latitud
            Double lat
    ) {
    }
}