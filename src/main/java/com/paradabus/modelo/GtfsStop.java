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
@Table(name = "gtfs_stops")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsStop {

    // ID de la parada dentro del GTFS.
    // Ejemplo: "3493"
    @Id
    @Column(name = "stop_id", length = 80)
    private String stopId;

    // Código visible de la parada en GTFS.
    // Ejemplo: "P006930"
    @Column(name = "stop_code", length = 80)
    private String stopCode;

    // Nombre de la parada.
    // Ejemplo: "Praza de América  1"
    @Column(name = "stop_name", nullable = false, length = 250)
    private String stopName;

    // Descripción de la parada.
    // En este GTFS suele venir como "Parada"
    @Column(name = "stop_desc", columnDefinition = "TEXT")
    private String stopDesc;

    // Latitud de la parada.
    @Column(name = "stop_lat", nullable = false)
    private Double stopLat;

    // Longitud de la parada.
    @Column(name = "stop_lon", nullable = false)
    private Double stopLon;

    // Zona GTFS, si viene informada.
    @Column(name = "zone_id", length = 80)
    private String zoneId;

    // URL de la parada, si viene informada.
    @Column(name = "stop_url", columnDefinition = "TEXT")
    private String stopUrl;

    // Tipo de ubicación GTFS.
    // Normalmente 0 o vacío para paradas normales.
    @Column(name = "location_type")
    private Integer locationType;

    // Estación padre, si existiera.
    @Column(name = "parent_station", length = 80)
    private String parentStation;

    // Zona horaria de la parada.
    // Ejemplo: "Europe/Madrid"
    @Column(name = "stop_timezone", length = 80)
    private String stopTimezone;

    // Accesibilidad de la parada.
    @Column(name = "wheelchair_boarding")
    private Integer wheelchairBoarding;

    // ID de nuestra tabla paradas.
    // Ejemplo:
    // GTFS stop_code = "P006930"
    // parada_id = 6930
    @Column(name = "parada_id")
    private Long paradaId;

    // Fecha de creación del registro.
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización.
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}