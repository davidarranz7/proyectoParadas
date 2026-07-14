import {
  BusFront,
  Clock3,
  MapPinned,
  Route,
  Sparkles,
  Star
} from 'lucide-react';

const bloques = [
  {
    id: 'favoritas',
    titulo: 'Favoritas y recientes',
    descripcion: 'Zona preparada para anclar lineas frecuentes y abrirlas con un solo toque.',
    icono: Star
  },
  {
    id: 'recorrido',
    titulo: 'Recorrido y sentido',
    descripcion: 'Tarjetas grandes para mostrar cabecera, sentido y acceso rapido al mapa.',
    icono: Route
  },
  {
    id: 'tiempo-real',
    titulo: 'Tiempo de paso',
    descripcion: 'Hueco reservado para minutos por parada, incidencias y actualizacion visual.',
    icono: Clock3
  }
];

const vistas = [
  {
    nombre: 'Panel favorito',
    detalle: 'Lista compacta para ver lineas guardadas con tiempo real en el propio numero.'
  },
  {
    nombre: 'Vista por sentido',
    detalle: 'Bloques listos para ida, vuelta y cabeceras sin perder legibilidad en movil.'
  },
  {
    nombre: 'Mapa de recorrido',
    detalle: 'Entrada directa al mapa con paradas y seguimiento del trayecto.'
  }
];

function LineasPagina() {
  return (
    <section className="pagina-paneles">
      <header className="cabecera-panel-app">
        <div>
          <p className="pagina-inicio__mini">Lineas</p>
          <h1>La seccion de lineas ya tiene estructura de app de transporte.</h1>
          <p>
            Aqui he dejado una pantalla preparada para favoritos, sentidos,
            tiempo de paso y acceso directo al recorrido cuando conectes esta vista con datos reales.
          </p>
        </div>

        <div className="cabecera-panel-app__chips">
          <span className="chip-app chip-app--activo">Favoritas</span>
          <span className="chip-app">Recorridos</span>
          <span className="chip-app">Tiempo real</span>
        </div>
      </header>

      <div className="paneles-grid">
        <article className="tarjeta-panel-app tarjeta-panel-app--destacada">
          <div className="tarjeta-panel-app__encabezado">
            <div className="tarjeta-panel-app__icono">
              <BusFront size={20} />
            </div>

            <div>
              <p className="pagina-inicio__mini">Vista principal</p>
              <h2>Linea, sentido, tiempo y mapa en el mismo bloque.</h2>
            </div>
          </div>

          <p className="tarjeta-panel-app__texto">
            La idea aqui es que el usuario entre y vea sus lineas habituales como en una app moderna,
            con tarjetas grandes, botones claros y lectura instantanea en movil.
          </p>

          <div className="tarjeta-panel-app__pildoras">
            <span>Numero grande</span>
            <span>Cabecera visible</span>
            <span>Accion rapida</span>
          </div>
        </article>

        {bloques.map((bloque) => {
          const Icono = bloque.icono;

          return (
            <article key={bloque.id} className="tarjeta-panel-app">
              <div className="tarjeta-panel-app__icono">
                <Icono size={18} />
              </div>

              <h3>{bloque.titulo}</h3>
              <p>{bloque.descripcion}</p>
            </article>
          );
        })}
      </div>

      <section className="lista-demo-lineas">
        <div className="lista-demo-lineas__cabecera">
          <div>
            <p className="pagina-inicio__mini">Navegacion</p>
            <h2>Bloques que ya quedan preparados para tu backend</h2>
          </div>

          <div className="lista-demo-lineas__estado">
            <Sparkles size={15} />
            UI lista para crecer
          </div>
        </div>

        <div className="lista-demo-lineas__items">
          {vistas.map((vista) => (
            <article key={vista.nombre} className="item-demo-linea">
              <div className="item-demo-linea__icono">
                <MapPinned size={17} />
              </div>

              <div>
                <strong>{vista.nombre}</strong>
                <span>{vista.detalle}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default LineasPagina;
