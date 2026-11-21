// Ronda de confirmación del martes: petición a cada responsable a las 11:00, sustitutos
// para quien no puede o no responde, y pregunta al organizador si no queda ningún tema.
//
// Todo vive en el estado de la propuesta de la semana (ver propuesta.js), ampliado con:
// { confirmaciones, liberados, peticiones: { [id]: mensaje }, ofertas: { [id]: mensaje },
//   ofertados: { [idQueSale]: idQueEntra }, preguntadoSinTemas, sinTemas: 'cancelar' | 'abierta' }.
// Las escrituras en el registro van por el servicio; el estado se guarda con bloqueo,
// fuera de cualquier llamada al servicio, que usa el mismo bloqueo del script.

// Lee, modifica y guarda la propuesta de la semana sin que dos respuestas se pisen.
function modificarPropuesta_(claveRitual, lunes, cambio) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    const propuesta = leerPropuesta_(claveRitual, lunes);
    const nueva = cambio(propuesta);
    if (nueva) guardarPropuesta_(nueva);
    return nueva;
  } finally {
    bloqueo.releaseLock();
  }
}

// Hito del martes a las 11:00.
function lanzarConfirmaciones_(ritual, contexto) {
  const claveRitual = claveDeRitual_(ritual);
  const actual = leerPropuesta_(claveRitual, contexto.lunes);
  if (!actual || actual.estado !== 'confirmada') {
    revisarConfirmacionPropuesta_(ritual, contexto);
    return;
  }
  // Ya lanzada (p. ej. al relanzar el hito a mano): no se reinician las respuestas.
  if (actual.confirmaciones) return;
  const temas = leerTemas_(ritual);
  const propuesta = iniciarConfirmaciones(actual);
  propuesta.peticiones = {};
  propuesta.ofertas = {};
  propuesta.ids.forEach((id) => {
    const tema = temas.find((t) => t.id === id);
    if (!tema) return;
    const enviado = enviarPrivadoPorEmail_(ritual, tema.responsable, mensajePeticionConfirmacion(ritual, propuesta, tema));
    if (enviado) propuesta.peticiones[id] = enviado.name;
  });
  modificarPropuesta_(claveRitual, contexto.lunes, () => propuesta);
}

// Hito del martes a las 11:45: sustituto por cada tema sin confirmar y, si no queda
// ninguno, pregunta al organizador.
function revisarPlazo_(ritual, { lunes }) {
  const claveRitual = claveDeRitual_(ritual);
  const propuesta = leerPropuesta_(claveRitual, lunes);
  if (!propuesta || !propuesta.confirmaciones) return;
  sinConfirmar(propuesta, true)
    .filter((id) => !(propuesta.ofertas || {})[id])
    .forEach((id) => ofrecerSustituto_(ritual, claveRitual, lunes, id));
  preguntarSiSinTemas_(ritual, claveRitual, lunes);
}

// Envía al organizador (o al suplente) la oferta de sustituto para un tema.
function ofrecerSustituto_(ritual, claveRitual, lunes, saleId) {
  const propuesta = leerPropuesta_(claveRitual, lunes);
  // Un tema solo tiene una oferta abierta a la vez.
  if ((propuesta.ofertas || {})[saleId]) return;
  const temas = leerTemas_(ritual);
  const sale = temas.find((t) => t.id === saleId);
  if (!sale) return;
  const entra = elegirSustituto(temas, propuesta, saleId, hoyDe_(ritual), ritual.duracionSesionMin);
  const destinatario = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
  const motivo = propuesta.confirmaciones[saleId];
  const enviado = enviarPrivadoPorEmail_(
    ritual,
    destinatario,
    mensajeOfertaSustituto(ritual, propuesta, sale, entra, motivo)
  );
  if (!enviado) throw new Error(`No se ha podido ofrecer sustituto a ${destinatario}.`);
  modificarPropuesta_(claveRitual, lunes, (p) => {
    p.ofertas = Object.assign({}, p.ofertas, { [saleId]: enviado.name });
    p.ofertados = Object.assign({}, p.ofertados, { [saleId]: entra ? entra.id : null });
    return p;
  });
}

// Si ya no queda ningún tema confirmado ni pendiente, ni ofertas por resolver, pregunta
// una sola vez si se cancela la sesión o se anuncia como abierta.
function preguntarSiSinTemas_(ritual, claveRitual, lunes) {
  const propuesta = leerPropuesta_(claveRitual, lunes);
  if (propuesta.preguntadoSinTemas || propuesta.sinTemas) return;
  const ofertasAbiertas = propuesta.ids.some((id) => (propuesta.ofertas || {})[id]);
  if (!sesionSinTemas(propuesta) || ofertasAbiertas) return;
  const destinatario = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
  const enviado = enviarPrivadoPorEmail_(ritual, destinatario, mensajeSinTemas(ritual, propuesta));
  if (!enviado) throw new Error(`No se ha podido preguntar a ${destinatario} qué hacer sin temas.`);
  modificarPropuesta_(claveRitual, lunes, (p) => Object.assign(p, { preguntadoSinTemas: true }));
}

