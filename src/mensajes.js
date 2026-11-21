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
        hintText: 'Qué está en juego y qué necesitas del Chapter. Admite varias líneas.',
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

// Diálogo con un único aviso, para cuando un comando que abre diálogo no puede hacerlo.
function dialogoAviso(texto) {
  return { header: { title: 'Rituales del Chapter UX' }, sections: [{ widgets: [{ textParagraph: { text: texto } }] }] };
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
        topLabel: tema.fechaAlta
          ? `${tema.id} · ${fechaCorta(tema.fechaAlta)} · ${tema.estado}`
          : `${tema.id} · ${tema.estado}`,
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

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 'AAAA-MM-DD' → 'miércoles 25 de noviembre'.
function fechaLarga(fecha) {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${DIAS_SEMANA[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

// 'AAAA-MM-DD' → '3 nov 2026'.
function fechaCorta(fecha) {
  const d = new Date(`${fecha}T00:00:00Z`);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

// Convocatoria del lunes: mensaje con botón que abre el diálogo de alta.
// ritual: { nombre, hitos }; sesion: fecha de la sesión de la semana.
function mensajeConvocatoria(ritual, sesion) {
  const cierre = ritual.hitos.propuesta.hora;
  return {
    text:
      `Convocatoria de temas para la ${ritual.nombre} del ${fechaLarga(sesion)}.\n` +
      `Si tienes algo que llevar, propónlo antes de las ${cierre} de hoy. ` +
      'Lo que llegue después entrará en la selección de la semana siguiente.',
    cardsV2: [
      {
        cardId: 'convocatoria',
        card: {
          sections: [
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: 'Proponer tema',
                        onClick: { action: { function: 'abrirAltaTema', interaction: 'OPEN_DIALOG' } },
                      },
                      botonActa_(ritual),
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// Enlace al Documento de sesiones, para llegar a lo acordado en sesiones anteriores.
function urlActa(ritual) {
  return `https://docs.google.com/document/d/${ritual.actaId}/edit`;
}

function botonActa_(ritual) {
  return { text: 'Ver acuerdos anteriores', onClick: { openLink: { url: urlActa(ritual) } } };
}

// Aviso del lunes cuando esa semana no hay sesión. lunes: 'AAAA-MM-DD'.
function mensajeSinSesion(ritual, lunes) {
  return {
    text:
      `Esta semana no hay ${ritual.nombre}, así que no hay convocatoria de temas. ` +
      'Los temas del backlog siguen ahí para la próxima sesión, y puedes proponer nuevos con /tema.',
  };
}

// Diálogo de /hito: un botón por hito que se puede lanzar a mano.
function dialogoLanzarHito(hitos) {
  return {
    header: { title: 'Lanzar un hito a mano' },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: 'Solo en el ritual de pruebas. Se lanza como si fuera su hora, para la semana actual.',
            },
          },
          {
            buttonList: {
              buttons: hitos.map((hito) => ({
                text: hito,
                onClick: { action: { function: 'lanzarHitoManual', parameters: [{ key: 'hito', value: hito }] } },
              })),
            },
          },
        ],
      },
    ],
  };
}

// Día de la semana de un hito ({ dia: 1 = lunes }) para los textos.
function diaDeHito_(cuando) {
  return DIAS_SEMANA[cuando.dia % 7];
}

// Tarjeta privada de la propuesta de selección.
// propuesta: { claveRitual, lunes, sesion, estado: 'pendiente' | 'confirmada', confirmadaPor }
// seleccion, sustitutos: temas completos; hoy: 'AAAA-MM-DD'.
function mensajePropuesta(ritual, propuesta, seleccion, sustitutos, hoy) {
  const minutos = seleccion.reduce((suma, t) => suma + t.duracion, 0);
  const confirmada = propuesta.estado === 'confirmada';
  const plazo = ritual.hitos.confirmacion;
  const parametros = [
    { key: 'ritual', value: propuesta.claveRitual },
    { key: 'lunes', value: propuesta.lunes },
  ];

  const cabecera = confirmada
    ? `Propuesta confirmada${propuesta.confirmadaPor ? ` por ${propuesta.confirmadaPor}` : ''} para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`
    : `Propuesta de temas para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`;

  const sections = [];
  if (!seleccion.length) {
    sections.push({
      widgets: [
        {
          textParagraph: {
            text: 'No hay ningún tema preparado en el backlog. Si no añades uno, esta semana no habrá temas que anunciar.',
          },
        },
      ],
    });
  }
  seleccion.forEach((t) => {
    const detalle = [`responsable: ${t.responsable}`, `urgencia ${urgenciaEfectiva(t, hoy)}`, t.preparacion];
    if (t.preferencia) detalle.push('aplazado de la sesión anterior');
    sections.push({
      widgets: [
        {
          decoratedText: {
            topLabel: `${t.id} · ${t.duracion} min · ${t.tipo}`,
            text: t.titulo,
            bottomLabel: detalle.join(' · '),
            wrapText: true,
          },
        },
      ],
    });
  });

  const pie = [`${minutos} de ${ritual.duracionSesionMin} minutos.`];
  if (propuesta.enSustitucion && !confirmada) {
    pie.unshift(`Te llega a ti porque ${ritual.organizador} está fuera de la oficina.`);
  }
  if (sustitutos.length) pie.push(`Sustitutos si alguien no confirma: ${sustitutos.map((t) => t.id).join(', ')}.`);
  if (!confirmada) {
    pie.push(
      `Si no la confirmas antes del ${diaDeHito_(plazo)} a las ${plazo.hora}, no se pedirá confirmación a nadie ni se anunciará nada.`
    );
  }
  const widgetsPie = [{ textParagraph: { text: pie.join('<br>') } }];
  if (!confirmada) {
    const botones = [];
    if (seleccion.length)
      botones.push({ text: 'Confirmar', onClick: { action: { function: 'confirmarPropuesta', parameters: parametros } } });
    botones.push({
      text: seleccion.length ? 'Cambiar tema' : 'Añadir tema',
      onClick: { action: { function: 'abrirCambioTema', parameters: parametros, interaction: 'OPEN_DIALOG' } },
    });
    if (seleccion.length > 1)
      botones.push({
        text: 'Solo uno',
        onClick: { action: { function: 'abrirSoloUno', parameters: parametros, interaction: 'OPEN_DIALOG' } },
      });
    widgetsPie.push({ buttonList: { buttons: botones } });
  }
  sections.push({ widgets: widgetsPie });

  return { text: cabecera, cardsV2: [{ cardId: 'propuesta', card: { sections } }] };
}

// Diálogo de «Cambiar tema»: qué sale (o ninguno, para añadir) y qué entra.
// fuera: candidatos del backlog que no están en la selección, por prioridad.
function dialogoCambiarTema(seleccion, fuera, parametros, errores) {
  const etiqueta = (t) => `${t.id} · ${t.duracion} min · ${t.titulo}`;
  const widgets = [];
  const listaErrores = Object.values(errores || {});
  if (listaErrores.length) widgets.push({ textParagraph: { text: `<b>No se ha podido cambiar:</b><br>${listaErrores.join('<br>')}` } });
  if (!fuera.length) {
    widgets.push({ textParagraph: { text: 'No hay más temas preparados en el backlog.' } });
    return { header: { title: 'Cambiar tema' }, sections: [{ widgets }] };
  }
  widgets.push(
    {
      selectionInput: {
        name: 'sale',
        label: 'Sale de la propuesta',
        type: 'DROPDOWN',
        items: [{ text: 'Ninguno: añadirlo si cabe', value: '', selected: !seleccion.length }].concat(
          seleccion.map((t, i) => ({ text: etiqueta(t), value: t.id, selected: i === 0 }))
        ),
      },
    },
    {
      selectionInput: {
        name: 'entra',
        label: 'Entra en su lugar',
        type: 'DROPDOWN',
        items: fuera.map((t, i) => ({ text: etiqueta(t), value: t.id, selected: i === 0 })),
      },
    },
    {
      buttonList: {
        buttons: [{ text: 'Aplicar cambio', onClick: { action: { function: 'aplicarCambioTema', parameters: parametros } } }],
      },
    }
  );
  return { header: { title: 'Cambiar tema' }, sections: [{ widgets }] };
}

// Diálogo de «Solo uno»: elige el único tema que se queda.
function dialogoSoloUno(seleccion, parametros) {
  return {
    header: { title: 'Quedarse con un solo tema' },
    sections: [
      {
        widgets: [
          {
            selectionInput: {
              name: 'queda',
              label: 'Tema que se queda, con toda la sesión para él',
              type: 'RADIO_BUTTON',
              items: seleccion.map((t, i) => ({ text: `${t.id} · ${t.titulo}`, value: t.id, selected: i === 0 })),
            },
          },
          {
            buttonList: {
              buttons: [{ text: 'Quedarme con este', onClick: { action: { function: 'aplicarSoloUno', parameters: parametros } } }],
            },
          },
        ],
      },
    ],
  };
}

// Aviso del martes cuando la propuesta no se confirmó.
function mensajeSinConfirmar(ritual, sesion) {
  return {
    text:
      `No confirmaste la propuesta de temas para la ${ritual.nombre} del ${fechaLarga(sesion)}. ` +
      'Esta semana no se pedirá confirmación a los responsables ni se anunciará nada.',
  };
}

// Parámetros comunes de los botones de la ronda de confirmación.
function parametrosRonda_(propuesta, extra) {
  return [
    { key: 'ritual', value: propuesta.claveRitual },
    { key: 'lunes', value: propuesta.lunes },
  ].concat(Object.keys(extra || {}).map((key) => ({ key, value: extra[key] })));
}

function tarjeta_(cardId, widgets) {
  return [{ cardId, card: { sections: [{ widgets }] } }];
}

function botones_(lista) {
  return { buttonList: { buttons: lista } };
}

// Petición del martes al responsable de un tema seleccionado. Si a su tema le falta
// el contexto o el enlace, «Lo llevo» abre un diálogo para completarlos.
function mensajePeticionConfirmacion(ritual, propuesta, tema) {
  const plazo = ritual.hitos.plazoSustitucion;
  const parametros = parametrosRonda_(propuesta, { id: tema.id });
  const faltaInfo = !tema.contexto || !tema.enlace;
  const llevo = faltaInfo
    ? { text: 'Lo llevo', onClick: { action: { function: 'abrirConfirmacionTema', parameters: parametros, interaction: 'OPEN_DIALOG' } } }
    : { text: 'Lo llevo', onClick: { action: { function: 'confirmarTemaDirecto', parameters: parametros } } };
  return {
    text:
      `Tu tema ${tema.id} está en la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}: «${tema.titulo}».\n` +
      `Confírmalo antes de las ${plazo.hora} de hoy. Si no puedes, avísalo y entrará otro tema en su lugar.` +
      (faltaInfo ? '\nAl confirmarlo, completa el contexto y el enlace para que el Chapter llegue preparado.' : ''),
    cardsV2: tarjeta_('confirmacion', [
      {
        decoratedText: {
          topLabel: `${tema.id} · ${tema.duracion} min · ${tema.tipo}`,
          text: tema.titulo,
          bottomLabel: tema.preparacion,
          wrapText: true,
        },
      },
      botones_([
        llevo,
        { text: 'No puedo', onClick: { action: { function: 'noPuedoTema', parameters: parametros } } },
      ]),
    ]),
  };
}

// Diálogo de «Lo llevo» cuando faltan contexto o enlace.
function dialogoConfirmarTema(tema, parametros, errores) {
  const widgets = [];
  const listaErrores = Object.values(errores || {});
  if (listaErrores.length) widgets.push({ textParagraph: { text: `<b>Revisa esto:</b><br>${listaErrores.join('<br>')}` } });
  widgets.push(
    { textParagraph: { text: `Confirmas que llevas <b>${tema.id} · ${tema.titulo}</b>.` } },
    {
      textInput: {
        name: 'contexto',
        label: 'Contexto',
        type: 'MULTIPLE_LINE',
        hintText: 'Qué está en juego y qué necesitas del Chapter. Admite varias líneas.',
        value: tema.contexto || '',
      },
    },
    { textInput: { name: 'enlace', label: 'Enlace (Figma, Jira…)', type: 'SINGLE_LINE', value: tema.enlace || '' } },
    botones_([{ text: 'Confirmar', onClick: { action: { function: 'guardarConfirmacionTema', parameters: parametros } } }])
  );
  return { header: { title: `Confirmar ${tema.id}` }, sections: [{ widgets }] };
}

// La petición, ya respondida, sin botones.
function mensajeConfirmacionRespondida(ritual, propuesta, tema, respuesta) {
  const texto =
    respuesta === CONFIRMACION.confirmado
      ? `Confirmado: llevas ${tema.id} «${tema.titulo}» a la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`
      : `Hecho: ${tema.id} «${tema.titulo}» no irá a esta sesión y vuelve al backlog.`;
  return { text: texto, cardsV2: [] };
}

// Oferta de sustituto para el organizador (o el suplente). motivo: 'no_puede' | 'sin_respuesta'.
function mensajeOfertaSustituto(ritual, propuesta, sale, entra, motivo) {
  const porque =
    motivo === CONFIRMACION.noPuede
      ? `${sale.responsable} no puede presentar ${sale.id} «${sale.titulo}».`
      : `${sale.responsable} no ha confirmado ${sale.id} «${sale.titulo}».`;
  const parametros = parametrosRonda_(propuesta, { sale: sale.id, entra: entra ? entra.id : '' });
  const widgets = [];
  if (entra) {
    widgets.push(
      {
        decoratedText: {
          topLabel: `Sustituto · ${entra.id} · ${entra.duracion} min · ${entra.tipo}`,
          text: entra.titulo,
          bottomLabel: `responsable: ${entra.responsable} · ${entra.preparacion}`,
          wrapText: true,
        },
      },
      botones_([
        { text: 'Sustituir', onClick: { action: { function: 'aplicarSustitucion', parameters: parametros } } },
        { text: 'Sin sustituto', onClick: { action: { function: 'rechazarSustitucion', parameters: parametros } } },
      ])
    );
  } else {
    widgets.push(
      { textParagraph: { text: 'No hay ningún tema con preparación «Lista» que quepa en su lugar.' } },
      botones_([{ text: 'Quitarlo de la sesión', onClick: { action: { function: 'rechazarSustitucion', parameters: parametros } } }])
    );
  }
  return { text: porque, cardsV2: tarjeta_('sustitucion', widgets) };
}

// La oferta ya resuelta, sin botones.
function mensajeSustitucionResuelta(sale, entra) {
  return {
    text: entra
      ? `Sustituido: ${entra.id} «${entra.titulo}» entra en lugar de ${sale.id}.`
      : `${sale.id} «${sale.titulo}» sale de la sesión sin sustituto.`,
    cardsV2: [],
  };
}

// Aviso al responsable de un tema que entra como sustituto.
function mensajeAvisoSustituto(ritual, propuesta, tema) {
  return {
    text:
      `Tu tema ${tema.id} «${tema.titulo}» entra en la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)} ` +
      'como sustituto de otro que no podrá presentarse. Como lo tenías listo, no hace falta que lo confirmes.',
  };
}

// Cuando no queda ningún tema: cancelar la sesión o anunciarla como abierta.
function mensajeSinTemas(ritual, propuesta) {
  const parametros = (decision) => parametrosRonda_(propuesta, { decision });
  return {
    text: `No queda ningún tema confirmado para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`,
    cardsV2: tarjeta_('sin-temas', [
      { textParagraph: { text: '¿Cancelas la sesión o la anuncias como sesión abierta, sin temas preparados?' } },
      botones_([
        { text: 'Cancelar la sesión', onClick: { action: { function: 'decidirSinTemas', parameters: parametros('cancelar') } } },
        { text: 'Anunciar sesión abierta', onClick: { action: { function: 'decidirSinTemas', parameters: parametros('abierta') } } },
      ]),
    ]),
  };
}

function mensajeSinTemasDecidido(decision) {
  return {
    text:
      decision === 'cancelar'
        ? 'Decidido: esta semana se cancela la sesión. Se publicará en el espacio a la hora del anuncio.'
        : 'Decidido: la sesión se anunciará como abierta, sin temas preparados.',
    cardsV2: [],
  };
}

// Qué preparar antes de la sesión según el tipo de feedback.
const ANTES_DE_LA_SESION = {
  'Decidir entre opciones': 'Revisa las opciones y llega con una preferencia razonada.',
  'Validar una propuesta': 'Revisa la propuesta y apunta lo que te haga dudar.',
  'Abrir un debate': 'Piensa tu postura y trae algún ejemplo que la apoye.',
  Informar: 'Basta con echar un vistazo al enlace; no hace falta preparar nada.',
};

function antesDeLaSesion(tipo) {
  return ANTES_DE_LA_SESION[tipo] || 'Echa un vistazo al contexto y al enlace antes de la sesión.';
}

// Cabecera del anuncio del martes. facilita: email de quien facilita la sesión.
function mensajeAnuncio(ritual, sesion, temas, facilita) {
  const minutos = temas.reduce((suma, t) => suma + t.duracion, 0);
  const lista = temas.map((t) => `• ${t.id} «${t.titulo}» · ${t.responsable} · ${t.duracion} min`).join('\n');
  return {
    text:
      `${ritual.nombre} del ${fechaLarga(sesion)}. Facilita ${facilita}.\n` +
      `Temas (${minutos} min):\n${lista}\n` +
      'Cada tema tiene su hilo justo debajo: deja ahí tus dudas antes de la sesión.',
    cardsV2: tarjeta_('anuncio', [botones_([botonActa_(ritual)])]),
  };
}

// Mensaje de un tema en su propio hilo.
function mensajeTemaAnunciado(tema) {
  const widgets = [
    {
      decoratedText: {
        topLabel: `${tema.id} · ${tema.duracion} min · ${tema.tipo}`,
        text: tema.titulo,
        bottomLabel: `Responsable: ${tema.responsable}`,
        wrapText: true,
      },
    },
  ];
  if (tema.contexto) widgets.push({ textParagraph: { text: `<b>Contexto</b><br>${tema.contexto}` } });
  widgets.push({ textParagraph: { text: `<b>Antes de la sesión</b><br>${antesDeLaSesion(tema.tipo)}` } });
  if (tema.enlace) widgets.push(botones_([{ text: 'Abrir enlace', onClick: { openLink: { url: tema.enlace } } }]));
  return { text: `${tema.id} · ${tema.titulo}`, cardsV2: tarjeta_(`tema-${tema.id}`, widgets) };
}

// Sesión sin temas preparados, por decisión del organizador.
function mensajeSesionAbierta(ritual, sesion, facilita) {
  return {
    text:
      `${ritual.nombre} del ${fechaLarga(sesion)}: sesión abierta, sin temas preparados. Facilita ${facilita}.\n` +
      'Trae lo que tengas entre manos y lo vemos en el momento.',
    cardsV2: tarjeta_('anuncio-abierta', [botones_([botonActa_(ritual)])]),
  };
}

// Cancelación de la sesión. conTemas: si había temas seleccionados, pasan con
// preferencia a la siguiente.
function mensajeCancelacion(ritual, sesion, conTemas) {
  return {
    text:
      `Se cancela la ${ritual.nombre} del ${fechaLarga(sesion)}.` +
      (conTemas ? ' Los temas seleccionados pasan con preferencia a la próxima sesión.' : ''),
  };
}

// Aviso al organizador cuando la sesión desaparece del calendario antes del anuncio.
function mensajeTemasAplazados(ritual, sesion, ids) {
  return {
    text:
      `La ${ritual.nombre} del ${fechaLarga(sesion)} ya no está en el calendario. ` +
      `Los temas seleccionados (${ids.join(', ')}) vuelven al backlog con preferencia para la próxima sesión.`,
  };
}
