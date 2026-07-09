package com.paradabus.dto;

import java.util.List;

public record RutaDirectaDTO(

        // Parada cercana desde donde el usuario debería coger el bus
        ParadaCercanaDTO paradaOrigen,

        // Parada relacionada con el destino buscado
        ParadaDTO paradaDestino,

        // Líneas que pasan por la parada origen y también por la parada destino
        List<String> lineasComunes,

        // Mejor opción encontrada:
        // el bus que sirve para el destino y llega antes
        OpcionBusDTO mejorOpcion,

        // Otras opciones posibles que también sirven para llegar
        List<OpcionBusDTO> alternativas,

        // Mensaje explicativo para mostrar en la app
        String mensaje
) {
}