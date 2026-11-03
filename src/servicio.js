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
    const peticion = JSON.parse(e.postData.contents);
    const ritual = RITUALES[peticion.ritual];
    const operacion = OPERACIONES_SERVICIO_[peticion.accion];
    if (!email) resultado = fallo_('actor', 'No se ha podido identificar a quien hace la petición.');
    else if (!ritual) resultado = fallo_('ritual', 'Ese ritual no existe.');
    else if (!operacion) resultado = fallo_('accion', 'Esa acción no existe.');
    else resultado = operacion(ritual, { email, nombre: peticion.nombre }, peticion);
  } catch (error) {
    console.error(`Error en el servicio del registro: ${error.stack}`);
    resultado = fallo_('servicio', 'Ha fallado el registro de temas. Inténtalo de nuevo en un momento.');
  }
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(
    ContentService.MimeType.JSON
  );
}

const OPERACIONES_SERVICIO_ = {
  crear(ritual, actor, { valores }) {
    const fechaAlta = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
    const permitida = puedeAsignar(actor, ritual, organizadorAusente_(ritual));
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
      enviarPrivado_(destinatario.id, { text: textoAvisoAsignacion(tema, actor.nombre || actor.email) });
    return { ok: true, tema, avisado };
  },

  editar(ritual, actor, { id, valores }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No encuentro el tema ${id} en el registro.`);
    const resultado = editarTema(tema, valores, actor);
    if (resultado.ok) actualizarTema_(ritual, resultado.tema);
    return resultado;
  },

  descartar(ritual, actor, { id }) {
    const tema = buscarTema_(ritual, id);
    if (!tema) return fallo_('id', `No encuentro el tema ${id} en el registro.`);
    const resultado = descartarTema(tema, actor, ritual);
    if (resultado.ok) actualizarTema_(ritual, resultado.tema);
    return resultado;
  },
};

function fallo_(campo, mensaje) {
  return { ok: false, errores: { [campo]: mensaje } };
}

// Lado cliente: llama al servicio con la sesión de quien usa la app.
function llamarServicio_(accion, ritual, datos) {
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
    return fallo_('servicio', 'No se ha podido contactar con el registro de temas. Inténtalo de nuevo.');
  }
}
