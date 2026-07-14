package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsCalendarDate;
import com.paradabus.modelo.GtfsCalendarDateId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface GtfsCalendarDateRepositorio extends JpaRepository<GtfsCalendarDate, GtfsCalendarDateId> {

    List<GtfsCalendarDate> findByServiceDateAndExceptionType(LocalDate serviceDate, Integer exceptionType);

    List<GtfsCalendarDate> findByServiceIdInAndExceptionTypeAndServiceDateBetween(
            List<String> serviceIds,
            Integer exceptionType,
            LocalDate fechaInicio,
            LocalDate fechaFin
    );
}
