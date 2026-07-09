package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsCalendarDate;
import com.paradabus.modelo.GtfsCalendarDateId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface GtfsCalendarDateRepositorio extends JpaRepository<GtfsCalendarDate, GtfsCalendarDateId> {

    // Buscar servicios que funcionan o no funcionan en una fecha concreta.
    // exceptionType = 1 significa que funciona ese día.
    // exceptionType = 2 significa que no funciona ese día.
    List<GtfsCalendarDate> findByServiceDateAndExceptionType(LocalDate serviceDate, Integer exceptionType);
}