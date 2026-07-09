package com.paradabus.repositorio;

import com.paradabus.modelo.GtfsShape;
import com.paradabus.modelo.GtfsShapeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GtfsShapeRepositorio extends JpaRepository<GtfsShape, GtfsShapeId> {

    List<GtfsShape> findByIdShapeIdOrderByIdShapePtSequenceAsc(String shapeId);

    long countByIdShapeId(String shapeId);
}