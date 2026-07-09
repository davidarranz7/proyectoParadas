package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsStop;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GtfsStopRepositorio extends JpaRepository<GtfsStop, String> {
}