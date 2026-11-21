// Propuesta de selección del lunes: se calcula, se envía al organizador por mensaje
// privado y se ajusta con sus botones hasta que la confirma.
//
// El estado de la propuesta de cada semana vive en las propiedades del script:
// { claveRitual, lunes, sesion, ids, estado, confirmadaPor, mensaje }.
// Los temas solo cambian a «seleccionado» en el registro al confirmar.

function clavePropuesta_(claveRitual, lunes) {
  return `propuesta:${claveRitual}:${lunes}`;
}

function leerPropuesta_(claveRitual, lunes) {
  const guardada = PropertiesService.getScriptProperties().getProperty(clavePropuesta_(claveRitual, lunes));
  return guardada ? JSON.parse(guardada) : null;
}

function guardarPropuesta_(propuesta) {
  PropertiesService.getScriptProperties().setProperty(
    clavePropuesta_(propuesta.claveRitual, propuesta.lunes),
    JSON.stringify(propuesta)
  );
}

function hoyDe_(ritual) {
  return Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
}

// Hito del lunes a las 13:00. Va al organizador, o al suplente si está ausente.
function lanzarPropuesta_(ritual, { sesion, lunes }) {
  const claveRitual = claveDeRitual_(ritual);
  const hoy = hoyDe_(ritual);
  const temas = leerTemas_(ritual);
  const { seleccion } = proponerSeleccion(temas, hoy, ritual.duracionSesionMin);
  const destinatario = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
  const propuesta = {
    claveRitual, lunes, sesion, ids: seleccion.map((t) => t.id), estado: 'pendiente',
    enSustitucion: destinatario !== ritual.organizador,
  };
  const enviado = enviarPrivadoPorEmail_(
    ritual,
    destinatario,
    mensajePropuesta(ritual, propuesta, seleccion, sustitutosPara(temas, seleccion, hoy), hoy)
  );
  if (!enviado) throw new Error(`No se ha podido enviar la propuesta a ${destinatario}.`);
  propuesta.mensaje = enviado.name;
  guardarPropuesta_(propuesta);
}

// Parte del hito del martes a las 11:00 (ver ronda.js): si nadie confirmó la propuesta,
// se avisa al organizador o a su suplente y no se pide confirmación a nadie.
function revisarConfirmacionPropuesta_(ritual, { sesion, lunes }) {
  const propuesta = leerPropuesta_(claveDeRitual_(ritual), lunes);
  if (propuesta && propuesta.estado === 'confirmada') return;
  const destinatario = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
  enviarPrivadoPorEmail_(ritual, destinatario, mensajeSinConfirmar(ritual, sesion));
}

// Vuelve a pintar la tarjeta de la propuesta con su estado actual.
function repintarPropuesta_(ritual, propuesta) {
  const hoy = hoyDe_(ritual);
  const temas = leerTemas_(ritual);
  const seleccion = propuesta.ids.map((id) => temas.find((t) => t.id === id)).filter(Boolean);
  return mensajePropuesta(ritual, propuesta, seleccion, sustitutosPara(temas, seleccion, hoy), hoy);
}

// Propuesta, ritual y temas de un botón de la tarjeta, o el error que hay que mostrar.
function contextoPropuesta_(event) {
  const parametros = event.commonEventObject.parameters || {};
  const ritual = RITUALES[parametros.ritual];
  const actor = actorDe_(event);
  if (!ritual) return { error: 'Ese ritual no existe.' };
  if (![ritual.organizador, ritual.suplente].includes(actor.email)) {
    return { error: 'Solo el organizador o el suplente pueden cambiar la propuesta.' };
  }
  const propuesta = leerPropuesta_(parametros.ritual, parametros.lunes);
  if (!propuesta) return { error: 'No se encuentra esta propuesta.' };
  if (propuesta.estado === 'confirmada') return { error: 'Esta propuesta ya está confirmada.' };
  const temas = leerTemas_(ritual);
  const seleccion = propuesta.ids.map((id) => temas.find((t) => t.id === id)).filter(Boolean);
  const parametrosBoton = [
    { key: 'ritual', value: parametros.ritual },
    { key: 'lunes', value: parametros.lunes },
  ];
  return { ritual, actor, propuesta, temas, seleccion, parametrosBoton };
}

