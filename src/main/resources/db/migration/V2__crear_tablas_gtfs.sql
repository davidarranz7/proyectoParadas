CREATE TABLE gtfs_stops (
    stop_id VARCHAR(80) PRIMARY KEY,

    stop_code VARCHAR(80),
    stop_name VARCHAR(250) NOT NULL,
    stop_desc TEXT,

    stop_lat DOUBLE PRECISION NOT NULL,
    stop_lon DOUBLE PRECISION NOT NULL,

    zone_id VARCHAR(80),
    stop_url TEXT,

    location_type INTEGER,
    parent_station VARCHAR(80),
    stop_timezone VARCHAR(80),
    wheelchair_boarding INTEGER,

    parada_id BIGINT,

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_gtfs_stops_parada
        FOREIGN KEY (parada_id)
        REFERENCES paradas (id)
        ON DELETE SET NULL
);

CREATE TABLE gtfs_routes (
    route_id VARCHAR(80) PRIMARY KEY,

    agency_id VARCHAR(80),
    route_short_name VARCHAR(80),
    route_long_name VARCHAR(250),
    route_desc TEXT,
    route_type INTEGER,
    route_url TEXT,
    route_color VARCHAR(20),
    route_text_color VARCHAR(20),

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE gtfs_trips (
    trip_id VARCHAR(150) PRIMARY KEY,

    route_id VARCHAR(80) NOT NULL,
    service_id VARCHAR(150) NOT NULL,

    trip_headsign VARCHAR(250),
    direction_id INTEGER,
    block_id VARCHAR(150),
    shape_id VARCHAR(150),
    wheelchair_accessible INTEGER,

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_gtfs_trips_route
        FOREIGN KEY (route_id)
        REFERENCES gtfs_routes (route_id)
        ON DELETE CASCADE
);

CREATE TABLE gtfs_stop_times (
    trip_id VARCHAR(150) NOT NULL,

    arrival_time VARCHAR(20),
    departure_time VARCHAR(20),

    stop_id VARCHAR(80) NOT NULL,
    stop_sequence INTEGER NOT NULL,

    stop_headsign VARCHAR(250),
    pickup_type INTEGER,
    drop_off_type INTEGER,
    shape_dist_traveled DOUBLE PRECISION,

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (trip_id, stop_sequence),

    CONSTRAINT fk_gtfs_stop_times_trip
        FOREIGN KEY (trip_id)
        REFERENCES gtfs_trips (trip_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_gtfs_stop_times_stop
        FOREIGN KEY (stop_id)
        REFERENCES gtfs_stops (stop_id)
        ON DELETE CASCADE
);

CREATE TABLE gtfs_calendar_dates (
    service_id VARCHAR(150) NOT NULL,

    service_date DATE NOT NULL,
    exception_type INTEGER NOT NULL,

    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    PRIMARY KEY (service_id, service_date)
);

CREATE INDEX idx_gtfs_stops_stop_code
ON gtfs_stops (stop_code);

CREATE INDEX idx_gtfs_stops_parada_id
ON gtfs_stops (parada_id);

CREATE INDEX idx_gtfs_stops_nombre
ON gtfs_stops (LOWER(stop_name));

CREATE INDEX idx_gtfs_stops_lat_lon
ON gtfs_stops (stop_lat, stop_lon);

CREATE INDEX idx_gtfs_routes_short_name
ON gtfs_routes (route_short_name);

CREATE INDEX idx_gtfs_trips_route_id
ON gtfs_trips (route_id);

CREATE INDEX idx_gtfs_trips_service_id
ON gtfs_trips (service_id);

CREATE INDEX idx_gtfs_stop_times_stop_id
ON gtfs_stop_times (stop_id);

CREATE INDEX idx_gtfs_stop_times_trip_id
ON gtfs_stop_times (trip_id);

CREATE INDEX idx_gtfs_stop_times_stop_id_departure_time
ON gtfs_stop_times (stop_id, departure_time);

CREATE INDEX idx_gtfs_calendar_dates_service_date
ON gtfs_calendar_dates (service_date);

CREATE INDEX idx_gtfs_calendar_dates_service_id
ON gtfs_calendar_dates (service_id);