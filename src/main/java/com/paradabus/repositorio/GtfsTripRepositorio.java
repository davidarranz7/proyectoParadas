package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsTrip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GtfsTripRepositorio extends JpaRepository<GtfsTrip, String> {

    List<GtfsTrip> findByRouteId(String routeId);
}