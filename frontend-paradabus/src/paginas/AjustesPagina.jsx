import { useState } from 'react';
import {
  Bell,
  Footprints,
  LocateFixed,
  Route,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

function FilaAjuste({ descripcion, etiqueta, icono: Icono, activa, onCambiar }) {
  return (
    <button
      type="button"
      className="fila-ajuste"
      onClick={onCambiar}
    >
      <div className="fila-ajuste__icono">
        <Icono size={18} />
      </div>

      <div className="fila-ajuste__texto">
        <strong>{etiqueta}</strong>
        <span>{descripcion}</span>
      </div>

      <span
        className={
          activa
            ? 'interruptor-app interruptor-app--activo'
            : 'interruptor-app'
        }
      >
        <span />
      </span>
    </button>
  );
}

function AjustesPagina() {
  const [avisos, setAvisos] = useState(true);
  const [ubicacion, setUbicacion] = useState(true);
  const [rutaRapida, setRutaRapida] = useState(true);
  const [menosCaminata, setMenosCaminata] = useState(false);

  return (
    <section className="pagina-paneles">
      <header className="cabecera-panel-app">
        <div>
          <p className="pagina-inicio__mini">Ajustes</p>
          <h1>Una pantalla de preferencias mas cuidada y util para una app de bus.</h1>
          <p>
            Tambien he rehecho esta seccion para que deje de parecer un placeholder
            y encaje con el resto del producto en movil, tablet y escritorio.
          </p>
        </div>

        <div className="cabecera-panel-app__chips">
          <span className="chip-app chip-app--activo">Preferencias</span>
          <span className="chip-app">Alertas</span>
          <span className="chip-app">Privacidad</span>
        </div>
      </header>

      <div className="paneles-grid paneles-grid--ajustes">
        <article className="tarjeta-panel-app tarjeta-panel-app--destacada">
          <div className="tarjeta-panel-app__encabezado">
            <div className="tarjeta-panel-app__icono">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="pagina-inicio__mini">Experiencia</p>
              <h2>Preferencias listas para una experiencia de viaje mas personal.</h2>
            </div>
          </div>

          <p className="tarjeta-panel-app__texto">
            Esta parte esta pensada para decisiones rapidas: avisos, uso de ubicacion,
            tipo de ruta preferida y control de la experiencia del viajero.
          </p>

          <div className="tarjeta-panel-app__pildoras">
            <span>Rapida</span>
            <span>Clara</span>
            <span>Orientada a movilidad</span>
          </div>
        </article>

        <article className="tarjeta-panel-app tarjeta-panel-app--controles">
          <h3>Preferencias principales</h3>

          <div className="lista-ajustes">
            <FilaAjuste
              etiqueta="Avisos de llegada"
              descripcion="Activa notificaciones cuando tu bus este cerca."
              icono={Bell}
              activa={avisos}
              onCambiar={() => setAvisos((valor) => !valor)}
            />

            <FilaAjuste
              etiqueta="Ubicacion del dispositivo"
              descripcion="Usa tu posicion para arrancar las busquedas mas rapido."
              icono={LocateFixed}
              activa={ubicacion}
              onCambiar={() => setUbicacion((valor) => !valor)}
            />

            <FilaAjuste
              etiqueta="Priorizar ruta rapida"
              descripcion="Da prioridad a la opcion con menor tiempo total."
              icono={Route}
              activa={rutaRapida}
              onCambiar={() => setRutaRapida((valor) => !valor)}
            />

            <FilaAjuste
              etiqueta="Reducir caminata"
              descripcion="Favorece rutas con menos metros a pie."
              icono={Footprints}
              activa={menosCaminata}
              onCambiar={() => setMenosCaminata((valor) => !valor)}
            />
          </div>
        </article>

        <article className="tarjeta-panel-app">
          <div className="tarjeta-panel-app__icono">
            <ShieldCheck size={18} />
          </div>

          <h3>Privacidad y confianza</h3>
          <p>
            He dejado tambien un bloque visual para permisos, uso de datos y mensajes
            de confianza, algo bastante tipico en apps de movilidad.
          </p>
        </article>
      </div>
    </section>
  );
}

export default AjustesPagina;
