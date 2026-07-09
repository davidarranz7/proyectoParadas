package com.paradabus.utilidad;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public final class GtfsCsvUtilidad {

    private static final DateTimeFormatter FORMATO_FECHA_GTFS = DateTimeFormatter.ofPattern("yyyyMMdd");

    private GtfsCsvUtilidad() {
        // Constructor privado para que esta clase no se pueda instanciar
    }

    // Separa una línea CSV respetando comillas.
    // Ejemplo:
    // 1,1,C1,CIRCULAR CENTRO,,3,,ED4713,000000
    public static List<String> separarLineaCsv(String linea) {
        List<String> campos = new ArrayList<>();

        if (linea == null || linea.isBlank()) {
            return campos;
        }

        StringBuilder campoActual = new StringBuilder();
        boolean dentroDeComillas = false;

        for (int i = 0; i < linea.length(); i++) {
            char caracter = linea.charAt(i);

            if (caracter == '"') {
                boolean esComillaDobleEscapada =
                        dentroDeComillas
                                && i + 1 < linea.length()
                                && linea.charAt(i + 1) == '"';

                if (esComillaDobleEscapada) {
                    campoActual.append('"');
                    i++;
                } else {
                    dentroDeComillas = !dentroDeComillas;
                }

            } else if (caracter == ',' && !dentroDeComillas) {
                campos.add(limpiarCampo(campoActual.toString()));
                campoActual.setLength(0);

            } else {
                campoActual.append(caracter);
            }
        }

        campos.add(limpiarCampo(campoActual.toString()));

        return campos;
    }

    // Obtiene un campo por posición.
    // Si no existe, devuelve texto vacío para evitar errores.
    public static String obtenerCampo(List<String> campos, int posicion) {
        if (campos == null || posicion < 0 || posicion >= campos.size()) {
            return "";
        }

        String valor = campos.get(posicion);

        return valor == null ? "" : valor.trim();
    }

    // Convierte un campo de texto vacío a null.
    public static String obtenerTextoONull(List<String> campos, int posicion) {
        String valor = obtenerCampo(campos, posicion);

        if (valor.isBlank()) {
            return null;
        }

        return valor;
    }

    // Convierte un campo a Integer.
    public static Integer obtenerIntegerONull(List<String> campos, int posicion) {
        String valor = obtenerCampo(campos, posicion);

        if (valor.isBlank()) {
            return null;
        }

        return Integer.parseInt(valor);
    }

    // Convierte un campo a Long.
    public static Long obtenerLongONull(List<String> campos, int posicion) {
        String valor = obtenerCampo(campos, posicion);

        if (valor.isBlank()) {
            return null;
        }

        return Long.parseLong(valor);
    }

    // Convierte un campo a Double.
    public static Double obtenerDoubleONull(List<String> campos, int posicion) {
        String valor = obtenerCampo(campos, posicion);

        if (valor.isBlank()) {
            return null;
        }

        return Double.parseDouble(valor);
    }

    // Convierte una fecha GTFS.
    // Ejemplo: 20260709 -> 2026-07-09
    public static LocalDate obtenerFechaGtfsONull(List<String> campos, int posicion) {
        String valor = obtenerCampo(campos, posicion);

        if (valor.isBlank()) {
            return null;
        }

        return LocalDate.parse(valor, FORMATO_FECHA_GTFS);
    }

    // Convierte stop_code en parada_id.
    // Ejemplo:
    // P006930 -> 6930
    public static Long obtenerParadaIdDesdeStopCode(String stopCode) {
        if (stopCode == null || stopCode.isBlank()) {
            return null;
        }

        String soloNumeros = stopCode.replaceAll("[^0-9]", "");

        if (soloNumeros.isBlank()) {
            return null;
        }

        return Long.parseLong(soloNumeros);
    }

    // Limpia espacios sobrantes del campo
    private static String limpiarCampo(String campo) {
        if (campo == null) {
            return "";
        }

        return campo.trim();
    }
}