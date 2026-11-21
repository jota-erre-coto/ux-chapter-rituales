// Anuncio del martes a las 12:00 y cancelaciones de la sesión.
//
// El anuncio publica una cabecera y un mensaje por tema confirmado, cada uno en su
// propio hilo; el enlace a cada hilo se anota en el registro. Si la sesión desaparece
// del calendario después de la selección, los temas vuelven con preferencia y, si ya
// se habían anunciado, se publica la cancelación.

// Hito del martes a las 12:00.
function anunciar_(ritual, { sesion, lunes }) {
  const claveRitual = claveDeRitual_(ritual);
  const propuesta = leerPropuesta_(claveRitual, lunes);
  if (!propuesta || propuesta.estado !== 'confirmada') return;
  // Un anuncio a medias (falló a mitad) se completa sin repetir lo ya publicado.
  if (propuesta.anuncio && propuesta.anuncio.completo !== false) return;
  const facilita = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
  const confirmados = propuesta.confirmaciones ? temasConfirmados(propuesta) : [];

  if (!confirmados.length) {
    if (propuesta.sinTemas === 'cancelar') {
      publicarEnEspacio_(ritual.espacio, mensajeCancelacion(ritual, sesion, false));
      modificarPropuesta_(claveRitual, lunes, (p) => Object.assign(p, { anuncio: { cancelada: true }, cancelada: true }));
    } else if (propuesta.sinTemas === 'abierta') {
      const publicado = publicarEnEspacio_(ritual.espacio, mensajeSesionAbierta(ritual, sesion, facilita));
      modificarPropuesta_(claveRitual, lunes, (p) => Object.assign(p, { anuncio: { mensaje: publicado.name, hilos: {} } }));
    }
    // Sin decisión del organizador no se anuncia nada: ya se le preguntó a las 11:45.
    return;
  }

  const temas = leerTemas_(ritual);
  const anunciados = confirmados.map((id) => temas.find((t) => t.id === id)).filter(Boolean);
  const guardarAnuncio = (anuncio) => modificarPropuesta_(claveRitual, lunes, (p) => Object.assign(p, { anuncio }));
  let anuncio = propuesta.anuncio;
  if (!anuncio) {
    const cabecera = publicarEnEspacio_(ritual.espacio, mensajeAnuncio(ritual, sesion, anunciados, facilita));
    anuncio = { mensaje: cabecera.name, hilos: {}, completo: false };
    guardarAnuncio(anuncio);
  }
  const hilos = Object.assign({}, anuncio.hilos);
  anunciados.forEach((tema) => {
    if (hilos[tema.id]) return;
    const publicado = publicarEnHilo_(ritual.espacio, `${lunes}-${tema.id}`, mensajeTemaAnunciado(tema));
    hilos[tema.id] = urlHilo_(publicado.thread.name);
    guardarAnuncio({ mensaje: anuncio.mensaje, hilos, completo: false });
  });
  guardarAnuncio({ mensaje: anuncio.mensaje, hilos });
  const anotado = llamarServicio_('anotarHilos', ritual, { hilos });
  if (!anotado.ok) console.error(`No se han podido anotar los hilos: ${JSON.stringify(anotado.errores)}`);
}

// 'spaces/AAA/threads/BBB' → enlace al hilo en Google Chat.
function urlHilo_(hilo) {
  const [, espacio, , id] = hilo.split('/');
  return `https://chat.google.com/room/${espacio}/${id}`;
}

// Se comprueba en cada ejecución del disparador: si la sesión de la propuesta
// confirmada ya no está en el calendario y aún no ha pasado, se cancela.
function revisarCancelacion_(ritual, { lunes, sesiones, hoy }) {
  const claveRitual = claveDeRitual_(ritual);
  const propuesta = leerPropuesta_(claveRitual, lunes);
  if (!propuesta || propuesta.estado !== 'confirmada' || propuesta.cancelada) return;
  if (sesiones.includes(propuesta.sesion) || hoy > propuesta.sesion) return;

  const aplazados = llamarServicio_('aplazar', ritual, { ids: propuesta.ids });
  // Sin aplazar no se da por cancelada: el siguiente disparo lo vuelve a intentar.
  if (!aplazados.ok) {
    console.error(`No se han podido aplazar los temas: ${JSON.stringify(aplazados.errores)}`);
    return;
  }
  const anunciada = propuesta.anuncio && !propuesta.anuncio.cancelada;
  if (anunciada) {
    publicarEnEspacio_(ritual.espacio, mensajeCancelacion(ritual, propuesta.sesion, propuesta.ids.length > 0));
  } else if (propuesta.ids.length) {
    const destinatario = destinatarioGestion(ritual, organizadorAusente_(ritual, { sinCache: true }));
    enviarPrivadoPorEmail_(ritual, destinatario, mensajeTemasAplazados(ritual, propuesta.sesion, propuesta.ids));
  }
  modificarPropuesta_(claveRitual, lunes, (p) => Object.assign(p, { cancelada: true }));
}
