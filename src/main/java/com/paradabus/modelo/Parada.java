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
@Table(name = "paradas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Parada {

    // ID real que viene en paradas.json
    // También es el código que usa InfoBus/QR
    @Id
    @Column(name = "id")
    private Long id;

    // Código stop_id que viene en el JSON oficial
    @Column(name = "stop_id", length = 30)
    private String stopId;

    // Nombre de la parada
    @Column(name = "nombre", nullable = false, length = 200)
    private String nombre;

    // Latitud de la parada
    @Column(name = "lat", nullable = false)
    private Double lat;

    // Longitud de la parada
    @Column(name = "lon", nullable = false)
    private Double lon;

    // Texto original de líneas: "C1, N4, 5A..."
    @Column(name = "lineas_original", columnDefinition = "TEXT")
    private String lineasOriginal;

    // Fecha de creación del registro
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}