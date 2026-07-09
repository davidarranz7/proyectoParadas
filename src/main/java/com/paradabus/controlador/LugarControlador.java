package com.paradabus.controlador;

import com.paradabus.dto.LugarDTO;
import com.paradabus.servicio.LugarServicio;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/lugares")
public class LugarControlador {

    private final LugarServicio lugarServicio;

    public LugarControlador(LugarServicio lugarServicio) {
        this.lugarServicio = lugarServicio;
    }

    @GetMapping("/buscar")
    public List<LugarDTO> buscarLugares(@RequestParam String texto) {
        return lugarServicio.buscarLugares(texto);
    }
}