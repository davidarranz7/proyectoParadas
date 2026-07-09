package com.paradabus.servicio;

import com.paradabus.cliente.ClienteGtfs;
import com.paradabus.dto.GtfsShapesImportacionResultadoDTO;
import com.paradabus.modelo.GtfsShape;
import com.paradabus.modelo.GtfsShapeId;
import com.paradabus.repositorio.GtfsShapeRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GtfsShapesImportacionServicio {

    private static final String ARCHIVO_SHAPES = "shapes.txt";
    private static final int TAMANO_BLOQUE_GUARDADO = 5000;

    private final ClienteGtfs clienteGtfs;
    private final GtfsShapeRepositorio gtfsShapeRepositorio;

    public GtfsShapesImportacionResultadoDTO importarShapes() {
        try {
            List<String> lineas = clienteGtfs.leerLineasArchivo(ARCHIVO_SHAPES);

            if (lineas == null || lineas.size() <= 1) {
                return new GtfsShapesImportacionResultadoDTO(
                        0L,
                        "El archivo shapes.txt está vacío o no existe"
                );
            }

            gtfsShapeRepositorio.deleteAllInBatch();

            List<GtfsShape> bloque = new ArrayList<>();
            long totalImportados = 0;

            // Saltamos cabecera.
            for (int i = 1; i < lineas.size(); i++) {
                String lineaCsv = lineas.get(i);

                if (lineaCsv == null || lineaCsv.isBlank()) {
                    continue;
                }

                List<String> campos = separarLineaCsv(lineaCsv);

                String shapeId = obtenerCampo(campos, 0);
                Double lat = convertirDouble(obtenerCampo(campos, 1));
                Double lon = convertirDouble(obtenerCampo(campos, 2));
                Integer sequence = convertirInteger(obtenerCampo(campos, 3));
                Double distancia = convertirDouble(obtenerCampo(campos, 4));

                if (shapeId == null || shapeId.isBlank()) {
                    continue;
                }

                if (lat == null || lon == null || sequence == null) {
                    continue;
                }

                GtfsShape shape = GtfsShape.builder()
                        .id(new GtfsShapeId(shapeId, sequence))
                        .shapePtLat(lat)
                        .shapePtLon(lon)
                        .shapeDistTraveled(distancia)
                        .build();

                bloque.add(shape);

                if (bloque.size() >= TAMANO_BLOQUE_GUARDADO) {
                    gtfsShapeRepositorio.saveAll(bloque);
                    totalImportados += bloque.size();
                    bloque.clear();
                }
            }

            if (!bloque.isEmpty()) {
                gtfsShapeRepositorio.saveAll(bloque);
                totalImportados += bloque.size();
            }

            return new GtfsShapesImportacionResultadoDTO(
                    totalImportados,
                    "Shapes GTFS importados correctamente"
            );

        } catch (Exception e) {
            throw new RuntimeException("Error importando shapes.txt de GTFS", e);
        }
    }

    private List<String> separarLineaCsv(String linea) {
        List<String> campos = new ArrayList<>();

        StringBuilder actual = new StringBuilder();
        boolean dentroComillas = false;

        for (int i = 0; i < linea.length(); i++) {
            char caracter = linea.charAt(i);

            if (caracter == '"') {
                dentroComillas = !dentroComillas;
                continue;
            }

            if (caracter == ',' && !dentroComillas) {
                campos.add(actual.toString());
                actual.setLength(0);
                continue;
            }

            actual.append(caracter);
        }

        campos.add(actual.toString());

        return campos;
    }

    private String obtenerCampo(List<String> campos, int posicion) {
        if (campos == null || posicion < 0 || posicion >= campos.size()) {
            return null;
        }

        String valor = campos.get(posicion);

        if (valor == null) {
            return null;
        }

        valor = valor.trim();

        return valor.isBlank() ? null : valor;
    }

    private Integer convertirInteger(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        try {
            return Integer.parseInt(texto.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private Double convertirDouble(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        try {
            return Double.parseDouble(texto.trim());
        } catch (Exception e) {
            return null;
        }
    }
}