package com.paradabus.modelo;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class GtfsCalendarDateId implements Serializable {

    // ID del servicio/calendario.
    // Ejemplo: "A 01LP001_008001"
    private String serviceId;

    // Día concreto en el que funciona o no funciona el servicio.
    // Ejemplo: 2026-07-09
    private LocalDate serviceDate;
}