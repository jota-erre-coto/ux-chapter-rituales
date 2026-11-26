// Adaptador de Chat: la app está configurada como complemento de Google Workspace.
// Recibe los eventos, resuelve el ritual y delega en el dominio. Lee el registro con
// la sesión de quien la usa; las escrituras pasan por el servicio del registro.

// IDs de comando tal como están dados de alta en la consola de la Chat API.
const COMANDOS = { tema: 1, misTemas: 2, hito: 3 };

function onAddedToSpace(event) {
  return mensaje_('App de rituales conectada a este espacio. Usa /tema para proponer un tema.');
}

function onMessage(event) {
  return mensaje_('Usa /tema para proponer un tema.');
}

function onRemovedFromSpace(event) {}

function onAppCommand(event) {
  const id = Number(event.chat.appCommandPayload.appCommandMetadata.appCommandId);
  if (id === COMANDOS.tema) return abrirAltaTema(event);
  if (id === COMANDOS.hito) {
    const ritual = ritualDelEspacio_(event.chat.appCommandPayload.space);
    const actor = actorDe_(event);
    if (!ritual || !ritual.disparoManual || ![ritual.organizador, ritual.suplente].includes(actor.email)) {
      return abrirDialogo_(dialogoAviso('Lanzar hitos a mano solo está disponible para el organizador y el suplente, en el ritual de pruebas.'));
    }
    return abrirDialogo_(dialogoLanzarHito(hitosManuales_()));
  }
  if (id === COMANDOS.misTemas) {
    const ritual = ritualDelEspacio_(event.chat.appCommandPayload.space);
    if (!ritual) return abrirDialogo_(dialogoAviso('Este espacio no tiene ningún ritual configurado.'));
    return abrirDialogo_(construirMisTemas_(ritual, actorDe_(event)));
  }
  return abrirDialogo_(dialogoAviso('Ese comando no existe. Prueba con /tema o /mis-temas.'));
}

// /tema y el botón «Proponer tema» de la convocatoria: abre el diálogo de alta.
function abrirAltaTema(event) {
  const actor = actorDe_(event);
  const carga = event.chat.appCommandPayload || event.chat.buttonClickedPayload || {};
  const ritual = ritualDelEspacio_(carga.space);
  const asignables = ritual && asignablesPara_(ritual, actor);
  return abrirDialogo_(dialogoAltaTema(null, null, null, asignables, actor.email));
}

// Botón de un hito en el diálogo de /hito.
function lanzarHitoManual(event) {
  const ritual = ritualDelEspacio_((event.chat.buttonClickedPayload || {}).space);
  const actor = actorDe_(event);
  if (!ritual || !ritual.disparoManual || ![ritual.organizador, ritual.suplente].includes(actor.email)) {
    return cerrarConMensaje_('No puedes lanzar hitos en este espacio.', event);
  }
  // Va por el servicio: los hitos leen el calendario del organizador, que el suplente
  // no puede leer con su cuenta.
  const hito = (event.commonEventObject.parameters || {}).hito;
  const resultado = llamarServicio_('hito', ritual, { hito });
  if (!resultado.ok) return cerrarConMensaje_(Object.values(resultado.errores).join(' '), event);
  return cerrarConMensaje_(`Hito ${resultado.hito} lanzado.`, event);
}

// Botón «Proponer tema» del diálogo de alta.
function enviarTema(event) {
  const payload = event.chat.buttonClickedPayload || {};
  const ritual = ritualDelEspacio_(payload.space);
  if (!ritual) return cerrarConMensaje_('Este espacio no tiene ningún ritual configurado.', event);

  const actor = actorDe_(event);
  const valores = leerFormulario_(event.commonEventObject.formInputs);
  const resultado = llamarServicio_('crear', ritual, {
    valores,
    nombre: event.chat.user.displayName || '',
  });
  if (!resultado.ok) {
    const asignables = asignablesPara_(ritual, actor);
    return actualizarDialogo_(
      dialogoAltaTema(valores, resultado.errores, null, asignables, actor.email)
    );
  }
  const tema = resultado.tema;
  if (!tema.asignado) return cerrarConMensaje_(textoTemaGuardado(tema), event);
  const [conNombre] = conNombres([tema], nombresDelEspacio_(ritual));
  return cerrarConMensaje_(textoTemaAsignado(conNombre, resultado.avisado), event);
}