// Registra la respuesta de un responsable en el estado de la semana. Devuelve el error
// en texto, o null.
function responderRonda_(ritual, lunes, id, respuesta) {
  let error = null;
  const guardada = modificarPropuesta_(claveDeRitual_(ritual), lunes, (p) => {
    if (!p || !p.confirmaciones) {
      error = 'Esta ronda de confirmación ya no está abierta.';
      return null;
    }
    const r = responderConfirmacion(p, id, respuesta);
    if (!r.ok) {
      error = Object.values(r.errores).join(' ');
      return null;
    }
    return r.propuesta;
  });
  return guardada ? null : error;
}

// Deshace una respuesta registrada cuando falla la escritura que la acompaña, para que
// el responsable pueda volver a responder.
function deshacerRespuesta_(ritual, lunes, id) {
  modificarPropuesta_(claveDeRitual_(ritual), lunes, (p) => {
    if (!p || !p.confirmaciones || !p.confirmaciones[id]) return null;
    p.confirmaciones = Object.assign({}, p.confirmaciones, { [id]: CONFIRMACION.pendiente });
    return p;
  });
}

// Quita la oferta resuelta de un tema que sale.
function cerrarOferta_(propuesta, anterior, saleId) {
  propuesta.ofertas = Object.assign({}, anterior.ofertas);
  propuesta.ofertados = Object.assign({}, anterior.ofertados);
  delete propuesta.ofertas[saleId];
  delete propuesta.ofertados[saleId];
  return propuesta;
}

// Deja la petición de confirmación respondida y sin botones.
function cerrarPeticion_(ritual, lunes, tema, respuesta) {
  const propuesta = leerPropuesta_(claveDeRitual_(ritual), lunes);
  const peticion = (propuesta.peticiones || {})[tema.id];
  if (!peticion) return;
  try {
    actualizarMensaje_(peticion, mensajeConfirmacionRespondida(ritual, propuesta, tema, respuesta));
  } catch (error) {
    console.error(`No se ha podido cerrar la petición de ${tema.id}: ${error.message}`);
  }
}

// Ritual, propuesta y tema de un botón de la ronda, o el error que hay que mostrar.
function contextoRonda_(event) {
  const parametros = event.commonEventObject.parameters || {};
  const ritual = RITUALES[parametros.ritual];
  if (!ritual) return { error: 'Ese ritual no existe.' };
  const propuesta = leerPropuesta_(parametros.ritual, parametros.lunes);
  if (!propuesta || !propuesta.confirmaciones) return { error: 'Esta ronda de confirmación ya no está abierta.' };
  return {
    ritual,
    claveRitual: parametros.ritual,
    lunes: parametros.lunes,
    parametros,
    propuesta,
    actor: actorDe_(event),
    temas: leerTemas_(ritual),
  };
}

function contextoResponsable_(event) {
  const c = contextoRonda_(event);
  if (c.error) return c;
  c.tema = c.temas.find((t) => t.id === c.parametros.id);
  if (!c.tema) return { error: `No encuentro el tema ${c.parametros.id}.` };
  if (c.tema.responsable !== c.actor.email) return { error: 'Solo su responsable puede responder por este tema.' };
  return c;
}

function contextoGestor_(event) {
  const c = contextoRonda_(event);
  if (c.error) return c;
  if (![c.ritual.organizador, c.ritual.suplente].includes(c.actor.email)) {
    return { error: 'Solo el organizador o el suplente pueden decidir sustitutos.' };
  }
  return c;
}

function actualizarEsteMensaje_(mensaje) {
  return { hostAppDataAction: { chatDataAction: { updateMessageAction: { message: mensaje } } } };
}

// Las respuestas de los responsables van por el servicio: registran en el registro y
// envían mensajes como la app, y eso solo lo puede hacer la cuenta dueña.

// «Lo llevo» cuando el tema ya tiene contexto y enlace.
function confirmarTemaDirecto(event) {
  const c = contextoResponsable_(event);
  if (c.error) return mensaje_(c.error);
  const r = llamarServicio_('confirmar', c.ritual, { lunes: c.lunes, id: c.tema.id });
  if (!r.ok) return mensaje_(Object.values(r.errores).join(' '));
  return actualizarEsteMensaje_(mensajeConfirmacionRespondida(c.ritual, c.propuesta, r.tema, CONFIRMACION.confirmado));
}

// «Lo llevo» cuando faltan contexto o enlace: abre el diálogo para completarlos.
function abrirConfirmacionTema(event) {
  const c = contextoResponsable_(event);
  if (c.error) return abrirDialogo_(dialogoAviso(c.error));
  return abrirDialogo_(dialogoConfirmarTema(c.tema, parametrosRonda_(c.propuesta, { id: c.tema.id })));
}

