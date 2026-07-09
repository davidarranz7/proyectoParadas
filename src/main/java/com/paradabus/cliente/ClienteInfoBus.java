package com.paradabus.cliente;

import com.paradabus.dto.InfoBusParadaDTO;
import com.paradabus.dto.ProximoBusDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ClienteInfoBus {

    private static final int TIMEOUT_SEGUNDOS = 8;
    private static final int MAXIMO_PAGINAS_SEGURIDAD = 20;

    private final String urlBaseInfoBus;
    private final HttpClient httpClient;

    public ClienteInfoBus(
            @Value("${paradabus.fuentes.infobus}") String urlBaseInfoBus
    ) {
        this.urlBaseInfoBus = urlBaseInfoBus;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT_SEGUNDOS))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public InfoBusParadaDTO obtenerInfoBusParada(Long paradaId) {
        if (paradaId == null) {
            throw new RuntimeException("El id de parada es obligatorio");
        }

        String url = urlBaseInfoBus + paradaId;

        try {
            String htmlPaginaInicial = hacerGet(url);

            String codigoParada = extraerCodigoParada(htmlPaginaInicial, paradaId);
            String hora = extraerHora(htmlPaginaInicial);
            String nombreParada = extraerNombreParada(htmlPaginaInicial);

            List<ProximoBusDTO> buses = new ArrayList<>();

            // Página 1
            buses.addAll(extraerBusesDeHtml(htmlPaginaInicial));

            // Campos ocultos de ASP.NET WebForms
            Map<String, String> camposOcultos = extraerCamposOcultos(htmlPaginaInicial);

            // Páginas disponibles: Page$2, Page$3...
            List<Integer> paginas = extraerPaginasDisponibles(htmlPaginaInicial);

            for (Integer pagina : paginas) {
                if (pagina == null || pagina <= 1) {
                    continue;
                }

                String htmlPagina = hacerPostPagina(url, camposOcultos, pagina);

                buses.addAll(extraerBusesDeHtml(htmlPagina));

                // Actualizamos los campos ocultos por si ASP.NET cambia VIEWSTATE/EVENTVALIDATION.
                Map<String, String> nuevosCamposOcultos = extraerCamposOcultos(htmlPagina);
                if (!nuevosCamposOcultos.isEmpty()) {
                    camposOcultos = nuevosCamposOcultos;
                }
            }

            List<ProximoBusDTO> busesOrdenados = ordenarYEliminarDuplicados(buses);

            return new InfoBusParadaDTO(
                    paradaId,
                    codigoParada,
                    hora,
                    nombreParada,
                    busesOrdenados
            );

        } catch (Exception e) {
            throw new RuntimeException("No se pudo consultar InfoBus para la parada " + paradaId, e);
        }
    }

    private String hacerGet(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(TIMEOUT_SEGUNDOS))
                .header("User-Agent", "Mozilla/5.0")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("InfoBus respondió con estado HTTP " + response.statusCode());
        }

        return response.body();
    }

    private String hacerPostPagina(
            String url,
            Map<String, String> camposOcultos,
            Integer pagina
    ) throws Exception {
        Map<String, String> datos = new LinkedHashMap<>(camposOcultos);

        datos.put("__EVENTTARGET", "GridView1");
        datos.put("__EVENTARGUMENT", "Page$" + pagina);

        String cuerpo = codificarFormulario(datos);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(TIMEOUT_SEGUNDOS))
                .header("User-Agent", "Mozilla/5.0")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Referer", url)
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo))
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("InfoBus respondió con estado HTTP " + response.statusCode());
        }

        return response.body();
    }

    private String codificarFormulario(Map<String, String> datos) {
        StringBuilder resultado = new StringBuilder();

        for (Map.Entry<String, String> entrada : datos.entrySet()) {
            if (resultado.length() > 0) {
                resultado.append("&");
            }

            resultado.append(URLEncoder.encode(entrada.getKey(), StandardCharsets.UTF_8));
            resultado.append("=");
            resultado.append(URLEncoder.encode(
                    entrada.getValue() == null ? "" : entrada.getValue(),
                    StandardCharsets.UTF_8
            ));
        }

        return resultado.toString();
    }

    private Map<String, String> extraerCamposOcultos(String html) {
        Map<String, String> campos = new LinkedHashMap<>();

        Pattern patronInput = Pattern.compile(
                "<input\\b[^>]*>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcher = patronInput.matcher(html);

        while (matcher.find()) {
            String etiquetaInput = matcher.group();

            String type = obtenerAtributo(etiquetaInput, "type");
            String name = obtenerAtributo(etiquetaInput, "name");
            String value = obtenerAtributo(etiquetaInput, "value");

            if (type == null || name == null) {
                continue;
            }

            if (!"hidden".equalsIgnoreCase(type)) {
                continue;
            }

            campos.put(name, value == null ? "" : decodificarEntidadesBasicas(value));
        }

        return campos;
    }

    private String obtenerAtributo(String etiqueta, String nombreAtributo) {
        Pattern patron = Pattern.compile(
                Pattern.quote(nombreAtributo) + "\\s*=\\s*([\"'])(.*?)\\1",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcher = patron.matcher(etiqueta);

        if (!matcher.find()) {
            return null;
        }

        return matcher.group(2);
    }

    private List<Integer> extraerPaginasDisponibles(String html) {
        int paginaMaxima = 1;

        Pattern patronPagina = Pattern.compile(
                "Page\\$(\\d+)",
                Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = patronPagina.matcher(html);

        while (matcher.find()) {
            Integer pagina = convertirInteger(matcher.group(1));

            if (pagina != null && pagina > paginaMaxima) {
                paginaMaxima = pagina;
            }
        }

        paginaMaxima = Math.min(paginaMaxima, MAXIMO_PAGINAS_SEGURIDAD);

        List<Integer> paginas = new ArrayList<>();

        for (int i = 1; i <= paginaMaxima; i++) {
            paginas.add(i);
        }

        return paginas;
    }

    private List<ProximoBusDTO> extraerBusesDeHtml(String html) {
        List<ProximoBusDTO> buses = new ArrayList<>();

        String tablaHtml = extraerHtmlTablaPrincipal(html);

        if (tablaHtml == null || tablaHtml.isBlank()) {
            return buses;
        }

        Pattern patronFila = Pattern.compile(
                "<tr\\b[^>]*>(.*?)</tr>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcherFila = patronFila.matcher(tablaHtml);

        while (matcherFila.find()) {
            String filaHtml = matcherFila.group(1);

            List<String> celdas = extraerCeldasDeFila(filaHtml);

            if (celdas.size() != 3) {
                continue;
            }

            String linea = limpiarTexto(celdas.get(0));
            String ruta = limpiarTexto(celdas.get(1));
            String minutosTexto = limpiarTexto(celdas.get(2));

            if (esCabecera(linea, ruta, minutosTexto)) {
                continue;
            }

            if (!esLineaBusValida(linea)) {
                continue;
            }

            if (!tieneTextoReal(ruta)) {
                continue;
            }

            Integer minutos = convertirMinutos(minutosTexto);

            if (minutos == null) {
                continue;
            }

            buses.add(new ProximoBusDTO(
                    linea,
                    ruta,
                    minutos
            ));
        }

        return buses;
    }

    private String extraerHtmlTablaPrincipal(String html) {
        Pattern patronTablaGridView = Pattern.compile(
                "<table\\b(?=[^>]*\\bid\\s*=\\s*['\"]GridView1['\"])[^>]*>(.*?)</table>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcherGridView = patronTablaGridView.matcher(html);

        if (matcherGridView.find()) {
            return matcherGridView.group(1);
        }

        Pattern patronPrimeraTabla = Pattern.compile(
                "<table\\b[^>]*>(.*?)</table>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcherPrimeraTabla = patronPrimeraTabla.matcher(html);

        if (matcherPrimeraTabla.find()) {
            return matcherPrimeraTabla.group(1);
        }

        return null;
    }

    private List<String> extraerCeldasDeFila(String filaHtml) {
        List<String> celdas = new ArrayList<>();

        Pattern patronCelda = Pattern.compile(
                "<t[dh]\\b[^>]*>(.*?)</t[dh]>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL
        );

        Matcher matcherCelda = patronCelda.matcher(filaHtml);

        while (matcherCelda.find()) {
            celdas.add(limpiarTexto(matcherCelda.group(1)));
        }

        return celdas;
    }

    private boolean esCabecera(String linea, String ruta, String minutos) {
        return "L.".equalsIgnoreCase(linea)
                || "L".equalsIgnoreCase(linea)
                || "RUTA".equalsIgnoreCase(ruta)
                || "MIN.".equalsIgnoreCase(minutos)
                || "MIN".equalsIgnoreCase(minutos);
    }

    private boolean esLineaBusValida(String linea) {
        if (linea == null || linea.isBlank()) {
            return false;
        }

        String valor = linea.trim().replaceAll("\\s+", " ");

        return valor.matches("(?i)^(?:\\d{1,2}[A-Z]?|C\\d+[A-Z]?|N\\d+|H\\d*|PSA\\s*\\d+|PTL|TUR|A)$");
    }

    private boolean tieneTextoReal(String texto) {
        if (texto == null || texto.isBlank()) {
            return false;
        }

        return texto.matches(".*\\p{L}.*");
    }

    private Integer convertirMinutos(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        String soloNumeros = texto.replaceAll("[^0-9]", "");

        if (soloNumeros.isBlank()) {
            return null;
        }

        return convertirInteger(soloNumeros);
    }

    private Integer convertirInteger(String texto) {
        try {
            return Integer.parseInt(texto);
        } catch (Exception e) {
            return null;
        }
    }

    private List<ProximoBusDTO> ordenarYEliminarDuplicados(List<ProximoBusDTO> buses) {
        Map<String, ProximoBusDTO> busesUnicos = new LinkedHashMap<>();

        for (ProximoBusDTO bus : buses) {
            if (bus == null) {
                continue;
            }

            String clave = bus.linea() + "|" + bus.ruta() + "|" + bus.minutos();

            busesUnicos.putIfAbsent(clave, bus);
        }

        List<ProximoBusDTO> resultado = new ArrayList<>(busesUnicos.values());

        resultado.sort(Comparator.comparing(
                ProximoBusDTO::minutos,
                Comparator.nullsLast(Integer::compareTo)
        ));

        return resultado;
    }

    private String extraerCodigoParada(String html, Long paradaId) {
        String texto = extraerTextoVisible(html);

        Pattern patronCodigo = Pattern.compile(
                "(?:Parada|Código|Codigo)\\s*:?\\s*(\\d+)",
                Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = patronCodigo.matcher(texto);

        if (matcher.find()) {
            return matcher.group(1);
        }

        return String.valueOf(paradaId);
    }

    private String extraerHora(String html) {
        String texto = extraerTextoVisible(html);

        Pattern patronHora = Pattern.compile(
                "Hora\\s*:?\\s*(\\d{1,2}:\\d{2})",
                Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = patronHora.matcher(texto);

        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    private String extraerNombreParada(String html) {
        String htmlSinTabla = html;

        int posicionTabla = html.toLowerCase().indexOf("<table");

        if (posicionTabla > 0) {
            htmlSinTabla = html.substring(0, posicionTabla);
        }

        List<String> lineas = extraerLineasTexto(htmlSinTabla);

        for (String linea : lineas) {
            String texto = limpiarTexto(linea);

            if (texto.isBlank()) {
                continue;
            }

            if (texto.matches("^\\d+$")) {
                continue;
            }

            if (texto.toLowerCase().startsWith("hora")) {
                continue;
            }

            if (pareceNombreDeParada(texto)) {
                return texto;
            }
        }

        return null;
    }

    private boolean pareceNombreDeParada(String texto) {
        if (texto == null || texto.isBlank()) {
            return false;
        }

        String valor = texto.toLowerCase();

        return valor.contains("rúa")
                || valor.contains("rua")
                || valor.contains("avenida")
                || valor.contains("avda")
                || valor.contains("praza")
                || valor.contains("calle")
                || valor.contains("camiño")
                || valor.contains("camino")
                || valor.contains("estrada")
                || valor.contains("travesía")
                || valor.contains("travesia")
                || valor.contains("hospital")
                || valor.contains("estación")
                || valor.contains("estacion");
    }

    private String extraerTextoVisible(String html) {
        return String.join(" ", extraerLineasTexto(html));
    }

    private List<String> extraerLineasTexto(String html) {
        if (html == null || html.isBlank()) {
            return List.of();
        }

        String limpio = html;

        limpio = limpio.replaceAll("(?is)<script\\b[^>]*>.*?</script>", " ");
        limpio = limpio.replaceAll("(?is)<style\\b[^>]*>.*?</style>", " ");
        limpio = limpio.replaceAll("(?is)<!--.*?-->", " ");

        limpio = limpio.replaceAll("(?is)</?(tr|td|th|div|p|br|span|label|h1|h2|h3|table)\\b[^>]*>", "\n");
        limpio = limpio.replaceAll("(?is)<[^>]+>", " ");

        limpio = decodificarEntidadesBasicas(limpio);
        limpio = limpio.replace('\u00A0', ' ');

        String[] partes = limpio.split("\\R+");

        List<String> lineas = new ArrayList<>();

        for (String parte : partes) {
            String linea = limpiarTexto(parte);

            if (!linea.isBlank()) {
                lineas.add(linea);
            }
        }

        return lineas;
    }

    private String limpiarTexto(String texto) {
        if (texto == null) {
            return "";
        }

        String limpio = texto;

        limpio = limpio.replaceAll("(?is)<script\\b[^>]*>.*?</script>", " ");
        limpio = limpio.replaceAll("(?is)<style\\b[^>]*>.*?</style>", " ");
        limpio = limpio.replaceAll("(?is)<[^>]+>", " ");

        limpio = decodificarEntidadesBasicas(limpio);
        limpio = limpio.replace('\u00A0', ' ');
        limpio = limpio.replaceAll("\\s+", " ");

        return limpio.trim();
    }

    private String decodificarEntidadesBasicas(String texto) {
        if (texto == null) {
            return "";
        }

        String resultado = texto;

        resultado = resultado.replace("&nbsp;", " ");
        resultado = resultado.replace("&amp;", "&");
        resultado = resultado.replace("&quot;", "\"");
        resultado = resultado.replace("&apos;", "'");
        resultado = resultado.replace("&#39;", "'");
        resultado = resultado.replace("&lt;", "<");
        resultado = resultado.replace("&gt;", ">");

        resultado = decodificarEntidadesNumericasDecimales(resultado);
        resultado = decodificarEntidadesNumericasHexadecimales(resultado);

        return resultado;
    }

    private String decodificarEntidadesNumericasDecimales(String texto) {
        Pattern patron = Pattern.compile("&#(\\d+);");
        Matcher matcher = patron.matcher(texto);

        StringBuffer resultado = new StringBuffer();

        while (matcher.find()) {
            try {
                int codigo = Integer.parseInt(matcher.group(1));
                matcher.appendReplacement(resultado, Matcher.quoteReplacement(String.valueOf((char) codigo)));
            } catch (Exception e) {
                matcher.appendReplacement(resultado, Matcher.quoteReplacement(matcher.group()));
            }
        }

        matcher.appendTail(resultado);

        return resultado.toString();
    }

    private String decodificarEntidadesNumericasHexadecimales(String texto) {
        Pattern patron = Pattern.compile("&#x([0-9a-fA-F]+);");
        Matcher matcher = patron.matcher(texto);

        StringBuffer resultado = new StringBuffer();

        while (matcher.find()) {
            try {
                int codigo = Integer.parseInt(matcher.group(1), 16);
                matcher.appendReplacement(resultado, Matcher.quoteReplacement(String.valueOf((char) codigo)));
            } catch (Exception e) {
                matcher.appendReplacement(resultado, Matcher.quoteReplacement(matcher.group()));
            }
        }

        matcher.appendTail(resultado);

        return resultado.toString();
    }
}