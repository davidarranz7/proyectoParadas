package com.paradabus.servicio;

import com.paradabus.dto.RutaBusquedaResultadoDTO;
import com.paradabus.dto.RutaDirectaOpcionDTO;
import com.paradabus.dto.RutaDirectaResultadoDTO;
import com.paradabus.dto.RutaTransbordoResultadoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RutaBusquedaServicio {

    private final RutaDirectaServicio rutaDirectaServicio;
    private final RutaTransbordoServicio rutaTransbordoServicio;

    @Value("${paradabus.rutas.busqueda.directas-minimas-antes-transbordo:3}")
    private Integer directasMinimasAntesTransbordo;

    @Value("${paradabus.rutas.busqueda.minutos-maximos-directa-rapida:34}")
    private Integer minutosMaximosDirectaRapida;

    @Value("${paradabus.rutas.busqueda.max-resultados-transbordo:4}")
    private Integer maxResultadosTransbordo;

    @Value("${paradabus.rutas.busqueda.consultar-transbordos-automaticamente:false}")
    private Boolean consultarTransbordosAutomaticamente;

    public RutaBusquedaResultadoDTO buscarRutas(
            Double origenLat,
            Double origenLon,
            Double destinoLat,
            Double destinoLon,
            String fecha,
            String hora,
            Integer maxResultados,
            Boolean forzarTransbordos
    ) {
        RutaDirectaResultadoDTO directas = rutaDirectaServicio.buscarRutasDirectas(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fecha,
                hora,
                maxResultados
        );

        boolean consultarTransbordos = debeConsultarTransbordos(directas, forzarTransbordos);

        RutaTransbordoResultadoDTO transbordos = consultarTransbordos
                ? rutaTransbordoServicio.buscarRutasConTransbordo(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                fecha,
                hora,
                maxResultadosTransbordo
        )
                : crearRespuestaTransbordosVacia(directas, "Transbordos omitidos para priorizar velocidad");

        int totalDirectas = directas.opciones() == null ? 0 : directas.opciones().size();
        int totalTransbordos = transbordos.opciones() == null ? 0 : transbordos.opciones().size();
        int totalOpciones = totalDirectas + totalTransbordos;

        return new RutaBusquedaResultadoDTO(
                origenLat,
                origenLon,
                destinoLat,
                destinoLon,
                directas.fecha(),
                directas.horaConsulta(),
                totalDirectas,
                totalTransbordos,
                totalOpciones,
                consultarTransbordos,
                construirMensaje(totalDirectas, totalTransbordos, consultarTransbordos),
                directas.opciones() == null ? List.of() : directas.opciones(),
                transbordos.opciones() == null ? List.of() : transbordos.opciones()
        );
    }

    private boolean debeConsultarTransbordos(
            RutaDirectaResultadoDTO directas,
            Boolean forzarTransbordos
    ) {
        if (Boolean.TRUE.equals(forzarTransbordos)) {
            return true;
        }

        if (!Boolean.TRUE.equals(consultarTransbordosAutomaticamente)) {
            return false;
        }

        List<RutaDirectaOpcionDTO> opciones = directas.opciones();

        if (opciones == null || opciones.isEmpty()) {
            return true;
        }

        if (opciones.size() < directasMinimasAntesTransbordo) {
            return true;
        }

        Integer mejorDirecta = opciones.stream()
                .map(RutaDirectaOpcionDTO::minutosTotal)
                .filter(valor -> valor != null && valor > 0)
                .min(Comparator.naturalOrder())
                .orElse(null);

        if (mejorDirecta == null) {
            return true;
        }

        return mejorDirecta > minutosMaximosDirectaRapida;
    }

    private RutaTransbordoResultadoDTO crearRespuestaTransbordosVacia(
            RutaDirectaResultadoDTO directas,
            String mensaje
    ) {
        return new RutaTransbordoResultadoDTO(
                directas.origenLat(),
                directas.origenLon(),
                directas.destinoLat(),
                directas.destinoLon(),
                directas.fecha(),
                directas.horaConsulta(),
                0,
                mensaje,
                List.of()
        );
    }

    private String construirMensaje(
            int totalDirectas,
            int totalTransbordos,
            boolean consultarTransbordos
    ) {
        if (!consultarTransbordos) {
            return totalDirectas > 0
                    ? "Mostrando primero las rutas directas para mantener la busqueda rapida"
                    : "No se encontraron directas; puedes cargar transbordos si hace falta";
        }

        if (totalDirectas == 0 && totalTransbordos == 0) {
            return "No se encontraron rutas para ese trayecto";
        }

        if (totalTransbordos > 0) {
            return "Busqueda completa con directas y transbordos";
        }

        return "Busqueda completada con rutas directas";
    }
}
