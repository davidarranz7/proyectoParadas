package com.paradabus.servicio;

import com.paradabus.cliente.ClienteDatosVigo;
import com.paradabus.dto.ComparacionParadasDTO;
import com.paradabus.dto.ParadaCercanaDTO;
import com.paradabus.dto.ParadaDTO;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.ParadaRepositorio;
import com.paradabus.utilidad.DistanciaUtilidad;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParadaServicio {

    private final ParadaRepositorio paradaRepositorio;
    private final ClienteDatosVigo clienteDatosVigo;

    // Devuelve todas las paradas
    public List<ParadaDTO> listarParadas() {
        return paradaRepositorio.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    // Busca paradas por nombre
    public List<ParadaDTO> buscarParadasPorNombre(String texto) {
        return paradaRepositorio.findByNombreContainingIgnoreCase(texto)
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    // Busca una parada por ID
    public ParadaDTO buscarParadaPorId(Long id) {
        Parada parada = paradaRepositorio.findById(id)
                .orElseThrow(() -> new RuntimeException("No existe la parada con id: " + id));

        return convertirADTO(parada);
    }

    // Compara dos paradas y devuelve las líneas que tienen en común
    public ComparacionParadasDTO compararParadas(Long idOrigen, Long idDestino) {
        Parada paradaOrigen = paradaRepositorio.findById(idOrigen)
                .orElseThrow(() -> new RuntimeException("No existe la parada origen con id: " + idOrigen));

        Parada paradaDestino = paradaRepositorio.findById(idDestino)
                .orElseThrow(() -> new RuntimeException("No existe la parada destino con id: " + idDestino));

        List<String> lineasOrigen = separarLineas(paradaOrigen.getLineasOriginal());
        List<String> lineasDestino = separarLineas(paradaDestino.getLineasOriginal());

        List<String> lineasComunes = lineasOrigen.stream()
                .filter(lineasDestino::contains)
                .distinct()
                .toList();

        return new ComparacionParadasDTO(
                convertirADTO(paradaOrigen),
                convertirADTO(paradaDestino),
                lineasComunes,
                !lineasComunes.isEmpty()
        );
    }

    // Busca paradas cercanas a una ubicación
    public List<ParadaCercanaDTO> buscarParadasCercanas(
            Double lat,
            Double lon,
            Double radioMetros
    ) {
        if (lat == null || lon == null) {
            throw new RuntimeException("La latitud y la longitud son obligatorias");
        }

        if (radioMetros == null || radioMetros <= 0) {
            radioMetros = 500.0;
        }

        final double radioFinal = radioMetros;

        return paradaRepositorio.findAll()
                .stream()
                .map(parada -> convertirAParadaCercanaDTO(parada, lat, lon))
                .filter(parada -> parada.distanciaMetros() <= radioFinal)
                .sorted(Comparator.comparing(ParadaCercanaDTO::distanciaMetros))
                .toList();
    }

    // Importa las paradas desde datos abiertos de Vigo y las guarda en base de datos
    @Transactional
    public int importarParadasDesdeDatosVigo() {
        List<ClienteDatosVigo.ParadaDatosVigo> paradasDatosVigo = clienteDatosVigo.obtenerParadas();

        if (paradasDatosVigo == null || paradasDatosVigo.isEmpty()) {
            return 0;
        }

        OffsetDateTime ahora = OffsetDateTime.now();

        List<Parada> paradas = paradasDatosVigo.stream()
                .map(paradaDatosVigo -> convertirDesdeDatosVigo(paradaDatosVigo, ahora))
                .toList();

        paradaRepositorio.saveAll(paradas);

        return paradas.size();
    }

    // Convierte una parada del JSON oficial en una entidad Parada
    private Parada convertirDesdeDatosVigo(
            ClienteDatosVigo.ParadaDatosVigo paradaDatosVigo,
            OffsetDateTime ahora
    ) {
        Parada parada = paradaRepositorio.findById(paradaDatosVigo.id())
                .orElseGet(() -> Parada.builder()
                        .id(paradaDatosVigo.id())
                        .fechaCreacion(ahora)
                        .build());

        parada.setStopId(paradaDatosVigo.stopId());
        parada.setNombre(paradaDatosVigo.nombre());
        parada.setLat(paradaDatosVigo.lat());
        parada.setLon(paradaDatosVigo.lon());
        parada.setLineasOriginal(paradaDatosVigo.lineas());
        parada.setFechaActualizacion(ahora);

        if (parada.getFechaCreacion() == null) {
            parada.setFechaCreacion(ahora);
        }

        return parada;
    }

    // Separa el texto de líneas.
    // Ejemplo: "C3d, A, 4A" -> ["C3d", "A", "4A"]
    private List<String> separarLineas(String lineasOriginal) {
        if (lineasOriginal == null || lineasOriginal.trim().isEmpty()) {
            return List.of();
        }

        return List.of(lineasOriginal.split(","))
                .stream()
                .map(String::trim)
                .filter(linea -> !linea.isEmpty())
                .distinct()
                .toList();
    }

    // Convierte una entidad Parada en ParadaDTO
    private ParadaDTO convertirADTO(Parada parada) {
        return new ParadaDTO(
                parada.getId(),
                parada.getStopId(),
                parada.getNombre(),
                parada.getLat(),
                parada.getLon(),
                parada.getLineasOriginal()
        );
    }

    // Convierte una parada en ParadaCercanaDTO añadiendo la distancia
    private ParadaCercanaDTO convertirAParadaCercanaDTO(
            Parada parada,
            Double latUsuario,
            Double lonUsuario
    ) {
        double distanciaMetros = DistanciaUtilidad.calcularDistanciaMetros(
                latUsuario,
                lonUsuario,
                parada.getLat(),
                parada.getLon()
        );

        return new ParadaCercanaDTO(
                parada.getId(),
                parada.getStopId(),
                parada.getNombre(),
                parada.getLat(),
                parada.getLon(),
                parada.getLineasOriginal(),
                distanciaMetros
        );
    }
}