// Miembros del espacio del ritual a los que esta persona puede asignar temas, o null
// si no puede asignar. La ausencia del organizador solo se consulta para el suplente,
// para no retrasar /tema al resto. Si algo falla, se registra el error y el diálogo se
// abre sin el campo Responsable: proponer temas no debe romperse por esto.
function asignablesPara_(ritual, actor) {
  try {
    const esSuplente = actor.email === ritual.suplente;
    if (actor.email !== ritual.organizador && !esSuplente) return null;
    if (!puedeAsignar(actor, ritual, esSuplente && organizadorAusente_(ritual))) return null;
    return miembrosDelEspacio_(ritual.espacio);
  } catch (error) {
    console.error(`No se ha podido preparar la asignación en ${ritual.espacio}: ${error.stack}`);
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
  const resultado = llamarServicio_('editar', contexto.ritual, { id: contexto.tema.id, valores });
  if (!resultado.ok) {
    return actualizarDialogo_(dialogoAltaTema(valores, resultado.errores, { id: contexto.tema.id }));
  }
  return cerrarConMensaje_(textoTemaEditado(resultado.tema), event);
}

// Botón «Descartar» de /mis-temas: pide confirmación antes de descartar.
function pedirDescarte(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  return actualizarDialogo_(dialogoConfirmarDescarte(contexto.tema, vistaDe_(event)));
}

function descartarMiTema(event) {
  const contexto = contextoBoton_(event);
  if (contexto.error) return cerrarConMensaje_(contexto.error, event);
  const resultado = llamarServicio_('descartar', contexto.ritual, { id: contexto.tema.id });
  if (!resultado.ok) return cerrarConMensaje_(Object.values(resultado.errores).join(' '), event);
  return cerrarConMensaje_(textoTemaDescartado(resultado.tema), event);
}

function volverAMisTemas(event) {
  const ritual = ritualDelEspacio_((event.chat.buttonClickedPayload || {}).space);
  if (!ritual) return cerrarConMensaje_('Este espacio no tiene ningún ritual configurado.', event);
  return actualizarDialogo_(construirMisTemas_(ritual, actorDe_(event), vistaDe_(event)));
}

// Selector de /mis-temas: «Mis temas» o «Resto del Chapter».
function cambiarVistaMisTemas(event) {
  return volverAMisTemas(event);
}

function vistaDe_(event) {
  return (event.commonEventObject.parameters || {}).vista || VISTAS_MIS_TEMAS.mios;
}

function construirMisTemas_(ritual, actor, vista) {
  const hoy = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const gestiona = [ritual.organizador, ritual.suplente].includes(actor.email);
  let temas = leerTemas_(ritual).filter((tema) => tema.estado !== ESTADOS.descartado);
  // Los nombres solo hacen falta si se muestran otras personas: temas ajenos (quien
  // gestiona) o quién te asignó un tema.
  if (gestiona || temas.some((t) => t.responsable === actor.email && t.asignado)) {
    temas = conNombres(temas, nombresDelEspacio_(ritual));
  }
  const propios = temas.filter((tema) => tema.responsable === actor.email);
  const otros = gestiona
    ? temas.filter((tema) => tema.responsable !== actor.email && puedeDescartar(tema, actor, ritual))
    : [];
  const permisos = (tema) => ({
    editar: puedeEditar(tema, actor),
    descartar: puedeDescartar(tema, actor, ritual),
  });
  return dialogoMisTemas(propios, otros, hoy, permisos, vista || VISTAS_MIS_TEMAS.mios, gestiona);
}

// Ritual y tema de un botón con parámetro id, o el error que hay que mostrar.
function contextoBoton_(event) {
  const ritual = ritualDelEspacio_((event.chat.buttonClickedPayload || {}).space);
  if (!ritual) return { error: 'Este espacio no tiene ningún ritual configurado.' };
  const id = (event.commonEventObject.parameters || {}).id;
  const tema = id && buscarTema_(ritual, id);
  if (!tema) return { error: `No se encuentra el tema ${id || ''} en el registro.` };
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
