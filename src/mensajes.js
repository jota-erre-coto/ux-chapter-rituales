// Redacción de mensajes: construye tarjetas y diálogos de Chat a partir del dominio.
// Lógica pura: solo construye, no envía. Los textos fijos pasarán por revisión de Ana.

// Diálogo de alta de tema. valores: lo que ya escribió la persona (si se reabre por un
// error); errores: { campo: mensaje } de crearTema.
function dialogoAltaTema(valores, errores) {
  valores = valores || {};
  errores = errores || {};
  const widgets = [];

  const listaErrores = Object.values(errores);
  if (listaErrores.length) {
    widgets.push({
      textParagraph: { text: `<b>Revisa estos campos:</b><br>${listaErrores.join('<br>')}` },
    });
  }

  widgets.push(
    {
      textInput: {
        name: 'titulo',
        label: 'Título',
        type: 'SINGLE_LINE',
        value: valores.titulo || '',
      },
    },
    desplegable_('tipo', 'Tipo de feedback', TIPOS_FEEDBACK, valores.tipo || TIPOS_FEEDBACK[0]),
    {
      selectionInput: {
        name: 'duracion',
        label: 'Duración estimada',
        type: 'RADIO_BUTTON',
        items: DURACIONES_MIN.map((min) => ({
          text: `${min} minutos`,
          value: String(min),
          selected: String(valores.duracion || DURACIONES_MIN[0]) === String(min),
        })),
      },
    },
    { divider: {} },
    { textParagraph: { text: '<b>Opcional.</b> Puedes completarlo ahora o cuando confirmes el tema.' } },
    desplegable_(
      'urgencia',
      'Urgencia (1 = puede esperar, 5 = lo necesito ya)',
      ['1', '2', '3', '4', '5'],
      String(valores.urgencia || URGENCIA_POR_DEFECTO)
    ),
    desplegable_(
      'preparacion',
      'Preparación',
      Object.values(PREPARACIONES),
      valores.preparacion || PREPARACIONES.falta
    ),
    {
      textInput: {
        name: 'contexto',
        label: 'Contexto',
        type: 'MULTIPLE_LINE',
        value: valores.contexto || '',
      },
    },
    {
      textInput: {
        name: 'enlace',
        label: 'Enlace (Figma, Jira…)',
        type: 'SINGLE_LINE',
        value: valores.enlace || '',
      },
    },
    {
      buttonList: {
        buttons: [{ text: 'Proponer tema', onClick: { action: { function: 'enviarTema' } } }],
      },
    }
  );

  return { header: { title: 'Proponer un tema' }, sections: [{ widgets }] };
}

// Texto que recibe quien propone, solo visible para esa persona.
function textoTemaGuardado(tema) {
  return (
    `Tema ${tema.id} guardado en el backlog: «${tema.titulo}».\n` +
    `${tema.tipo} · ${tema.duracion} min · urgencia ${tema.urgencia} · ${tema.preparacion}.`
  );
}

function desplegable_(nombre, etiqueta, opciones, seleccionada) {
  return {
    selectionInput: {
      name: nombre,
      label: etiqueta,
      type: 'DROPDOWN',
      items: opciones.map((opcion) => ({
        text: opcion,
        value: opcion,
        selected: opcion === seleccionada,
      })),
    },
  };
}
