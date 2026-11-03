// Punto de entrada de la app de Chat. Por ahora solo confirma que el despliegue responde.

function onAddedToSpace(event) {
  return { text: 'App de rituales conectada a este espacio.' };
}

function onMessage(event) {
  return { text: 'Recibido. Los comandos llegarán en las próximas versiones.' };
}

function onRemoveFromSpace(event) {}
