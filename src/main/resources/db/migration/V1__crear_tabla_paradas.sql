CREATE TABLE paradas (
    id BIGINT PRIMARY KEY,

    stop_id VARCHAR(30),
    nombre VARCHAR(200) NOT NULL,

    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,

    lineas_original TEXT,

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paradas_stop_id
ON paradas (stop_id);

CREATE INDEX idx_paradas_nombre
ON paradas (LOWER(nombre));

CREATE INDEX idx_paradas_lat_lon
ON paradas (lat, lon);