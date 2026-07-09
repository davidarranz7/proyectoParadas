CREATE TABLE gtfs_shapes (
    shape_id VARCHAR(100) NOT NULL,
    shape_pt_sequence INTEGER NOT NULL,

    shape_pt_lat DOUBLE PRECISION NOT NULL,
    shape_pt_lon DOUBLE PRECISION NOT NULL,

    shape_dist_traveled DOUBLE PRECISION,

    PRIMARY KEY (shape_id, shape_pt_sequence)
);

CREATE INDEX idx_gtfs_shapes_shape_id
ON gtfs_shapes (shape_id);

CREATE INDEX idx_gtfs_shapes_shape_id_sequence
ON gtfs_shapes (shape_id, shape_pt_sequence);