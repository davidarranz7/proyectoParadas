package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsStopTime;
import com.paradabus.modelo.GtfsStopTimeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GtfsStopTimeRepositorio extends JpaRepository<GtfsStopTime, GtfsStopTimeId> {

    List<GtfsStopTime> findTop100ByStopIdAndDepartureTimeGreaterThanEqualOrderByDepartureTimeAsc(
            String stopId,
            String departureTime
    );

    List<GtfsStopTime> findByTripIdOrderByStopSequenceAsc(String tripId);

    long countByTripId(String tripId);
}