// Botón «Confirmar» de la tarjeta.
function confirmarPropuesta(event) {
  const c = contextoPropuesta_(event);
  if (c.error) return mensaje_(c.error);
  const resultado = llamarServicio_('seleccionar', c.ritual, { ids: c.propuesta.ids });
  if (!resultado.ok) return mensaje_(`No se ha podido confirmar: ${Object.values(resultado.errores).join(' ')}`);
  c.propuesta.estado = 'confirmada';
  c.propuesta.confirmadaPor = event.chat.user.displayName || c.actor.email;
  guardarPropuesta_(c.propuesta);
  return {
    hostAppDataAction: {
      chatDataAction: { updateMessageAction: { message: repintarPropuesta_(c.ritual, c.propuesta) } },
    },
  };
}

// Botón «Cambiar tema» (o «Añadir tema»): abre el diálogo.
function abrirCambioTema(event) {
  const c = contextoPropuesta_(event);
  if (c.error) return abrirDialogo_(dialogoAviso(c.error));
  return abrirDialogo_(dialogoCambiarTema(c.seleccion, fueraDePropuesta_(c), c.parametrosBoton));
}

function aplicarCambioTema(event) {
  const c = contextoPropuesta_(event);
  if (c.error) return cerrarConMensaje_(c.error, event);
  const formulario = leerFormulario_(event.commonEventObject.formInputs);
  const entra = c.temas.find((t) => t.id === formulario.entra);
  const resultado = entra
    ? cambiarTema(c.seleccion, formulario.sale || null, entra, c.ritual.duracionSesionMin)
    : { ok: false, errores: { entra: 'Elige el tema que entra.' } };
  if (!resultado.ok) {
    return actualizarDialogo_(dialogoCambiarTema(c.seleccion, fueraDePropuesta_(c), c.parametrosBoton, resultado.errores));
  }
  return guardarYRepintar_(c, resultado.seleccion, event);
}

// Botón «Solo uno»: abre el diálogo.
function abrirSoloUno(event) {
  const c = contextoPropuesta_(event);
  if (c.error) return abrirDialogo_(dialogoAviso(c.error));
  return abrirDialogo_(dialogoSoloUno(c.seleccion, c.parametrosBoton));
}

function aplicarSoloUno(event) {
  const c = contextoPropuesta_(event);
  if (c.error) return cerrarConMensaje_(c.error, event);
  const resultado = quedarseConUno(c.seleccion, leerFormulario_(event.commonEventObject.formInputs).queda);
  if (!resultado.ok) return cerrarConMensaje_(Object.values(resultado.errores).join(' '), event);
  return guardarYRepintar_(c, resultado.seleccion, event);
}

function fueraDePropuesta_(c) {
  return sustitutosPara(c.temas, c.seleccion, hoyDe_(c.ritual)).concat(
    ordenarPorPrioridad(candidatos(c.temas), hoyDe_(c.ritual)).filter(
      (t) => t.preparacion !== PREPARACIONES.lista && !c.propuesta.ids.includes(t.id)
    )
  );
}

// Guarda la nueva selección, actualiza la tarjeta original y cierra el diálogo.
function guardarYRepintar_(c, seleccion, event) {
  c.propuesta.ids = seleccion.map((t) => t.id);
  guardarPropuesta_(c.propuesta);
  actualizarMensaje_(c.propuesta.mensaje, repintarPropuesta_(c.ritual, c.propuesta));
  return cerrarConMensaje_('Propuesta actualizada.', event);
}
