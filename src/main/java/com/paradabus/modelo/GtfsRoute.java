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
@Table(name = "gtfs_routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsRoute {

    // ID interno de la línea en GTFS.
    // Ejemplo: "1"
    @Id
    @Column(name = "route_id", length = 80)
    private String routeId;

    // Agencia del transporte.
    // En este caso suele ser Vitrasa.
    @Column(name = "agency_id", length = 80)
    private String agencyId;

    // Nombre corto de la línea.
    // Ejemplo: "C1", "5A", "A", "4A"
    @Column(name = "route_short_name", length = 80)
    private String routeShortName;

    // Nombre largo de la línea.
    // Ejemplo: "CIRCULAR CENTRO"
    @Column(name = "route_long_name", length = 250)
    private String routeLongName;

    // Descripción de la línea, si viene informada.
    @Column(name = "route_desc", columnDefinition = "TEXT")
    private String routeDesc;

    // Tipo de transporte GTFS.
    // Normalmente 3 significa bus.
    @Column(name = "route_type")
    private Integer routeType;

    // URL de la línea, si viene informada.
    @Column(name = "route_url", columnDefinition = "TEXT")
    private String routeUrl;

    // Color de la línea.
    // Ejemplo: "ED4713"
    @Column(name = "route_color", length = 20)
    private String routeColor;

    // Color del texto de la línea.
    // Ejemplo: "000000"
    @Column(name = "route_text_color", length = 20)
    private String routeTextColor;

    // Fecha de creación del registro.
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización.
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}