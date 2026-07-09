package com.paradabus.dto;

public record GtfsArchivoDTO(

        // Nombre del archivo dentro del ZIP GTFS.
        // Ejemplo: stops.txt, routes.txt, trips.txt...
        String nombre,

        // Tamaño aproximado del archivo en bytes.
        Long tamanoBytes
) {
}