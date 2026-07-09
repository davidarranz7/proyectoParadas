package com.paradabus.modelo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "gtfs_stop_times")
@IdClass(GtfsStopTimeId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsStopTime {

    // ID del viaje.
    // Se relaciona con gtfs_trips.trip_id.
    // Ejemplo: "C1 01LPV00_001001_2"
    @Id
    @Column(name = "trip_id", length = 150)
    private String tripId;

    // Orden de la parada dentro del viaje.
    // Ejemplo: 1, 2, 3, 4...
    @Id
    @Column(name = "stop_sequence")
    private Integer stopSequence;

    // Hora de llegada a la parada.
    // Ejemplo: "07:32:00"
    @Column(name = "arrival_time", length = 20)
    private String arrivalTime;

    // Hora de salida de la parada.
    // Ejemplo: "07:32:00"
    @Column(name = "departure_time", length = 20)
    private String departureTime;

    // ID de la parada GTFS.
    // Se relaciona con gtfs_stops.stop_id.
    // Ejemplo: "3493"
    @Column(name = "stop_id", nullable = false, length = 80)
    private String stopId;

    // Dirección específica en esa parada, si viene informada.
    @Column(name = "stop_headsign", length = 250)
    private String stopHeadsign;

    // Tipo de recogida GTFS.
    @Column(name = "pickup_type")
    private Integer pickupType;

    // Tipo de bajada GTFS.
    @Column(name = "drop_off_type")
    private Integer dropOffType;

    // Distancia recorrida sobre el shape, si viene informada.
    @Column(name = "shape_dist_traveled")
    private Double shapeDistTraveled;

    // Fecha de creación del registro.
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización.
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}