package com.paradabus.servicio;

import com.paradabus.cliente.ClienteGtfs;
import com.paradabus.dto.GtfsArchivoDTO;
import com.paradabus.dto.GtfsVistaPreviaArchivoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GtfsServicio {

    private final ClienteGtfs clienteGtfs;

    // Devuelve la lista de archivos que trae dentro el ZIP GTFS
    public List<GtfsArchivoDTO> listarArchivosGtfs() {
        return clienteGtfs.listarArchivosGtfs();
    }

    // Devuelve la cabecera y las primeras líneas de un archivo GTFS concreto
    public GtfsVistaPreviaArchivoDTO obtenerVistaPreviaArchivo(
            String nombreArchivo,
            Integer limiteLineas
    ) {
        return clienteGtfs.obtenerVistaPreviaArchivo(nombreArchivo, limiteLineas);
    }
}