package com.paradabus.cliente;

import com.paradabus.dto.GtfsArchivoDTO;
import com.paradabus.dto.GtfsVistaPreviaArchivoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
@RequiredArgsConstructor
public class ClienteGtfs {

    private final RestClient.Builder restClientBuilder;

    @Value("${paradabus.fuentes.gtfs}")
    private String urlGtfs;

    // Descarga el ZIP GTFS y devuelve la lista de archivos que contiene
    public List<GtfsArchivoDTO> listarArchivosGtfs() {
        byte[] contenidoZip = descargarZipGtfs();

        return leerArchivosDelZip(contenidoZip);
    }

    // Devuelve la cabecera y las primeras líneas de un archivo concreto del ZIP GTFS
    public GtfsVistaPreviaArchivoDTO obtenerVistaPreviaArchivo(
            String nombreArchivo,
            Integer limiteLineas
    ) {
        if (nombreArchivo == null || nombreArchivo.trim().isEmpty()) {
            throw new RuntimeException("El nombre del archivo GTFS es obligatorio");
        }

        if (limiteLineas == null || limiteLineas <= 0) {
            limiteLineas = 5;
        }

        byte[] contenidoZip = descargarZipGtfs();

        return leerVistaPreviaArchivo(contenidoZip, nombreArchivo, limiteLineas);
    }

    // Lee todas las líneas de datos de un archivo GTFS concreto.
    // No devuelve la cabecera, solo las líneas reales de datos.
    // Ejemplo: leerLineasArchivo("stops.txt")
    public List<String> leerLineasArchivo(String nombreArchivo) {
        if (nombreArchivo == null || nombreArchivo.trim().isEmpty()) {
            throw new RuntimeException("El nombre del archivo GTFS es obligatorio");
        }

        byte[] contenidoZip = descargarZipGtfs();

        return leerArchivoCompleto(contenidoZip, nombreArchivo);
    }

    // Descarga el ZIP GTFS desde la URL configurada
    private byte[] descargarZipGtfs() {
        RestClient restClient = restClientBuilder.build();

        byte[] contenidoZip = restClient
                .get()
                .uri(urlGtfs)
                .retrieve()
                .body(byte[].class);

        if (contenidoZip == null || contenidoZip.length == 0) {
            throw new RuntimeException("No se pudo descargar el archivo GTFS");
        }

        return contenidoZip;
    }

    // Lee los nombres de los archivos dentro del ZIP
    private List<GtfsArchivoDTO> leerArchivosDelZip(byte[] contenidoZip) {
        List<GtfsArchivoDTO> archivos = new ArrayList<>();

        try (
                ByteArrayInputStream entradaBytes = new ByteArrayInputStream(contenidoZip);
                ZipInputStream zipInputStream = new ZipInputStream(entradaBytes)
        ) {
            ZipEntry entrada;

            while ((entrada = zipInputStream.getNextEntry()) != null) {
                if (!entrada.isDirectory()) {
                    long tamano = entrada.getSize();

                    archivos.add(new GtfsArchivoDTO(
                            entrada.getName(),
                            tamano >= 0 ? tamano : null
                    ));
                }

                zipInputStream.closeEntry();
            }

            return archivos;

        } catch (IOException error) {
            throw new UncheckedIOException("Error leyendo el ZIP GTFS", error);
        }
    }

    // Lee la cabecera y varias líneas de un archivo concreto dentro del ZIP
    private GtfsVistaPreviaArchivoDTO leerVistaPreviaArchivo(
            byte[] contenidoZip,
            String nombreArchivo,
            Integer limiteLineas
    ) {
        try (
                ByteArrayInputStream entradaBytes = new ByteArrayInputStream(contenidoZip);
                ZipInputStream zipInputStream = new ZipInputStream(entradaBytes)
        ) {
            ZipEntry entrada;

            while ((entrada = zipInputStream.getNextEntry()) != null) {
                if (!entrada.isDirectory() && entrada.getName().equalsIgnoreCase(nombreArchivo)) {
                    return leerLineasDeEntradaGtfs(zipInputStream, entrada.getName(), limiteLineas);
                }

                zipInputStream.closeEntry();
            }

            throw new RuntimeException("No existe el archivo dentro del GTFS: " + nombreArchivo);

        } catch (IOException error) {
            throw new UncheckedIOException("Error leyendo el archivo GTFS: " + nombreArchivo, error);
        }
    }

    // Lee la cabecera y las primeras líneas de datos
    private GtfsVistaPreviaArchivoDTO leerLineasDeEntradaGtfs(
            ZipInputStream zipInputStream,
            String nombreArchivo,
            Integer limiteLineas
    ) throws IOException {
        BufferedReader lector = new BufferedReader(
                new InputStreamReader(zipInputStream, StandardCharsets.UTF_8)
        );

        String cabecera = lector.readLine();

        List<String> lineas = new ArrayList<>();

        String linea;
        int contador = 0;

        while ((linea = lector.readLine()) != null && contador < limiteLineas) {
            lineas.add(linea);
            contador++;
        }

        return new GtfsVistaPreviaArchivoDTO(
                nombreArchivo,
                cabecera,
                lineas
        );
    }

    // Lee todas las líneas de datos de un archivo concreto dentro del ZIP
    private List<String> leerArchivoCompleto(
            byte[] contenidoZip,
            String nombreArchivo
    ) {
        try (
                ByteArrayInputStream entradaBytes = new ByteArrayInputStream(contenidoZip);
                ZipInputStream zipInputStream = new ZipInputStream(entradaBytes)
        ) {
            ZipEntry entrada;

            while ((entrada = zipInputStream.getNextEntry()) != null) {
                if (!entrada.isDirectory() && entrada.getName().equalsIgnoreCase(nombreArchivo)) {
                    return leerTodasLasLineasDeDatos(zipInputStream);
                }

                zipInputStream.closeEntry();
            }

            throw new RuntimeException("No existe el archivo dentro del GTFS: " + nombreArchivo);

        } catch (IOException error) {
            throw new UncheckedIOException("Error leyendo el archivo GTFS completo: " + nombreArchivo, error);
        }
    }

    // Lee todas las líneas excepto la cabecera
    private List<String> leerTodasLasLineasDeDatos(
            ZipInputStream zipInputStream
    ) throws IOException {
        BufferedReader lector = new BufferedReader(
                new InputStreamReader(zipInputStream, StandardCharsets.UTF_8)
        );

        // Saltamos la cabecera
        lector.readLine();

        List<String> lineas = new ArrayList<>();

        String linea;

        while ((linea = lector.readLine()) != null) {
            if (!linea.trim().isEmpty()) {
                lineas.add(linea);
            }
        }

        return lineas;
    }
}