function guardarConfirmacionTema(event) {
  const c = contextoResponsable_(event);
  if (c.error) return cerrarConMensaje_(c.error, event);
  const formulario = leerFormulario_(event.commonEventObject.formInputs);
  const r = llamarServicio_('confirmar', c.ritual, {
    lunes: c.lunes,
    id: c.tema.id,
    contexto: formulario.contexto,
    enlace: formulario.enlace,
  });
  if (!r.ok && r.errores.enlace) {
    const tema = Object.assign({}, c.tema, formulario);
    return actualizarDialogo_(dialogoConfirmarTema(tema, parametrosRonda_(c.propuesta, { id: c.tema.id }), r.errores));
  }
  if (!r.ok) return cerrarConMensaje_(Object.values(r.errores).join(' '), event);
  return cerrarConMensaje_(`Confirmado: llevas ${c.tema.id} a la sesión.`, event);
}

// «No puedo»: el tema vuelve al backlog y se ofrece sustituto en el momento.
function noPuedoTema(event) {
  const c = contextoResponsable_(event);
  if (c.error) return mensaje_(c.error);
  const r = llamarServicio_('noPuedo', c.ritual, { lunes: c.lunes, id: c.tema.id });
  if (!r.ok) return mensaje_(Object.values(r.errores).join(' '));
  return actualizarEsteMensaje_(mensajeConfirmacionRespondida(c.ritual, c.propuesta, c.tema, CONFIRMACION.noPuede));
}

// «Sustituir»: entra el sustituto, ya confirmado, y sale el tema sin confirmar.
function aplicarSustitucion(event) {
  const c = contextoGestor_(event);
  if (c.error) return mensaje_(c.error);
  const { sale: saleId, entra: entraId } = c.parametros;
  const sale = c.temas.find((t) => t.id === saleId);
  const entra = c.temas.find((t) => t.id === entraId);
  const r = sustituirTema(c.propuesta, saleId, entraId);
  if (!r.ok) return mensaje_(Object.values(r.errores).join(' '));
  const seleccion = llamarServicio_('seleccionar', c.ritual, { ids: [entraId] });
  if (!seleccion.ok) return mensaje_(`No se ha podido sustituir: ${Object.values(seleccion.errores).join(' ')}`);
  if (sale && sale.estado === ESTADOS.seleccionado) llamarServicio_('liberar', c.ritual, { ids: [saleId] });
  const guardada = modificarPropuesta_(c.claveRitual, c.lunes, (p) => {
    const s = sustituirTema(p, saleId, entraId);
    return s.ok ? cerrarOferta_(s.propuesta, p, saleId) : null;
  });
  // Otro clic ya la resolvió: no se avisa dos veces.
  if (!guardada) return mensaje_('Esta sustitución ya está resuelta.');
  if (entra) enviarPrivadoPorEmail_(c.ritual, entra.responsable, mensajeAvisoSustituto(c.ritual, c.propuesta, entra));
  return actualizarEsteMensaje_(mensajeSustitucionResuelta(sale || { id: saleId, titulo: '' }, entra));
}

// «Sin sustituto» o «Quitarlo de la sesión».
function rechazarSustitucion(event) {
  const c = contextoGestor_(event);
  if (c.error) return mensaje_(c.error);
  const saleId = c.parametros.sale;
  const sale = c.temas.find((t) => t.id === saleId);
  const r = retirarTema(c.propuesta, saleId);
  if (!r.ok) return mensaje_(Object.values(r.errores).join(' '));
  if (sale && sale.estado === ESTADOS.seleccionado) llamarServicio_('liberar', c.ritual, { ids: [saleId] });
  const guardada = modificarPropuesta_(c.claveRitual, c.lunes, (p) => {
    const s = retirarTema(p, saleId);
    return s.ok ? cerrarOferta_(s.propuesta, p, saleId) : null;
  });
  if (!guardada) return mensaje_('Esta sustitución ya está resuelta.');
  preguntarSiSinTemas_(c.ritual, c.claveRitual, c.lunes);
  return actualizarEsteMensaje_(mensajeSustitucionResuelta(sale || { id: saleId, titulo: '' }, null));
}

// «Cancelar la sesión» o «Anunciar sesión abierta». El anuncio (#11) lo aplica.
function decidirSinTemas(event) {
  const c = contextoGestor_(event);
  if (c.error) return mensaje_(c.error);
  const decision = c.parametros.decision;
  if (!['cancelar', 'abierta'].includes(decision)) return mensaje_('Decisión no válida.');
  modificarPropuesta_(c.claveRitual, c.lunes, (p) => Object.assign(p, { sinTemas: decision }));
  return actualizarEsteMensaje_(mensajeSinTemasDecidido(decision));
}
