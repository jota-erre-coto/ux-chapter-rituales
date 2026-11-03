// Punto de entrada de la app de Chat, configurada como complemento de Google Workspace.
// Por ahora solo confirma que el despliegue responde.

function onAddedToSpace(event) {
  return responder_('App de rituales conectada a este espacio.');
}

function onMessage(event) {
  return responder_('Recibido. Los comandos llegarán en las próximas versiones.');
}

function onRemoveFromSpace(event) {}

// Los complementos de Chat devuelven el mensaje envuelto en una acción de datos del host.
function responder_(texto) {
  return {
    hostAppDataAction: {
      chatDataAction: { createMessageAction: { message: { text: texto } } },
    },
  };
}
