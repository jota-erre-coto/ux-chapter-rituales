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
      valores.preparacion || PREPARACIONES.laTendre
    ),
    {
      textParagraph: {
        text:
          'La urgencia sube un punto cada 3 semanas que el tema espera. ' +
          'Un tema con «Falta preparación» no entra en la propuesta del lunes: cámbialo en /mis-temas cuando esté listo.',
      },
    },
    { textParagraph: { text: '<b>Opcional.</b> Puedes añadir el contexto y el enlace ahora o al confirmar tu tema.' } },
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
    `Tema guardado en el backlog: «${tema.titulo}» (${tema.id}).\n` +
    `${tema.tipo} · ${tema.duracion} min · urgencia ${tema.urgencia} · ${preparacionEnTercera_(tema.preparacion)}.\n` +
    'Cada lunes a las 13:00 se eligen los temas de la sesión de esa semana. Si entra el tuyo, ' +
    'te pediremos el martes a las 11:00 que confirmes que lo llevas. Ese aviso te llega por el chat ' +
    'con Rituales del Chapter UX: si aún no lo has abierto, ábrelo.'
  );
}

// Diálogo de /mis-temas. propios: temas de los que la persona es responsable.
// otros: resto del backlog abierto, solo para el organizador y el suplente.
// permisos(tema) devuelve { editar, descartar } para pintar solo los botones válidos.
function dialogoMisTemas(propios, otros, hoy, permisos) {
  const sections = [];
  if (!propios.length) {
    sections.push({
      widgets: [{ textParagraph: { text: 'No tienes temas propios. Usa /tema para proponer uno.' } }],
    });
  }
  propios.forEach((tema) => sections.push(seccionTema_(tema, hoy, permisos(tema))));
  if (otros.length) {
    sections.push({
      header: 'Temas del resto del Chapter',
      widgets: [{ textParagraph: { text: 'Puedes descartarlos si dejan de tener sentido.' } }],
    });
    otros.forEach((tema) => sections.push(seccionTema_(tema, hoy, permisos(tema), true)));
  }
  return { header: { title: 'Mis temas' }, sections };
}

