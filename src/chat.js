// Adaptador de Chat: la app está configurada como complemento de Google Workspace.
// Recibe los eventos, resuelve el ritual y delega en el dominio y en el registro.

// IDs de comando tal como están dados de alta en la consola de la Chat API.
const COMANDOS = { tema: 1, misTemas: 2 };

function onAddedToSpace(event) {
  return mensaje_('App de rituales conectada a este espacio. Usa /tema para proponer un tema.');
}

function onMessage(event) {
  return mensaje_('Usa /tema para proponer un tema.');
}

function onRemovedFromSpace(event) {}

function onAppCommand(event) {
  const id = Number(event.chat.appCommandPayload.appCommandMetadata.appCommandId);
  if (id === COMANDOS.tema) {
    const actor = actorDe_(event);
    const ritual = ritualDelEspacio_(event.chat.appCommandPayload.space);
    const asignables = ritual && asignablesPara_(ritual, actor);
    return abrirDialogo_(dialogoAltaTema(null, null, null, asignables, actor.email));
  }
  if (id === COMANDOS.misTemas) {
    const ritual = ritualDelEspacio_(event.chat.appCommandPayload.space);
    if (!ritual) return mensaje_('Este espacio no tiene ningún ritual configurado.');
    return abrirDialogo_(construirMisTemas_(ritual, actorDe_(event)));
  }
  return mensaje_('No conozco ese comando.');
}

// Botón «Proponer tema» del diálogo de alta.
function enviarTema(event) {
  const payload = event.chat.buttonClickedPayload || {};
  const ritual = ritualDelEspacio_(payload.space);
  if (!ritual) return cerrarConMensaje_('Este espacio no tiene ningún ritual configurado.', event);

  const actor = actorDe_(event);
  const valores = leerFormulario_(event.commonEventObject.formInputs);
  const fechaAlta = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const asignables = asignablesPara_(ritual, actor);
  const asignacion = {
    permitida: Boolean(asignables),
    miembros: (asignables || []).map((p) => p.email),
  };
  const resultado = crearTema(valores, actor, fechaAlta, asignacion);
  if (!resultado.ok) {
    return actualizarDialogo_(
      dialogoAltaTema(valores, resultado.errores, null, asignables, actor.email)
    );
  }

  const tema = guardarTemaNuevo_(ritual, resultado.tema);
  if (!tema.asignado) return cerrarConMensaje_(textoTemaGuardado(tema), event);

  const quienAsigna = event.chat.user.displayName || actor.email;
  const destinatario = asignables.find((p) => p.email === tema.responsable);
  const avisado =
    Boolean(destinatario && destinatario.id) &&
    enviarPrivado_(destinatario.id, { text: textoAvisoAsignacion(tema, quienAsigna) });
  return cerrarConMensaje_(textoTemaAsignado(tema, avisado), event);
}

// Miembros del espacio del ritual a los que esta persona puede asignar temas, o null
// si no puede asignar. Si la lectura de miembros falla, se registra el error y el
// diálogo se abre sin el campo Responsable: proponer temas no debe romperse por esto.
function asignablesPara_(ritual, actor) {
  if (!puedeAsignar(actor, ritual, organizadorAusente_(ritual))) return null;
  try {
    return miembrosDelEspacio_(ritual.espacio);
  } catch (error) {
    console.error(`No se han podido leer los miembros de ${ritual.espacio}: ${error.stack}`);
    return null;
  }
}

// Botón «Editar» de /mis-temas: abre el diálogo de alta con los datos del tema.
function editarMiTema(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  return actualizarDialogo_(dialogoAltaTema(contexto.tema, null, { id: contexto.tema.id }));
}

// Botón «Guardar cambios» del diálogo de edición.
function guardarEdicion(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  const valores = leerFormulario_(event.commonEventObject.formInputs);
  const resultado = editarTema(contexto.tema, valores, actorDe_(event));
  if (!resultado.ok) {
    return actualizarDialogo_(dialogoAltaTema(valores, resultado.errores, { id: contexto.tema.id }));
  }
  actualizarTema_(contexto.ritual, resultado.tema);
  return cerrarConMensaje_(textoTemaEditado(resultado.tema), event);
}

// Botón «Descartar» de /mis-temas: pide confirmación antes de descartar.
function pedirDescarte(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  return actualizarDialogo_(dialogoConfirmarDescarte(contexto.tema));
}

function descartarMiTema(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  const resultado = descartarTema(contexto.tema, actorDe_(event), contexto.ritual);
  if (!resultado.ok) return cerrarConMensaje_(Object.values(resultado.errores).join(' '), event);
  actualizarTema_(contexto.ritual, resultado.tema);
  return cerrarConMensaje_(textoTemaDescartado(resultado.tema), event);
}

function volverAMisTemas(event) {
  const ritual = ritualDelEspacio_((event.chat.buttonClickedPayload || {}).space);
  if (!ritual) return cerrarConMensaje_('Este espacio no tiene ningún ritual configurado.', event);
  return actualizarDialogo_(construirMisTemas_(ritual, actorDe_(event)));
}

function construirMisTemas_(ritual, actor) {
  const hoy = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const temas = leerTemas_(ritual).filter((tema) => tema.estado !== ESTADOS.descartado);
  const propios = temas.filter((tema) => tema.responsable === actor.email);
  const gestiona = [ritual.organizador, ritual.suplente].includes(actor.email);
  const otros = gestiona
    ? temas.filter((tema) => tema.responsable !== actor.email && puedeDescartar(tema, actor, ritual))
    : [];
  const permisos = (tema) => ({
    editar: puedeEditar(tema, actor),
    descartar: puedeDescartar(tema, actor, ritual),
  });
  return dialogoMisTemas(propios, otros, hoy, permisos);
}

// Ritual y tema de un botón con parámetro id, o el error que hay que mostrar.
function contextoBoton_(event) {
  const ritual = ritualDelEspacio_((event.chat.buttonClickedPayload || {}).space);
  if (!ritual) return { error: 'Este espacio no tiene ningún ritual configurado.' };
  const id = (event.commonEventObject.parameters || {}).id;
  const tema = id && buscarTema_(ritual, id);
  if (!tema) return { error: `No encuentro el tema ${id || ''} en el registro.` };
  return { ritual, tema };
}

function actorDe_(event) {
  return { email: String(event.chat.user.email || '').toLowerCase() };
}

function leerFormulario_(formInputs) {
  const valores = {};
  Object.keys(formInputs || {}).forEach((campo) => {
    const lista = formInputs[campo].stringInputs && formInputs[campo].stringInputs.value;
    valores[campo] = lista && lista.length ? lista[0] : '';
  });
  return valores;
}

function abrirDialogo_(tarjeta) {
  return { action: { navigations: [{ pushCard: tarjeta }] } };
}

function actualizarDialogo_(tarjeta) {
  return { action: { navigations: [{ updateCard: tarjeta }] } };
}

function mensaje_(texto) {
  return {
    hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text: texto } } } },
  };
}

// Cierra el diálogo con un mensaje que solo ve quien lo envió (en un espacio).
function cerrarConMensaje_(texto, event) {
  const respuesta = mensaje_(texto);
  const espacio = (event.chat.buttonClickedPayload || {}).space || {};
  if (espacio.spaceType !== 'DIRECT_MESSAGE' && espacio.type !== 'DM') {
    respuesta.hostAppDataAction.chatDataAction.createMessageAction.message.privateMessageViewer =
      { name: event.chat.user.name };
  }
  return respuesta;
}
