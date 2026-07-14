package com.paradabus.servicio;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paradabus.dto.AvisoPushProgramadoDTO;
import com.paradabus.dto.NotificacionPushConfiguracionDTO;
import com.paradabus.dto.ProgramacionTrayectoPushDTO;
import com.paradabus.dto.ResultadoOperacionPushDTO;
import com.paradabus.dto.SuscripcionPushDTO;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Security;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ScheduledFuture;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class NotificacionPushServicio {

    private static final Logger LOGGER = Logger.getLogger(NotificacionPushServicio.class.getName());

    private final ObjectMapper objectMapper;
    private final TaskScheduler taskSchedulerParadabus;

    @Value("${paradabus.notificaciones.push.public-key:}")
    private String publicKeyConfigurada;

    @Value("${paradabus.notificaciones.push.private-key:}")
    private String privateKeyConfigurada;

    @Value("${paradabus.notificaciones.push.subject:mailto:paradabus@local.dev}")
    private String subjectConfigurado;

    private final ConcurrentMap<String, SuscripcionPushDTO> suscripciones = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, List<ScheduledFuture<?>>> avisosProgramadosPorTrayecto = new ConcurrentHashMap<>();

    private volatile ClavesVapid clavesVapid;

    @PostConstruct
    public void inicializar() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        this.clavesVapid = cargarClavesVapid();
    }

    public NotificacionPushConfiguracionDTO obtenerConfiguracion() {
        return new NotificacionPushConfiguracionDTO(
                true,
                clavesVapid.temporales(),
                clavesVapid.publicKey(),
                subjectConfigurado
        );
    }

    public ResultadoOperacionPushDTO registrarSuscripcion(SuscripcionPushDTO suscripcion) {
        validarSuscripcion(suscripcion);

        suscripciones.put(suscripcion.endpoint(), suscripcion);

        return new ResultadoOperacionPushDTO(
                true,
                "Suscripcion push guardada correctamente.",
                suscripciones.size(),
                0
        );
    }

    public ResultadoOperacionPushDTO eliminarSuscripcion(String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            suscripciones.remove(endpoint);
        }

        return new ResultadoOperacionPushDTO(
                true,
                "Suscripcion push eliminada.",
                suscripciones.size(),
                0
        );
    }

    public ResultadoOperacionPushDTO enviarNotificacionPrueba() {
        int enviadas = enviarNotificacionATodas(
                "Prueba de aviso push",
                "Tu bus llega pronto. Este aviso ya viene desde el backend y sirve para probar HTTPS/ngrok.",
                "paradabus-prueba-push",
                true,
                Map.of(
                        "prueba", true,
                        "url", "/"
                )
        );

        return new ResultadoOperacionPushDTO(
                true,
                "Prueba push enviada.",
                suscripciones.size(),
                enviadas
        );
    }

    public ResultadoOperacionPushDTO programarTrayecto(ProgramacionTrayectoPushDTO programacion) {
        if (programacion == null || programacion.trayectoId() == null || programacion.trayectoId().isBlank()) {
            throw new IllegalArgumentException("No se ha indicado el identificador del trayecto.");
        }

        cancelarTrayecto(programacion.trayectoId());

        List<AvisoPushProgramadoDTO> avisos = programacion.avisos() == null
                ? List.of()
                : programacion.avisos().stream()
                .filter(Objects::nonNull)
                .toList();

        List<ScheduledFuture<?>> tareas = new ArrayList<>();
        int totalAvisos = 0;
        Instant ahora = Instant.now();

        for (AvisoPushProgramadoDTO aviso : avisos) {
            Instant momentoAviso = parsearInstante(aviso.scheduledAt());

            if (momentoAviso == null) {
                continue;
            }

            if (!momentoAviso.isAfter(ahora.plusSeconds(5))) {
                enviarNotificacionATodas(
                        aviso.titulo(),
                        aviso.cuerpo(),
                        aviso.tag(),
                        Boolean.TRUE.equals(aviso.requireInteraction()),
                        aviso.data()
                );
                totalAvisos++;
                continue;
            }

            ScheduledFuture<?> tarea = taskSchedulerParadabus.schedule(
                    () -> enviarNotificacionATodas(
                            aviso.titulo(),
                            aviso.cuerpo(),
                            aviso.tag(),
                            Boolean.TRUE.equals(aviso.requireInteraction()),
                            aviso.data()
                    ),
                    momentoAviso
            );

            if (tarea != null) {
                tareas.add(tarea);
                totalAvisos++;
            }
        }

        if (!tareas.isEmpty()) {
            avisosProgramadosPorTrayecto.put(programacion.trayectoId(), tareas);
        }

        return new ResultadoOperacionPushDTO(
                true,
                "Avisos push del trayecto programados.",
                suscripciones.size(),
                totalAvisos
        );
    }

    public ResultadoOperacionPushDTO cancelarTrayecto(String trayectoId) {
        List<ScheduledFuture<?>> tareas = avisosProgramadosPorTrayecto.remove(trayectoId);

        if (tareas != null) {
            tareas.forEach((tarea) -> tarea.cancel(false));
        }

        return new ResultadoOperacionPushDTO(
                true,
                "Avisos push del trayecto cancelados.",
                suscripciones.size(),
                tareas == null ? 0 : tareas.size()
        );
    }

    private int enviarNotificacionATodas(
            String titulo,
            String cuerpo,
            String tag,
            boolean requireInteraction,
            Map<String, Object> data
    ) {
        if (suscripciones.isEmpty()) {
            return 0;
        }

        String payload = construirPayloadPush(
                titulo,
                cuerpo,
                tag,
                requireInteraction,
                data
        );

        int enviadas = 0;
        PushService pushService = crearPushService();

        for (SuscripcionPushDTO suscripcion : new ArrayList<>(suscripciones.values())) {
            try {
                Notification notification = new Notification(
                        suscripcion.endpoint(),
                        suscripcion.keys().p256dh(),
                        suscripcion.keys().auth(),
                        payload.getBytes(StandardCharsets.UTF_8)
                );

                HttpResponse respuesta = pushService.send(notification);
                int status = respuesta.getStatusLine().getStatusCode();

                if (status == 404 || status == 410) {
                    suscripciones.remove(suscripcion.endpoint());
                    continue;
                }

                if (status >= 200 && status < 300) {
                    enviadas++;
                }
            } catch (Exception ex) {
                LOGGER.log(Level.WARNING, "No se pudo enviar una notificacion push.", ex);
            }
        }

        return enviadas;
    }

    private String construirPayloadPush(
            String titulo,
            String cuerpo,
            String tag,
            boolean requireInteraction,
            Map<String, Object> data
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        Map<String, Object> dataNotificacion = new LinkedHashMap<>();

        if (data != null) {
            dataNotificacion.putAll(data);
        }

        dataNotificacion.putIfAbsent("url", "/");

        payload.put("titulo", titulo == null || titulo.isBlank() ? "ParadaBus" : titulo);
        payload.put("cuerpo", cuerpo == null || cuerpo.isBlank() ? "Tienes una alerta de trayecto." : cuerpo);
        payload.put("tag", tag == null || tag.isBlank() ? "paradabus-trayecto" : tag);
        payload.put("requireInteraction", requireInteraction);
        payload.put("renotify", true);
        payload.put("data", dataNotificacion);
        payload.put(
                "actions",
                List.of(
                        Map.of("action", "abrir-trayecto", "title", "Abrir trayecto"),
                        Map.of("action", "finalizar-trayecto", "title", "Finalizar")
                )
        );

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo generar el payload push.", ex);
        }
    }

    private PushService crearPushService() {
        try {
            return new PushService(
                    clavesVapid.publicKey(),
                    clavesVapid.privateKey(),
                    subjectConfigurado
            );
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("No se pudo crear el servicio push.", ex);
        }
    }

    private void validarSuscripcion(SuscripcionPushDTO suscripcion) {
        if (suscripcion == null || suscripcion.endpoint() == null || suscripcion.endpoint().isBlank()) {
            throw new IllegalArgumentException("La suscripcion push no incluye endpoint.");
        }

        if (suscripcion.keys() == null
                || suscripcion.keys().p256dh() == null
                || suscripcion.keys().p256dh().isBlank()
                || suscripcion.keys().auth() == null
                || suscripcion.keys().auth().isBlank()) {
            throw new IllegalArgumentException("La suscripcion push no incluye claves validas.");
        }
    }

    private ClavesVapid cargarClavesVapid() {
        if (!publicKeyConfigurada.isBlank() && !privateKeyConfigurada.isBlank()) {
            return new ClavesVapid(
                    publicKeyConfigurada.trim(),
                    privateKeyConfigurada.trim(),
                    false
            );
        }

        try {
            KeyPairGenerator generador = KeyPairGenerator.getInstance("EC");
            generador.initialize(new ECGenParameterSpec("secp256r1"));
            KeyPair keyPair = generador.generateKeyPair();

            return new ClavesVapid(
                    codificarPublicKey((ECPublicKey) keyPair.getPublic()),
                    codificarPrivateKey((ECPrivateKey) keyPair.getPrivate()),
                    true
            );
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudieron generar claves VAPID temporales.", ex);
        }
    }

    private Instant parsearInstante(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }

        try {
            return Instant.parse(texto);
        } catch (Exception ex) {
            LOGGER.log(Level.WARNING, "No se pudo parsear el instante de un aviso push: " + texto, ex);
            return null;
        }
    }

    private String codificarPublicKey(ECPublicKey publicKey) {
        byte[] x = ajustarATreintaYDosBytes(publicKey.getW().getAffineX().toByteArray());
        byte[] y = ajustarATreintaYDosBytes(publicKey.getW().getAffineY().toByteArray());
        byte[] resultado = new byte[65];

        resultado[0] = 0x04;
        System.arraycopy(x, 0, resultado, 1, x.length);
        System.arraycopy(y, 0, resultado, 33, y.length);

        return Base64.getUrlEncoder().withoutPadding().encodeToString(resultado);
    }

    private String codificarPrivateKey(ECPrivateKey privateKey) {
        byte[] valor = ajustarATreintaYDosBytes(privateKey.getS().toByteArray());

        return Base64.getUrlEncoder().withoutPadding().encodeToString(valor);
    }

    private byte[] ajustarATreintaYDosBytes(byte[] valorOriginal) {
        byte[] ajustado = new byte[32];
        int longitud = Math.min(valorOriginal.length, 32);

        System.arraycopy(
                valorOriginal,
                valorOriginal.length - longitud,
                ajustado,
                ajustado.length - longitud,
                longitud
        );

        return ajustado;
    }

    private record ClavesVapid(
            String publicKey,
            String privateKey,
            boolean temporales
    ) {
    }
}
