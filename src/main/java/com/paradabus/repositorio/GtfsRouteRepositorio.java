package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsRoute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GtfsRouteRepositorio extends JpaRepository<GtfsRoute, String> {

    List<GtfsRoute> findByRouteShortNameIgnoreCase(String routeShortName);
}