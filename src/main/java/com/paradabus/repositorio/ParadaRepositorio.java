package com.paradabus.repositorio;

import com.paradabus.modelo.Parada;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParadaRepositorio extends JpaRepository<Parada, Long> {

    List<Parada> findByNombreContainingIgnoreCase(String nombre);

    List<Parada> findByNombreContainingIgnoreCaseOrderByNombreAsc(String nombre);

    List<Parada> findByNombreContainingIgnoreCaseOrderByNombreAsc(
            String nombre,
            Pageable pageable
    );

    List<Parada> findByStopId(String stopId);

    List<Parada> findByLatBetweenAndLonBetween(
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon
    );

    List<Parada> findByLatBetweenAndLonBetweenOrderByNombreAsc(
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon,
            Pageable pageable
    );

    long countByLatBetweenAndLonBetween(
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon
    );

    List<Parada> findByNombreContainingIgnoreCaseAndLatBetweenAndLonBetweenOrderByNombreAsc(
            String nombre,
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon,
            Pageable pageable
    );

    long countByNombreContainingIgnoreCaseAndLatBetweenAndLonBetween(
            String nombre,
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon
    );
}
