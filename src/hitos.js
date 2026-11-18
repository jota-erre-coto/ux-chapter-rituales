// Orquestador de hitos. Un disparador programado llama a ejecutarHitos() cada pocos
// minutos; el planificador decide qué toca y aquí se ejecuta y se anota.
//
// El disparador se instala ejecutando instalarDisparadores() desde el editor de Apps
// Script con la cuenta dueña de los hitos. Instalado desde la app de Chat sería un
// disparador de complemento y solo podría ejecutarse una vez por hora.

const MINUTOS_ENTRE_EJECUCIONES = 5;

// Hitos que ya saben ejecutarse. El resto se irán añadiendo en sus issues.
const MANEJADORES_HITO_ = {
  convocatoria(ritual, { sesion }) {
    publicarEnEspacio_(ritual.espacio, mensajeConvocatoria(ritual, sesion));
  },
  sinSesion(ritual, { lunes }) {
    publicarEnEspacio_(ritual.espacio, mensajeSinSesion(ritual, lunes));
  },
  propuesta(ritual, contexto) {
    lanzarPropuesta_(ritual, contexto);
  },
  confirmacion(ritual, contexto) {
    revisarConfirmacionPropuesta_(ritual, contexto);
  },
};

function ejecutarHitos() {
  Object.keys(RITUALES)
    .filter((clave) => RITUALES[clave].disparadorActivo)
    .forEach((clave) => {
      try {
        ejecutarHitosDelRitual_(clave, RITUALES[clave]);
      } catch (error) {
        console.error(`Error en los hitos de ${clave}: ${error.stack}`);
      }
    });
}

function ejecutarHitosDelRitual_(clave, ritual) {
  const ahoraLocal = Utilities.formatDate(new Date(), ritual.zonaHoraria, "yyyy-MM-dd'T'HH:mm");
  const lunes = lunesDe(ahoraLocal.slice(0, 10));
  const propiedades = PropertiesService.getScriptProperties();
  const claveEjecutados = `hitos:${clave}:${lunes}`;
  const ejecutados = JSON.parse(propiedades.getProperty(claveEjecutados) || '[]');

  const pendientes = hitosPendientes(ritual, ahoraLocal, sesionesDeLaSemana_(ritual, lunes), ejecutados)
    .filter((h) => MANEJADORES_HITO_[h.hito]);
  pendientes.forEach((h) => {
    MANEJADORES_HITO_[h.hito](ritual, { sesion: h.sesion, lunes });
    ejecutados.push(h.hito);
    propiedades.setProperty(claveEjecutados, JSON.stringify(ejecutados));
    console.log(`Hito ${h.hito} de ${clave} ejecutado (${h.momento}).`);
  });
}

// Lanza un hito a mano para la semana actual, como si fuera su hora. No lo anota como
// ejecutado, así que no impide que el disparador lo lance cuando toque.
// Para convocatoria, si esa semana no hay sesión, se lanza el aviso de semana sin sesión.
function lanzarHito_(ritual, hito) {
  const ahoraLocal = Utilities.formatDate(new Date(), ritual.zonaHoraria, "yyyy-MM-dd'T'HH:mm");
  const lunes = lunesDe(ahoraLocal.slice(0, 10));
  const sesion = sesionesDeLaSemana_(ritual, lunes).sort()[0] || null;
  if (!sesion && hito !== 'convocatoria' && hito !== HITO_SIN_SESION) {
    throw new Error('Esta semana no hay sesión en el calendario.');
  }
  const efectivo = hito === 'convocatoria' && !sesion ? HITO_SIN_SESION : hito;
  MANEJADORES_HITO_[efectivo](ritual, { sesion, lunes });
  return efectivo;
}

function hitosManuales_() {
  return Object.keys(MANEJADORES_HITO_);
}

// Ejecutar a mano desde el editor de Apps Script con la cuenta dueña de los hitos.
function instalarDisparadores() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'ejecutarHitos')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ejecutarHitos').timeBased().everyMinutes(MINUTOS_ENTRE_EJECUCIONES).create();
}
