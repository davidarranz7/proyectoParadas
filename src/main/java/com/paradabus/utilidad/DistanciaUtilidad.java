package com.paradabus.utilidad;

public final class DistanciaUtilidad {

    private static final double RADIO_TIERRA_METROS = 6371000;

    private DistanciaUtilidad() {
        // Constructor privado para que esta clase no se pueda instanciar
    }

    // Calcula la distancia en metros entre dos puntos usando latitud y longitud
    public static double calcularDistanciaMetros(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);

        double diferenciaLat = Math.toRadians(lat2 - lat1);
        double diferenciaLon = Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(diferenciaLat / 2) * Math.sin(diferenciaLat / 2)
                        +
                        Math.cos(lat1Rad) * Math.cos(lat2Rad)
                                *
                                Math.sin(diferenciaLon / 2) * Math.sin(diferenciaLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return RADIO_TIERRA_METROS * c;
    }
}