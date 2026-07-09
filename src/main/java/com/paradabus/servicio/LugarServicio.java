package com.paradabus.servicio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paradabus.dto.LugarDTO;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class LugarServicio {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public LugarServicio(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    public List<LugarDTO> buscarLugares(String texto) {
        if (texto == null || texto.isBlank()) {
            return List.of();
        }

        try {
            String consulta = texto.trim() + ", Vigo, Pontevedra, España";
            String consultaCodificada = URLEncoder.encode(consulta, StandardCharsets.UTF_8);

            String url = "https://nominatim.openstreetmap.org/search"
                    + "?q=" + consultaCodificada
                    + "&format=jsonv2"
                    + "&addressdetails=1"
                    + "&limit=6"
                    + "&countrycodes=es"
                    + "&accept-language=es";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "application/json")
                    .header("User-Agent", "paradaBus-dev/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return List.of();
            }

            JsonNode raiz = objectMapper.readTree(response.body());

            if (!raiz.isArray()) {
                return List.of();
            }

            List<LugarDTO> lugares = new ArrayList<>();

            for (JsonNode nodo : raiz) {
                LugarDTO lugar = convertirNodoALugar(nodo);

                if (lugar != null) {
                    lugares.add(lugar);
                }
            }

            return lugares;
        } catch (Exception e) {
            return List.of();
        }
    }

    private LugarDTO convertirNodoALugar(JsonNode nodo) {
        String latTexto = obtenerTexto(nodo, "lat");
        String lonTexto = obtenerTexto(nodo, "lon");
        String direccion = obtenerTexto(nodo, "display_name");

        if (latTexto == null || lonTexto == null || direccion == null) {
            return null;
        }

        try {
            Double lat = Double.parseDouble(latTexto);
            Double lon = Double.parseDouble(lonTexto);

            String nombre = obtenerNombre(nodo, direccion);

            return new LugarDTO(
                    nombre,
                    direccion,
                    lat,
                    lon,
                    "nominatim"
            );
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String obtenerNombre(JsonNode nodo, String direccion) {
        String nombre = obtenerTexto(nodo, "name");

        if (nombre != null && !nombre.isBlank()) {
            return nombre;
        }

        if (direccion.contains(",")) {
            return direccion.split(",")[0].trim();
        }

        return direccion;
    }

    private String obtenerTexto(JsonNode nodo, String campo) {
        JsonNode valor = nodo.get(campo);

        if (valor == null || valor.isNull()) {
            return null;
        }

        String texto = valor.asText();

        if (texto == null || texto.isBlank()) {
            return null;
        }

        return texto;
    }
}