function dialogoConfirmarDescarte(tema) {
  return {
    header: { title: 'Descartar tema' },
    sections: [
      {
        widgets: [
          {
            textParagraph: {
              text: `¿Descartas «${tema.titulo}» (${tema.id})? Saldrá del backlog y no se tratará en ninguna sesión. Si cambias de idea, tendrás que proponerlo de nuevo.`,
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
    `${quienAsigna} te ha asignado el tema «${tema.titulo}» (${tema.id}) para la Design Review. ` +
    'Eres su responsable: lo preparas y lo presentas.\n' +
    'Cuando entre en una sesión, te pediremos que confirmes que lo llevas o que avises de que no puedes.\n' +
    'Revisa sus datos y edítalos con /mis-temas.'
  );
}

// Nombres de las personas en los textos. nombres: { email: nombre } de los miembros
// del espacio; a quien no esté (o si no se han podido leer) se le nombra por su email.
function conNombres(temas, nombres) {
  return temas.map((t) =>
    Object.assign({}, t, {
      responsableNombre: nombres[t.responsable] || t.responsable,
      proponenteNombre: nombres[t.proponente] || t.proponente,
    })
  );
}

function responsableDe_(tema) {
  return tema.responsableNombre || tema.responsable;
}

function proponenteDe_(tema) {
  return tema.proponenteNombre || tema.proponente;
}

// Primera línea de los mensajes de gestión que le llegan al suplente: por qué le llegan.
// Vacía si le llegan al organizador.
function textoPorAusencia(ritual, destinatario, nombres) {
  if (destinatario === ritual.organizador) return '';
  const quien = (nombres || {})[ritual.organizador] || ritual.organizador;
  return `Te llega a ti porque ${quien} está fuera de la oficina.\n`;
}

// Preparación en tercera persona, para tarjetas que hablan de otra persona: «Lista»
// suelto se confunde y «La tendré» está en primera persona.
function preparacionEnTercera_(preparacion) {
  const textos = {
    [PREPARACIONES.lista]: 'preparación lista',
    [PREPARACIONES.laTendre]: 'la tendrá para la sesión',
    [PREPARACIONES.falta]: 'falta preparación',
  };
  return textos[preparacion] || preparacion;
}

// Respuesta a quien asigna, según se haya podido avisar o no al responsable.
function textoTemaAsignado(tema, avisado) {
  const quien = responsableDe_(tema);
  const aviso = avisado
    ? `Se ha avisado a ${quien} por mensaje privado.`
    : `No se ha podido avisar a ${quien}: todavía no ha abierto un chat con la app. Díselo tú. ` +
      'Mientras no lo abra, no recibirá la petición de confirmación del martes.';
  return `Tema «${tema.titulo}» (${tema.id}) asignado a ${quien}.\n${aviso}`;
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
    preparacionEnTercera_(tema.preparacion),
  ];
  if (mostrarResponsable) detalle.unshift(responsableDe_(tema));
  if (tema.asignado) detalle.push(`asignado por ${proponenteDe_(tema)}`);
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
          ? `${tema.id} · creado el ${fechaCorta(tema.fechaAlta)} · ${tema.estado}`
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
      `Si quieres traer un tema, propónlo antes de las ${cierre} de hoy y lo tendremos en cuenta para esta sesión. ` +
      'Si llega más tarde, se valorará para la siguiente.',
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

// Fecha 'AAAA-MM-DD' de un hito ({ dia: 1 = lunes }) en la semana que empieza en lunes.
function fechaDeHito_(lunes, cuando) {
  const d = new Date(`${lunes}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + cuando.dia - 1);
  return d.toISOString().slice(0, 10);
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

  const porAusencia =
    propuesta.enSustitucion && !confirmada
      ? `Te llega a ti porque ${propuesta.organizadorNombre || ritual.organizador} está fuera de la oficina.\n`
      : '';
  const cabecera = confirmada
    ? `Propuesta confirmada para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`
    : `${porAusencia}Propuesta de temas para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`;

  const sections = [];
  if (!seleccion.length) {
    sections.push({
      widgets: [
        {
          textParagraph: {
            text: `No hay ningún tema del backlog que se pueda proponer: los que tienen «Falta preparación» no entran. Si alguno se prepara a tiempo, añádelo antes del ${diaDeHito_(plazo)} a las ${plazo.hora} o esta semana no habrá temas que anunciar.`,
          },
        },
      ],
    });
  }
  seleccion.forEach((t) => {
    const detalle = [`responsable: ${responsableDe_(t)}`, `urgencia ${urgenciaEfectiva(t, hoy)}`, preparacionEnTercera_(t.preparacion)];
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

  const pie = [`Ocupan ${minutos} de los ${ritual.duracionSesionMin} minutos de la sesión.`];
  if (sustitutos.length && !confirmada) {
    pie.push(`Sustitutos si alguien no confirma: ${sustitutos.map((t) => `«${t.titulo}» (${t.id})`).join(', ')}.`);
  }
  const cuandoPlazo = `el ${diaDeHito_(plazo)} a las ${plazo.hora}`;
  if (confirmada) {
    pie.push(`${cuandoPlazo[0].toUpperCase()}${cuandoPlazo.slice(1)} pediremos a cada responsable que confirme su tema.`);
  } else if (seleccion.length && hoy <= fechaDeHito_(propuesta.lunes, plazo)) {
    // Si el plazo ya ha pasado (una propuesta lanzada a mano), no se menciona.
    pie.push(
      `Confírmala antes del ${diaDeHito_(plazo)} a las ${plazo.hora}. Entonces pediremos a cada responsable que confirme su tema. ` +
        'Si no la confirmas, esta semana no se anunciará ningún tema.'
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
        text: 'Dejar solo uno',
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
        label: 'Quitar de la propuesta',
        type: 'DROPDOWN',
        items: [{ text: 'Ninguno (solo añadir, si cabe)', value: '', selected: !seleccion.length }].concat(
          seleccion.map((t, i) => ({ text: etiqueta(t), value: t.id, selected: i === 0 }))
        ),
      },
    },
    {
      selectionInput: {
        name: 'entra',
        label: 'Añadir en su lugar',
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
    header: { title: 'Dejar solo un tema' },
    sections: [
      {
        widgets: [
          {
            selectionInput: {
              name: 'queda',
              label: 'Tema que se queda (tendrá toda la sesión)',
              type: 'RADIO_BUTTON',
              items: seleccion.map((t, i) => ({ text: `${t.id} · ${t.titulo}`, value: t.id, selected: i === 0 })),
            },
          },
          {
            buttonList: {
              buttons: [{ text: 'Dejar solo este', onClick: { action: { function: 'aplicarSoloUno', parameters: parametros } } }],
            },
          },
        ],
      },
    ],
  };
}

// Aviso del martes cuando la propuesta no se confirmó.
function mensajeSinConfirmar(ritual, sesion, porAusencia) {
  return {
    text:
      (porAusencia || '') +
      `La propuesta de temas para la ${ritual.nombre} del ${fechaLarga(sesion)} no se ha confirmado, ` +
      'así que esta semana no habrá anuncio. Los temas siguen en el backlog.',
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
      `Tu tema «${tema.titulo}» (${tema.id}) entra en la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.\n` +
      `Confirma antes de las ${plazo.hora} de hoy que lo llevas preparado: tendrás ${tema.duracion} min.\n` +
      'Si no puedes, pulsa «No puedo» y se decidirá si otro tema ocupa su lugar. Si no respondes a tiempo, también.' +
      (faltaInfo ? '\nAl confirmarlo, añade el contexto y el enlace para que el Chapter llegue preparado.' : ''),
    cardsV2: tarjeta_('confirmacion', [
      {
        decoratedText: {
          topLabel: `${tema.id} · ${tema.duracion} min · ${tema.tipo}`,
          text: tema.titulo,
          bottomLabel: preparacionEnTercera_(tema.preparacion),
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
    { textParagraph: { text: `Confirmas que llevas <b>«${tema.titulo}»</b> (${tema.id}). Añade el contexto y el enlace para que el Chapter llegue preparado. Son opcionales.` } },
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
  return { header: { title: 'Confirmar tu tema' }, sections: [{ widgets }] };
}

// La petición, ya respondida, sin botones.
function mensajeConfirmacionRespondida(ritual, propuesta, tema, respuesta) {
  const texto =
    respuesta === CONFIRMACION.confirmado
      ? `Confirmado: llevas «${tema.titulo}» (${tema.id}) a la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}. ` +
        `Hoy a las ${ritual.hitos.anuncio.hora} se anuncia en el espacio y el Chapter podrá dejarte dudas en el hilo del tema.`
      : `Entendido: «${tema.titulo}» (${tema.id}) no irá a la sesión del ${fechaLarga(propuesta.sesion)} y vuelve al backlog. ` +
        'Puedes verlo en /mis-temas.';
  return { text: texto, cardsV2: [] };
}

// Oferta de sustituto para el organizador (o el suplente). motivo: 'no_puede' | 'sin_respuesta'.
// porAusencia: texto de textoPorAusencia, si le llega al suplente.
function mensajeOfertaSustituto(ritual, propuesta, sale, entra, motivo, porAusencia) {
  const limite = ritual.hitos.anuncio.hora;
  const porque =
    (porAusencia || '') +
    (motivo === CONFIRMACION.noPuede
      ? `${responsableDe_(sale)} no puede presentar «${sale.titulo}» (${sale.id}).`
      : `${responsableDe_(sale)} no ha confirmado «${sale.titulo}» (${sale.id}).`) +
    `\nDecide antes de las ${limite}, cuando se anuncia la sesión. Si no sustituyes o no decides, el tema sale de la sesión.`;
  const parametros = parametrosRonda_(propuesta, { sale: sale.id, entra: entra ? entra.id : '' });
  const widgets = [];
  if (entra) {
    widgets.push(
      {
        decoratedText: {
          topLabel: `Tema que lo sustituiría · ${entra.id} · ${entra.duracion} min · ${entra.tipo}`,
          text: entra.titulo,
          bottomLabel:
            entra.responsable === sale.responsable
              ? `responsable: también ${responsableDe_(entra)} · ${preparacionEnTercera_(entra.preparacion)}`
              : `responsable: ${responsableDe_(entra)} · ${preparacionEnTercera_(entra.preparacion)}`,
          wrapText: true,
        },
      },
      botones_([
        { text: 'Sustituir', onClick: { action: { function: 'aplicarSustitucion', parameters: parametros } } },
        { text: 'No sustituir', onClick: { action: { function: 'rechazarSustitucion', parameters: parametros } } },
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
      ? `Sustituido: «${entra.titulo}» (${entra.id}) entra en lugar de «${sale.titulo}» (${sale.id}).`
      : `«${sale.titulo}» (${sale.id}) sale de la sesión sin sustituto.`,
    cardsV2: [],
  };
}

// Aviso al responsable de un tema que entra como sustituto.
function mensajeAvisoSustituto(ritual, propuesta, tema) {
  return {
    text:
      `Tu tema «${tema.titulo}» (${tema.id}) entra en la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)} ` +
      'porque otro tema no podrá presentarse. Como lo tenías listo, no hace falta que lo confirmes. ' +
      `Se anuncia hoy a las ${ritual.hitos.anuncio.hora}. Si no puedes llevarlo, avisa antes a quien organiza la sesión.`,
  };
}

// Cuando no queda ningún tema: cancelar la sesión o anunciarla como abierta.
function mensajeSinTemas(ritual, propuesta, porAusencia) {
  const parametros = (decision) => parametrosRonda_(propuesta, { decision });
  const limite = ritual.hitos.anuncio.hora;
  return {
    text: `${porAusencia || ''}No queda ningún tema confirmado para la ${ritual.nombre} del ${fechaLarga(propuesta.sesion)}.`,
    cardsV2: tarjeta_('sin-temas', [
      {
        textParagraph: {
          text:
            `Decide antes de las ${limite}: cancelar la sesión o anunciarla como sesión abierta, sin temas preparados. ` +
            'Si no decides, no se anunciará nada.',
        },
      },
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
        ? 'Sesión cancelada. Se avisará en el espacio a la hora del anuncio. ' +
          'El evento del calendario no se toca: quítalo tú si hace falta.'
        : 'Sesión abierta: se anunciará en el espacio a la hora del anuncio, sin temas preparados.',
    cardsV2: [],
  };
}

// Qué preparar antes de la sesión según el tipo de feedback.
const ANTES_DE_LA_SESION = {
  'Decidir entre opciones': 'Revisa las opciones y llega con una preferencia razonada.',
  'Validar una propuesta': 'Revisa la propuesta y apunta lo que te haga dudar.',
  'Abrir un debate': 'Piensa tu postura y trae algún ejemplo que la apoye.',
  Informar: 'Basta con echar un vistazo al enlace. No hace falta preparar nada.',
};

function antesDeLaSesion(tipo) {
  return ANTES_DE_LA_SESION[tipo] || 'Echa un vistazo al contexto y al enlace antes de la sesión.';
}

// Cabecera del anuncio del martes. facilita: nombre (o email) de quien facilita la sesión.
function mensajeAnuncio(ritual, sesion, temas, facilita) {
  const minutos = temas.reduce((suma, t) => suma + t.duracion, 0);
  const lista = temas.map((t) => `• «${t.titulo}» (${t.id}) · ${responsableDe_(t)} · ${t.duracion} min`).join('\n');
  return {
    text:
      `${ritual.nombre} del ${fechaLarga(sesion)}. La facilita ${facilita}.\n` +
      `Temas de la sesión (${minutos} min):\n${lista}\n` +
      'Cada tema tiene su hilo: deja ahí tus dudas antes de la sesión.',
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
        bottomLabel: `responsable: ${responsableDe_(tema)}`,
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
      `${ritual.nombre} del ${fechaLarga(sesion)}: esta semana es una sesión abierta, sin temas preparados. La facilita ${facilita}.\n` +
      'Si quieres comentar algo, tráelo y lo vemos entre todos.',
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
// temas: [{ id, titulo }] de los temas seleccionados.
function mensajeTemasAplazados(ritual, sesion, temas) {
  const lista = temas.map((t) => (t.titulo ? `«${t.titulo}» (${t.id})` : t.id)).join(', ');
  return {
    text:
      `La ${ritual.nombre} del ${fechaLarga(sesion)} ya no está en el calendario. ` +
      `Los temas seleccionados (${lista}) vuelven al backlog con preferencia para la próxima sesión.`,
  };
}
