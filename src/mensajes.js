// Redacción de mensajes: construye tarjetas y diálogos de Chat a partir del dominio.
// Lógica pura: solo construye, no envía. Los textos fijos pasarán por revisión de Ana.

// Diálogo de alta de tema. valores: lo que ya escribió la persona (si se reabre por un
// error); errores: { campo: mensaje } de crearTema.
// edicion: { id } para usar el mismo diálogo al editar un tema existente.
// asignables: [{ email, nombre }] si quien abre el diálogo puede asignar el tema a
// otra persona; quienPropone: su email, que es el responsable por defecto.
function dialogoAltaTema(valores, errores, edicion, asignables, quienPropone) {
  valores = valores || {};
  errores = errores || {};
  const boton = edicion
    ? {
        text: 'Guardar cambios',
        onClick: { action: { function: 'guardarEdicion', parameters: [{ key: 'id', value: edicion.id }] } },
      }
    : { text: 'Proponer tema', onClick: { action: { function: 'enviarTema' } } };
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
    ...campoResponsable_(asignables, valores.responsable || quienPropone, quienPropone),
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
        buttons: [boton],
      },
    }
  );

  const titulo = edicion ? `Editar ${edicion.id}` : 'Proponer un tema';
  return { header: { title: titulo }, sections: [{ widgets }] };
}

// Texto que recibe quien propone, solo visible para esa persona.
function textoTemaGuardado(tema) {
  return (
    `Tema ${tema.id} guardado en el backlog: «${tema.titulo}».\n` +
    `${tema.tipo} · ${tema.duracion} min · urgencia ${tema.urgencia} · ${tema.preparacion}.`
  );
}

// Diálogo de /mis-temas. propios: temas de los que la persona es responsable.
// otros: resto del backlog abierto, solo para el organizador y el suplente.
// permisos(tema) devuelve { editar, descartar } para pintar solo los botones válidos.
function dialogoMisTemas(propios, otros, hoy, permisos) {
  const sections = [];
  if (!propios.length) {
    sections.push({
      widgets: [{ textParagraph: { text: 'No tienes temas. Usa /tema para proponer uno.' } }],
    });
  }
  propios.forEach((tema) => sections.push(seccionTema_(tema, hoy, permisos(tema))));
  if (otros.length) {
    sections.push({
      header: 'Resto del backlog',
      widgets: [{ textParagraph: { text: 'Como organizador o suplente, puedes descartar estos temas.' } }],
    });
    otros.forEach((tema) => sections.push(seccionTema_(tema, hoy, permisos(tema), true)));
  }
  return { header: { title: 'Mis temas' }, sections };
}

function dialogoConfirmarDescarte(tema) {
  return {
    header: { title: `Descartar ${tema.id}` },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: `¿Descartas «${tema.titulo}»? Saldrá del backlog y no se tratará en ninguna sesión.`,
            },
          },
          {
            buttonList: {
              buttons: [
                {
                  text: 'Descartar',
                  onClick: { action: { function: 'descartarMiTema', parameters: [{ key: 'id', value: tema.id }] } },
                },
                { text: 'Volver', onClick: { action: { function: 'volverAMisTemas' } } },
              ],
            },
          },
        ],
      },
    ],
  };
}

// Aviso privado al responsable de un tema asignado.
function textoAvisoAsignacion(tema, quienAsigna) {
  return (
    `${quienAsigna} te ha asignado el tema ${tema.id} para la Design Review: «${tema.titulo}».\n` +
    'Es un compromiso: cuando se seleccione para una sesión, te pediremos que confirmes que lo llevas. ' +
    'Puedes verlo y editarlo con /mis-temas.'
  );
}

// Respuesta a quien asigna, según se haya podido avisar o no al responsable.
function textoTemaAsignado(tema, avisado) {
  const aviso = avisado
    ? `He avisado a ${tema.responsable} por mensaje privado.`
    : `No he podido avisar a ${tema.responsable}: todavía no ha abierto un chat con la app. Avísale tú.`;
  return `Tema ${tema.id} asignado a ${tema.responsable}: «${tema.titulo}».\n${aviso}`;
}

function textoTemaEditado(tema) {
  return `Tema ${tema.id} actualizado: «${tema.titulo}».`;
}

function textoTemaDescartado(tema) {
  return `Tema ${tema.id} descartado: «${tema.titulo}».`;
}

function seccionTema_(tema, hoy, permisos, mostrarResponsable) {
  const detalle = [
    tema.tipo,
    `${tema.duracion} min`,
    `urgencia ${urgenciaEfectiva(tema, hoy)}`,
    tema.preparacion,
  ];
  if (mostrarResponsable) detalle.unshift(tema.responsable);
  if (tema.asignado) detalle.push(`asignado por ${tema.proponente}`);
  const botones = [];
  const parametros = [{ key: 'id', value: tema.id }];
  if (permisos.editar)
    botones.push({ text: 'Editar', onClick: { action: { function: 'editarMiTema', parameters: parametros } } });
  if (permisos.descartar)
    botones.push({
      text: 'Descartar',
      onClick: { action: { function: 'pedirDescarte', parameters: parametros } },
    });
  const widgets = [
    {
      decoratedText: {
        topLabel: `${tema.id} · ${tema.estado}`,
        text: tema.titulo,
        bottomLabel: detalle.join(' · '),
        wrapText: true,
      },
    },
  ];
  if (botones.length) widgets.push({ buttonList: { buttons: botones } });
  return { widgets };
}

function campoResponsable_(asignables, seleccionado, quienPropone) {
  if (!asignables || !asignables.length) return [];
  return [
    {
      selectionInput: {
        name: 'responsable',
        label: 'Responsable (asígnalo a otra persona si hace falta)',
        type: 'DROPDOWN',
        items: asignables.map((p) => ({
          text: p.email === quienPropone ? `${p.nombre} (tú)` : p.nombre,
          value: p.email,
          selected: p.email === seleccionado,
        })),
      },
    },
  ];
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
