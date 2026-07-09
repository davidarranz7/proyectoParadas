package com.paradabus.modelo;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class GtfsStopTimeId implements Serializable {

    // ID del viaje.
    // Ejemplo: "C1 01LPV00_001001_2"
    private String tripId;

    // Orden de la parada dentro de ese viaje.
    // Ejemplo: 1, 2, 3, 4...
    private Integer stopSequence;
}