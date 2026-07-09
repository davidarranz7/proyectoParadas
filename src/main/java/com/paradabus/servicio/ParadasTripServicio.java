package com.paradabus.servicio;

import com.paradabus.dto.ParadaIntermediaRutaDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParadasTripServicio {

    private final JdbcTemplate jdbcTemplate;

    public ParadasTripServicio(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ParadaIntermediaRutaDTO> obtenerParadasTrip(
            String tripId,
            String stopOrigen,
            String stopDestino
    ) {
        List<ParadaIntermediaRutaDTO> paradasTrip = buscarParadasCompletasDelTrip(tripId);

        if (stopOrigen == null || stopOrigen.isBlank() || stopDestino == null || stopDestino.isBlank()) {
            return paradasTrip;
        }

        int indiceOrigen = buscarIndicePorStopId(paradasTrip, stopOrigen);
        int indiceDestino = buscarIndicePorStopId(paradasTrip, stopDestino);

        if (indiceOrigen == -1 || indiceDestino == -1) {
            return paradasTrip;
        }

        int inicio = Math.min(indiceOrigen, indiceDestino);
        int fin = Math.max(indiceOrigen, indiceDestino);

        return paradasTrip
                .subList(inicio, fin + 1)
                .stream()
                .map(parada -> marcarTipoParada(parada, stopOrigen, stopDestino))
                .toList();
    }

    private List<ParadaIntermediaRutaDTO> buscarParadasCompletasDelTrip(String tripId) {
        String sql = """
                SELECT
                    st.stop_sequence,
                    st.stop_id,
                    st.arrival_time,
                    st.departure_time,
                    gs.stop_name,
                    gs.stop_lat,
                    gs.stop_lon,
                    p.id AS id_parada
                FROM gtfs_stop_times st
                JOIN gtfs_stops gs
                    ON gs.stop_id = st.stop_id
                LEFT JOIN paradas p
                    ON p.stop_id = st.stop_id
                WHERE st.trip_id = ?
                ORDER BY st.stop_sequence
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new ParadaIntermediaRutaDTO(
                        rs.getInt("stop_sequence"),
                        rs.getString("id_parada"),
                        rs.getString("stop_id"),
                        rs.getString("stop_name"),
                        rs.getDouble("stop_lat"),
                        rs.getDouble("stop_lon"),
                        rs.getString("arrival_time"),
                        rs.getString("departure_time"),
                        "INTERMEDIA"
                ),
                tripId
        );
    }

    private int buscarIndicePorStopId(List<ParadaIntermediaRutaDTO> paradas, String stopId) {
        for (int i = 0; i < paradas.size(); i++) {
            if (stopId.equals(paradas.get(i).stopId())) {
                return i;
            }
        }

        return -1;
    }

    private ParadaIntermediaRutaDTO marcarTipoParada(
            ParadaIntermediaRutaDTO parada,
            String stopOrigen,
            String stopDestino
    ) {
        String tipo = "INTERMEDIA";

        if (stopOrigen.equals(parada.stopId())) {
            tipo = "SUBIDA";
        }

        if (stopDestino.equals(parada.stopId())) {
            tipo = "BAJADA";
        }

        return new ParadaIntermediaRutaDTO(
                parada.orden(),
                parada.idParada(),
                parada.stopId(),
                parada.nombre(),
                parada.lat(),
                parada.lon(),
                parada.horaLlegada(),
                parada.horaSalida(),
                tipo
        );
    }
}