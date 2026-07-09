package com.paradabus.modelo;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "gtfs_shapes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GtfsShape {

    @EmbeddedId
    private GtfsShapeId id;

    @Column(name = "shape_pt_lat", nullable = false)
    private Double shapePtLat;

    @Column(name = "shape_pt_lon", nullable = false)
    private Double shapePtLon;

    @Column(name = "shape_dist_traveled")
    private Double shapeDistTraveled;
}