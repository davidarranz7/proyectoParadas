package com.paradabus.servicio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paradabus.dto.AvisoTransporteDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class AvisoTransporteServicio {

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${paradabus.fuentes.avisos}")
    private String urlAvisos;

    public List<AvisoTransporteDTO> listarAvisos(
            boolean soloActivos,
            String linea,
            Long paradaId,
            Integer limite
    ) {
        String contenido = restClientBuilder.build()
                .get()
                .uri(urlAvisos)
                .retrieve()
                .body(String.class);

        if (contenido == null || contenido.isBlank()) {
            return List.of();
        }

        List<AvisoTransporteDTO> avisos = leerAvisos(contenido);
        String lineaNormalizada = normalizarTexto(linea);
        String paradaNormalizada = paradaId == null ? "" : String.valueOf(paradaId);
        int limiteFinal = limitarNumero(limite, 1, 12, 6);

        return avisos.stream()
                .filter(aviso -> !soloActivos || aviso.activo())
                .filter(aviso -> lineaNormalizada.isEmpty() || contieneLinea(aviso, lineaNormalizada))
                .filter(aviso -> paradaNormalizada.isEmpty() || aviso.paradasAfectadas().contains(paradaNormalizada))
                .sorted(
                        Comparator.comparing(AvisoTransporteDTO::activo).reversed()
                                .thenComparing(this::resolverFechaInicioOrdenable, Comparator.nullsLast(Comparator.reverseOrder()))
                                .thenComparing(AvisoTransporteDTO::titulo, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                )
                .limit(limiteFinal)
                .toList();
    }

    private List<AvisoTransporteDTO> leerAvisos(String contenido) {
        try {
            JsonNode raiz = objectMapper.readTree(contenido);

            if (!raiz.isArray()) {
                return List.of();
            }

            return StreamSupport.stream(raiz.spliterator(), false)
                    .map(this::convertirAviso)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (IOException exception) {
            throw new RuntimeException("No se pudieron leer los avisos de transporte.", exception);
        }
    }

    private AvisoTransporteDTO convertirAviso(JsonNode nodo) {
        if (nodo == null || nodo.isMissingNode()) {
            return null;
        }

        String fechaInicio = obtenerTexto(nodo, "fecha_inicio");
        String fechaFin = obtenerTexto(nodo, "fecha_fin");
        List<String> lineasAfectadas = obtenerListaTextos(nodo.get("lineas_afectadas"));
        List<String> paradasAfectadas = obtenerListaTextos(nodo.get("paradas_afectadas"));

        return new AvisoTransporteDTO(
                obtenerTexto(nodo, "id"),
                obtenerTexto(nodo, "titulo"),
                obtenerTexto(nodo, "resumen"),
                obtenerTexto(nodo, "subcategoria"),
                fechaInicio,
                fechaFin,
                calcularActivo(fechaInicio, fechaFin),
                lineasAfectadas,
                paradasAfectadas
        );
    }

    private boolean calcularActivo(String fechaInicio, String fechaFin) {
        LocalDate hoy = LocalDate.now(ZoneId.of("Europe/Madrid"));
        LocalDate inicio = parsearFecha(fechaInicio);
        LocalDate fin = parsearFecha(fechaFin);

        if (inicio == null && fin == null) {
            return true;
        }

        if (inicio != null && hoy.isBefore(inicio)) {
            return false;
        }

        if (fin != null && hoy.isAfter(fin)) {
            return false;
        }

        return true;
    }

    private LocalDate resolverFechaInicioOrdenable(AvisoTransporteDTO aviso) {
        return parsearFecha(aviso.fechaInicio());
    }

    private LocalDate parsearFecha(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        LocalDate fecha = parsearOffsetDateTime(texto);

        if (fecha != null) {
            return fecha;
        }

        fecha = parsearLocalDateTime(texto, "yyyy-MM-dd'T'HH:mm:ss");

        if (fecha != null) {
            return fecha;
        }

        fecha = parsearLocalDate(texto, "yyyy-MM-dd");

        if (fecha != null) {
            return fecha;
        }

        fecha = parsearLocalDateTime(texto, "dd/MM/yyyy HH:mm:ss");

        if (fecha != null) {
            return fecha;
        }

        fecha = parsearLocalDateTime(texto, "dd/MM/yyyy HH:mm");

        if (fecha != null) {
            return fecha;
        }

        return parsearLocalDate(texto, "dd/MM/yyyy");
    }

    private LocalDate parsearOffsetDateTime(String texto) {
        try {
            return OffsetDateTime.parse(texto).toLocalDate();
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate parsearLocalDateTime(String texto, String patron) {
        try {
            return LocalDateTime.parse(texto, java.time.format.DateTimeFormatter.ofPattern(patron)).toLocalDate();
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate parsearLocalDate(String texto, String patron) {
        try {
            return LocalDate.parse(texto, java.time.format.DateTimeFormatter.ofPattern(patron));
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<String> obtenerListaTextos(JsonNode nodo) {
        if (nodo == null || nodo.isNull() || nodo.isMissingNode()) {
            return List.of();
        }

        if (nodo.isArray()) {
            List<String> valores = new ArrayList<>();

            nodo.forEach(item -> {
                String texto = item == null ? "" : item.asText("");

                if (!texto.isBlank()) {
                    valores.add(texto.trim());
                }
            });

            return valores;
        }

        String texto = nodo.asText("");

        if (texto.isBlank()) {
            return List.of();
        }

        return List.of(texto.split(","))
                .stream()
                .map(String::trim)
                .filter(valor -> !valor.isEmpty())
                .toList();
    }

    private String obtenerTexto(JsonNode nodo, String campo) {
        JsonNode valor = nodo.get(campo);

        if (valor == null || valor.isNull() || valor.isMissingNode()) {
            return null;
        }

        String texto = valor.asText("");

        return texto.isBlank() ? null : texto.trim();
    }

    private boolean contieneLinea(AvisoTransporteDTO aviso, String lineaNormalizada) {
        return aviso.lineasAfectadas().stream()
                .map(this::normalizarTexto)
                .anyMatch(linea -> linea.equals(lineaNormalizada));
    }

    private String normalizarTexto(String valor) {
        return valor == null ? "" : valor.trim().toUpperCase(Locale.ROOT);
    }

    private int limitarNumero(Integer valor, int minimo, int maximo, int valorPorDefecto) {
        if (valor == null) {
            return valorPorDefecto;
        }

        return Math.max(minimo, Math.min(maximo, valor));
    }
}
