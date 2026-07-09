package com.paradabus.dto;

import java.util.List;

public record GtfsVistaPreviaArchivoDTO(

        // Nombre del archivo GTFS leído.
        // Ejemplo: stops.txt, routes.txt, trips.txt...
        String nombreArchivo,

        // Primera línea del archivo.
        // Normalmente contiene las columnas.
        String cabecera,

        // Primeras líneas de datos del archivo.
        List<String> lineas
) {
}