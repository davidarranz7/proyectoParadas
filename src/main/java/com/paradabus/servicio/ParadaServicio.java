package com.paradabus.servicio;

import com.paradabus.cliente.ClienteDatosVigo;
import com.paradabus.dto.ComparacionParadasDTO;
import com.paradabus.dto.ParadaCercanaDTO;
import com.paradabus.dto.ParadaDTO;
import com.paradabus.dto.ParadasMapaResultadoDTO;
import com.paradabus.modelo.Parada;
import com.paradabus.repositorio.ParadaRepositorio;
import com.paradabus.utilidad.DistanciaUtilidad;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ParadaServicio {

    private static final int ZOOM_MINIMO_MAPA = 14;
    private static final int LIMITE_BUSQUEDA_POR_DEFECTO = 10;

    private final ParadaRepositorio paradaRepositorio;
    private final ClienteDatosVigo clienteDatosVigo;

    public List<ParadaDTO> listarParadas() {
        return paradaRepositorio.findAll()
                .stream()
                .map(this::convertirADTO)
                .toList();
    }

    public List<ParadaDTO> buscarParadasPorNombre(String texto) {
        return buscarParadasPorNombre(texto, null);
    }

    public List<ParadaDTO> buscarParadasPorNombre(String texto, Integer limite) {
        String textoBuscar = texto == null ? "" : texto.trim();

        if (textoBuscar.isEmpty()) {
            return List.of();
        }

        List<Parada> paradas = limite == null
                ? paradaRepositorio.findByNombreContainingIgnoreCaseOrderByNombreAsc(textoBuscar)
                : paradaRepositorio.findByNombreContainingIgnoreCaseOrderByNombreAsc(
                textoBuscar,
                PageRequest.of(0, limitarNumero(limite, 1, 25, LIMITE_BUSQUEDA_POR_DEFECTO))
        );

        return paradas.stream()
                .map(this::convertirADTO)
                .toList();
    }

    public ParadaDTO buscarParadaPorId(Long id) {
        Parada parada = paradaRepositorio.findById(id)
                .orElseThrow(() -> new RuntimeException("No existe la parada con id: " + id));

        return convertirADTO(parada);
    }

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

    public List<ParadaCercanaDTO> buscarParadasCercanas(
            Double lat,
            Double lon,
            Double radioMetros
    ) {
        if (lat == null || lon == null) {
            throw new RuntimeException("La latitud y la longitud son obligatorias");
        }

        double radioFinal = radioMetros == null || radioMetros <= 0 ? 500.0 : radioMetros;
        double latDelta = radioFinal / 111_320d;
        double lonFactor = Math.max(0.2d, Math.cos(Math.toRadians(lat)));
        double lonDelta = radioFinal / (111_320d * lonFactor);

        return paradaRepositorio.findByLatBetweenAndLonBetween(
                        lat - latDelta,
                        lat + latDelta,
                        lon - lonDelta,
                        lon + lonDelta
                )
                .stream()
                .map(parada -> convertirAParadaCercanaDTO(parada, lat, lon))
                .filter(parada -> parada.distanciaMetros() <= radioFinal)
                .sorted(Comparator.comparing(ParadaCercanaDTO::distanciaMetros))
                .toList();
    }

    public ParadasMapaResultadoDTO buscarParadasParaMapa(
            Double minLat,
            Double maxLat,
            Double minLon,
            Double maxLon,
            String buscar,
            Integer limite
    ) {
        if (minLat == null || maxLat == null || minLon == null || maxLon == null) {
            throw new RuntimeException("Los limites del mapa son obligatorios");
        }

        int limiteFinal = limitarNumero(limite, 20, 260, 160);
        String textoBuscar = buscar == null ? "" : buscar.trim();
        boolean conBusqueda = !textoBuscar.isEmpty();

        long totalParadas = conBusqueda
                ? paradaRepositorio.countByNombreContainingIgnoreCaseAndLatBetweenAndLonBetween(
                textoBuscar,
                minLat,
                maxLat,
                minLon,
                maxLon
        )
                : paradaRepositorio.countByLatBetweenAndLonBetween(
                minLat,
                maxLat,
                minLon,
                maxLon
        );

        List<ParadaDTO> paradas = (conBusqueda
                ? paradaRepositorio.findByNombreContainingIgnoreCaseAndLatBetweenAndLonBetweenOrderByNombreAsc(
                textoBuscar,
                minLat,
                maxLat,
                minLon,
                maxLon,
                PageRequest.of(0, limiteFinal)
        )
                : paradaRepositorio.findByLatBetweenAndLonBetweenOrderByNombreAsc(
                minLat,
                maxLat,
                minLon,
                maxLon,
                PageRequest.of(0, limiteFinal)
        )).stream()
                .map(this::convertirADTO)
                .toList();

        return new ParadasMapaResultadoDTO(
                Math.toIntExact(totalParadas),
                paradas.size(),
                limiteFinal,
                ZOOM_MINIMO_MAPA,
                paradas
        );
    }

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

    private int limitarNumero(Integer valor, int minimo, int maximo, int valorPorDefecto) {
        if (valor == null) {
            return valorPorDefecto;
        }

        return Math.max(minimo, Math.min(maximo, valor));
    }
}
