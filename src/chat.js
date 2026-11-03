// Adaptador de Chat: la app está configurada como complemento de Google Workspace.
// Recibe los eventos, resuelve el ritual y delega en el dominio y en el registro.

// IDs de comando tal como están dados de alta en la consola de la Chat API.
const COMANDOS = { tema: 1 };

function onAddedToSpace(event) {
  return mensaje_('App de rituales conectada a este espacio. Usa /tema para proponer un tema.');
}

function onMessage(event) {
  return mensaje_('Usa /tema para proponer un tema.');
}

function onRemoveFromSpace(event) {}

function onAppCommand(event) {
  const id = Number(event.chat.appCommandPayload.appCommandMetadata.appCommandId);
  if (id === COMANDOS.tema) return abrirDialogo_(dialogoAltaTema());
  return mensaje_('No conozco ese comando.');
}

// Botón «Proponer tema» del diálogo de alta.
function enviarTema(event) {
  const payload = event.chat.buttonClickedPayload || {};
  const ritual = ritualDelEspacio_(payload.space);
  if (!ritual) return cerrarConMensaje_('Este espacio no tiene ningún ritual configurado.', event);

  const valores = leerFormulario_(event.commonEventObject.formInputs);
  const fechaAlta = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const resultado = crearTema(valores, { email: event.chat.user.email }, fechaAlta);
  if (!resultado.ok) return actualizarDialogo_(dialogoAltaTema(valores, resultado.errores));

  const tema = guardarTemaNuevo_(ritual, resultado.tema);
  return cerrarConMensaje_(textoTemaGuardado(tema), event);
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
