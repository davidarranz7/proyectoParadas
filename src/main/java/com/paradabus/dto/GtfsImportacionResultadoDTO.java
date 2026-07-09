package com.paradabus.dto;

public record GtfsImportacionResultadoDTO(

        // Total de paradas GTFS importadas desde stops.txt
        Integer totalStops,

        // Total de líneas importadas desde routes.txt
        Integer totalRoutes,

        // Total de viajes importados desde trips.txt
        Integer totalTrips,

        // Total de horarios de paso importados desde stop_times.txt
        Integer totalStopTimes,

        // Total de fechas de servicio importadas desde calendar_dates.txt
        Integer totalCalendarDates,

        // Mensaje final para mostrar en la respuesta
        String mensaje
) {
}