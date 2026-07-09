package com.paradabus.repositorio;

import com.paradabus.modelo.Parada;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParadaRepositorio extends JpaRepository<Parada, Long> {

    // Buscar paradas por nombre, sin importar mayúsculas o minúsculas
    List<Parada> findByNombreContainingIgnoreCase(String nombre);

    // Buscar una parada por su stop_id
    List<Parada> findByStopId(String stopId);
}