package com.paradabus.modelo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "gtfs_trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsTrip {

    // ID único del viaje en GTFS.
    // Ejemplo: "C1 01LPV00_001001_2"
    @Id
    @Column(name = "trip_id", length = 150)
    private String tripId;

    // ID de la línea a la que pertenece este viaje.
    // Se relaciona con gtfs_routes.route_id.
    // Ejemplo: "1"
    @Column(name = "route_id", nullable = false, length = 80)
    private String routeId;

    // ID del servicio/calendario.
    // Sirve para saber qué días funciona este viaje.
    // Ejemplo: "C1 01LPV00_001001"
    @Column(name = "service_id", nullable = false, length = 150)
    private String serviceId;

    // Dirección o cabecera del viaje.
    // Ejemplo: "PRAZA AMÉRICA"
    @Column(name = "trip_headsign", length = 250)
    private String tripHeadsign;

    // Sentido del viaje.
    // Normalmente 0 o 1.
    @Column(name = "direction_id")
    private Integer directionId;

    // Bloque del viaje, si viene informado.
    @Column(name = "block_id", length = 150)
    private String blockId;

    // ID del recorrido gráfico.
    // Se usará más adelante para pintar el trayecto en mapa.
    @Column(name = "shape_id", length = 150)
    private String shapeId;

    // Accesibilidad del viaje.
    @Column(name = "wheelchair_accessible")
    private Integer wheelchairAccessible;

    // Fecha de creación del registro.
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización.
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}