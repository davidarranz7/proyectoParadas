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

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "gtfs_calendar_dates")
@IdClass(GtfsCalendarDateId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsCalendarDate {

    // ID del servicio/calendario.
    // Sirve para saber qué viajes funcionan un día concreto.
    // Ejemplo: "A 01LP001_008001"
    @Id
    @Column(name = "service_id", length = 150)
    private String serviceId;

    // Fecha concreta del servicio.
    // En el TXT viene como 20260709, aquí lo guardamos como fecha real.
    @Id
    @Column(name = "service_date")
    private LocalDate serviceDate;

    // Tipo de excepción GTFS.
    // 1 = el servicio funciona ese día.
    // 2 = el servicio no funciona ese día.
    @Column(name = "exception_type", nullable = false)
    private Integer exceptionType;

    // Fecha de creación del registro.
    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    // Fecha de última actualización.
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}