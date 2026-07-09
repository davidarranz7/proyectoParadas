package com.paradabus.modelo;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class GtfsShapeId implements Serializable {

    @Column(name = "shape_id", length = 100)
    private String shapeId;

    @Column(name = "shape_pt_sequence")
    private Integer shapePtSequence;
}