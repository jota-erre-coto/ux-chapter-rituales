// Servicio del registro. El mismo script, desplegado también como aplicación web que
// se ejecuta con la cuenta de su dueño: así el registro solo lo escribe esa cuenta y
// los miembros del Chapter pueden ser lectores.
//
// El servicio identifica a quien llama con su propia sesión y vuelve a aplicar todas
// las reglas del ciclo de vida: no se fía de lo que haya decidido el diálogo.

// Lado servidor: punto de entrada de la aplicación web.
function doPost(e) {
  let resultado;
  try {
    const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
    resultado = ejecutarOperacion_(email, JSON.parse(e.postData.contents));
  } catch (error) {
    console.error(`Error en el servicio del registro: ${error.stack}`);
    resultado = fallo_('servicio', 'No se ha podido completar la acción en el registro de temas. Inténtalo de nuevo en un momento.');
  }
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ejecutarOperacion_(email, peticion) {
  const ritual = RITUALES[peticion.ritual];
  const operacion = OPERACIONES_SERVICIO_[peticion.accion];
  if (!email) return fallo_('actor', 'No se ha podido identificar a quien hace la petición.');
  if (!ritual) return fallo_('ritual', 'Ese ritual no existe.');
  if (!operacion) return fallo_('accion', 'Esa acción no existe.');
  return operacion(ritual, { email, nombre: peticion.nombre }, peticion);
}

const OPERACIONES_SERVICIO_ = {
  crear(ritual, actor, { valores }) {
    const fechaAlta = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
    // La ausencia solo importa si quien crea es el suplente; para el resto no se lee.
    const ausente = actor.email === ritual.suplente && organizadorAusente_(ritual, { directo: true });
    const permitida = puedeAsignar(actor, ritual, ausente);
    const miembros = permitida ? miembrosDelEspacio_(ritual.espacio) : [];
    const resultado = crearTema(valores, actor, fechaAlta, {
      permitida,
      miembros: miembros.map((p) => p.email),
    });
    if (!resultado.ok) return resultado;

    const tema = guardarTemaNuevo_(ritual, resultado.tema);
    if (!tema.asignado) return { ok: true, tema };
    const destinatario = miembros.find((p) => p.email === tema.responsable);
    const avisado =
      Boolean(destinatario && destinatario.id) &&
      Boolean(enviarPrivado_(destinatario.id, { text: textoAvisoAsignacion(tema, actor.nombre || actor.email) }));
    return { ok: true, tema, avisado };
  },

  editar(ritual, actor, { id, valores }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    const resultado = editarTema(tema, valores, actor);
    if (resultado.ok) actualizarTema_(ritual, resultado.tema);
    return resultado;
  },

  // Pasa a seleccionado todos los temas de una propuesta confirmada. Comprueba todos
  // antes de escribir ninguno, para no dejar la selección a medias.
  seleccionar(ritual, actor, { ids }) {
    const temas = leerTemas_(ritual);
    const resultados = ids.map((id) => {
      const tema = temas.find((t) => t.id === id);
      return tema ? seleccionarTema(tema, actor, ritual) : fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    });
    const fallidos = resultados.filter((r) => !r.ok);
    if (fallidos.length) {
      return { ok: false, errores: Object.assign({}, ...fallidos.map((r) => r.errores)) };
    }
    resultados.forEach((r) => actualizarTema_(ritual, r.tema));
    return { ok: true, temas: resultados.map((r) => r.tema) };
  },

  // «Lo llevo»: completa contexto y enlace si llegan, registra la confirmación y deja
  // la petición sin botones. Va por el servicio porque solo su dueño habla como la app.
  confirmar(ritual, actor, { lunes, id, contexto, enlace }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    const completado = completarTema(tema, { contexto, enlace }, actor);
    if (!completado.ok) return completado;
    const error = responderRonda_(ritual, lunes, id, CONFIRMACION.confirmado);
    if (error) return fallo_('id', error);
    if (contexto || enlace) {
      try {
        actualizarTema_(ritual, completado.tema);
      } catch (e) {
        deshacerRespuesta_(ritual, lunes, id);
        throw e;
      }
    }
    cerrarPeticion_(ritual, lunes, completado.tema, CONFIRMACION.confirmado);
    return { ok: true, tema: completado.tema };
  },

  // «No puedo»: registra la respuesta, devuelve el tema al backlog y ofrece sustituto.
  noPuedo(ritual, actor, { lunes, id }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    if (tema.responsable !== actor.email) return fallo_('actor', 'Solo su responsable puede responder por este tema.');
    const liberado = liberarTema(tema, actor, ritual);
    if (!liberado.ok) return liberado;
    const error = responderRonda_(ritual, lunes, id, CONFIRMACION.noPuede);
    if (error) return fallo_('id', error);
    try {
      actualizarTema_(ritual, liberado.tema);
    } catch (e) {
      deshacerRespuesta_(ritual, lunes, id);
      throw e;
    }
    ofrecerSustituto_(ritual, claveDeRitual_(ritual), lunes, id);
    return { ok: true, tema: liberado.tema };
  },

  // Devuelve al backlog temas seleccionados que no se presentarán.
  liberar(ritual, actor, { ids }) {
    const temas = leerTemas_(ritual);
    const resultados = ids.map((id) => {
      const tema = temas.find((t) => t.id === id);
      return tema ? liberarTema(tema, actor, ritual) : fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    });
    const fallidos = resultados.filter((r) => !r.ok);
    if (fallidos.length) return { ok: false, errores: Object.assign({}, ...fallidos.map((r) => r.errores)) };
    resultados.forEach((r) => actualizarTema_(ritual, r.tema));
    return { ok: true, temas: resultados.map((r) => r.tema) };
  },

  // Sesión cancelada: los temas seleccionados vuelven con preferencia. Los que ya no
  // están seleccionados se dejan como están.
  aplazar(ritual, actor, { ids }) {
    const temas = leerTemas_(ritual).filter((t) => ids.includes(t.id) && t.estado === ESTADOS.seleccionado);
    const resultados = temas.map((tema) => aplazarTema(tema, actor, ritual));
    const fallidos = resultados.filter((r) => !r.ok);
    if (fallidos.length) return { ok: false, errores: Object.assign({}, ...fallidos.map((r) => r.errores)) };
    resultados.forEach((r) => actualizarTema_(ritual, r.tema));
    return { ok: true, temas: resultados.map((r) => r.tema) };
  },

  // Anota en el registro el enlace al hilo del anuncio de cada tema.
  anotarHilos(ritual, actor, { hilos }) {
    if (![ritual.organizador, ritual.suplente].includes(actor.email)) {
      return fallo_('actor', 'Solo el organizador o el suplente pueden anunciar la sesión.');
    }
    const temas = leerTemas_(ritual)
      .filter((t) => hilos[t.id])
      .map((t) => Object.assign({}, t, { hilo: hilos[t.id] }));
    actualizarTemas_(ritual, temas);
    return { ok: true };
  },

  // Si el organizador está fuera de la oficina hoy. Solo lo puede leer su cuenta, que
  // es la que ejecuta el servicio.
  ausencia(ritual) {
    return { ok: true, ausente: organizadorAusente_(ritual, { directo: true, sinCache: true }) };
  },

  // Lanza a mano un hito del ritual de pruebas (/hito). Se ejecuta con la cuenta dueña
  // porque los hitos leen su calendario.
  hito(ritual, actor, { hito }) {
    if (!ritual.disparoManual || ![ritual.organizador, ritual.suplente].includes(actor.email)) {
      return fallo_('actor', 'No puedes lanzar hitos en este espacio.');
    }
    try {
      return { ok: true, hito: lanzarHito_(ritual, hito) };
    } catch (error) {
      console.error(`Error al lanzar el hito ${hito}: ${error.stack}`);
      return fallo_('hito', `No se ha podido lanzar el hito ${hito}. Inténtalo de nuevo en un momento.`);
    }
  },

  descartar(ritual, actor, { id }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No se encuentra el tema ${id} en el registro.`);
    const resultado = descartarTema(tema, actor, ritual);
    if (resultado.ok) actualizarTema_(ritual, resultado.tema);
    return resultado;
  },
};

function fallo_(campo, mensaje) {
  return { ok: false, errores: { [campo]: mensaje } };
}

// Lado cliente: llama al servicio con la sesión de quien usa la app. Si quien la usa
// es la cuenta dueña, ejecuta la operación aquí mismo: el resultado es el mismo y se
// ahorra la llamada por la red, que en los hitos lanzados a mano rozaba los 30 s.
function llamarServicio_(accion, ritual, datos) {
  const email = Session.getEffectiveUser().getEmail().toLowerCase();
  if (email === CUENTA_DUENA) {
    const peticion = Object.assign({ accion, ritual: claveDeRitual_(ritual) }, datos);
    try {
      return JSON.parse(JSON.stringify(ejecutarOperacion_(email, peticion)));
    } catch (error) {
      console.error(`Error en el servicio del registro: ${error.stack}`);
      return fallo_('servicio', 'No se ha podido completar la acción en el registro de temas. Inténtalo de nuevo en un momento.');
    }
  }
  const respuesta = UrlFetchApp.fetch(URL_SERVICIO_REGISTRO, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    payload: JSON.stringify(Object.assign({ accion, ritual: claveDeRitual_(ritual) }, datos)),
    muteHttpExceptions: true,
  });
  try {
    return JSON.parse(respuesta.getContentText());
  } catch (error) {
    console.error(
      `Respuesta no válida del servicio (HTTP ${respuesta.getResponseCode()}): ` +
        respuesta.getContentText().slice(0, 500)
    );
    return fallo_('servicio', 'No se ha podido acceder al registro de temas. Inténtalo de nuevo en un momento.');
  }
}
