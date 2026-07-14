package com.paradabus.controlador;

import com.paradabus.dto.NotificacionPushConfiguracionDTO;
import com.paradabus.dto.ProgramacionTrayectoPushDTO;
import com.paradabus.dto.ResultadoOperacionPushDTO;
import com.paradabus.dto.SuscripcionPushDTO;
import com.paradabus.servicio.NotificacionPushServicio;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notificaciones/push")
@RequiredArgsConstructor
public class NotificacionPushControlador {

    private final NotificacionPushServicio notificacionPushServicio;

    @GetMapping("/config")
    public NotificacionPushConfiguracionDTO obtenerConfiguracion() {
        return notificacionPushServicio.obtenerConfiguracion();
    }

    @PostMapping("/suscripciones")
    public ResultadoOperacionPushDTO registrarSuscripcion(
            @RequestBody SuscripcionPushDTO suscripcion
    ) {
        return notificacionPushServicio.registrarSuscripcion(suscripcion);
    }

    @DeleteMapping("/suscripciones")
    public ResultadoOperacionPushDTO eliminarSuscripcion(
            @RequestParam String endpoint
    ) {
        return notificacionPushServicio.eliminarSuscripcion(endpoint);
    }

    @PostMapping("/prueba")
    public ResultadoOperacionPushDTO enviarPrueba() {
        return notificacionPushServicio.enviarNotificacionPrueba();
    }

    @PostMapping("/trayectos")
    public ResultadoOperacionPushDTO programarTrayecto(
            @RequestBody ProgramacionTrayectoPushDTO programacion
    ) {
        return notificacionPushServicio.programarTrayecto(programacion);
    }

    @DeleteMapping("/trayectos/{trayectoId}")
    public ResultadoOperacionPushDTO cancelarTrayecto(
            @PathVariable String trayectoId
    ) {
        return notificacionPushServicio.cancelarTrayecto(trayectoId);
    }
}
