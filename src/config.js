// Configuración de cada ritual. Es el único sitio donde viven IDs, horarios y personas:
// el resto de la app recibe el ritual como dato y nunca los escribe a mano.
// El ritual de un mensaje se deduce de su espacio. En los mensajes privados se usa
// el ritual activo, que se cambia en la propiedad de script RITUAL_ACTIVO.

const RITUALES = {
  pruebas: {
    nombre: 'Design Review · pruebas',
    prefijoTema: 'DR',
    eventoSerieId: 'kq5ibejshdb8nj97ptje8pmmms',
    espacio: 'spaces/AAQAbRycugg',
    registroId: '1XTvS0RvsZTIJ3nZwLLQqJjqPXLA36V210tuDAOcL8DY',
    actaId: '15yXmm8psOeJC7r8fHZ6Ml_NGZ7GkssFsfltZTDcvCHo',
    organizador: 'jcoto@civitatis.com',
    suplente: 'fgimenez@civitatis.com',
    zonaHoraria: 'Europe/Madrid',
    duracionSesionMin: 60,
    // El disparador programado solo lanza hitos de los rituales con esto activo.
    disparadorActivo: true,
    // Permite lanzar hitos a mano con /hito. Solo en el ritual de pruebas.
    disparoManual: true,
    // Hitos de la semana de sesión: día (1 = lunes) y hora local.
    hitos: {
      convocatoria: { dia: 1, hora: '11:00' },
      propuesta: { dia: 1, hora: '13:00' },
      confirmacion: { dia: 2, hora: '11:00' },
      plazoSustitucion: { dia: 2, hora: '11:45' },
      anuncio: { dia: 2, hora: '12:00' },
      avisoSinNotas: { dia: 3, hora: '18:00' },
      plazoValidacion: { dia: 4, hora: '12:00' },
    },
  },
};

const RITUAL_POR_DEFECTO = 'pruebas';

// Implementación desplegada. Es a la vez la app de Chat y el servicio del registro
// (aplicación web que se ejecuta como su dueño, ver servicio.js).
const ID_IMPLEMENTACION = 'AKfycbzn9THSvpW3ezSdVXGcSyltIHalAJ5Zc7QqVJEoeKfZxGt_lShKgHlaAX84Q6xYh8jj';
const URL_SERVICIO_REGISTRO = `https://script.google.com/a/macros/civitatis.com/s/${ID_IMPLEMENTACION}/exec`;

// Cuenta de servicio que pone la voz de la app en los mensajes que envía por iniciativa propia.
const CUENTA_SERVICIO_APP = 'rituales-chat-app@ux-chapter-rituales.iam.gserviceaccount.com';

// Si el organizador está ausente, el suplente asume sus funciones. Hasta que el #9
// lo lea de su calendario, el organizador nunca se considera ausente.
function organizadorAusente_(ritual) {
  return false;
}

function claveDeRitual_(ritual) {
  return Object.keys(RITUALES).find((clave) => RITUALES[clave] === ritual);
}

function ritualActivo_() {
  const clave =
    PropertiesService.getScriptProperties().getProperty('RITUAL_ACTIVO') || RITUAL_POR_DEFECTO;
  return RITUALES[clave];
}

// Devuelve el ritual de un espacio, el activo si es un mensaje privado, o null si el
// espacio no tiene ningún ritual configurado.
function ritualDelEspacio_(espacio) {
  if (!espacio || espacio.type === 'DM' || espacio.spaceType === 'DIRECT_MESSAGE') {
    return ritualActivo_();
  }
  return Object.values(RITUALES).find((r) => r.espacio === espacio.name) || null;
}
