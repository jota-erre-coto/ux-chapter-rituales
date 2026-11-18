// Adaptador de Calendar. Lee las ocurrencias del evento del ritual, identificado por
// el ID de su serie y nunca por el título (hay otra serie con el mismo nombre).

// Fechas locales ('AAAA-MM-DD') de las ocurrencias no canceladas entre lunes y domingo.
// Una ocurrencia cancelada no aparece en el calendario, así que tampoco aquí.
function sesionesDeLaSemana_(ritual, lunes) {
  const inicio = Utilities.parseDate(`${lunes} 00:00`, ritual.zonaHoraria, 'yyyy-MM-dd HH:mm');
  const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  return calendarioDelOrganizador_(ritual)
    .getEvents(inicio, fin)
    .filter((evento) => evento.getId().split('@')[0] === ritual.eventoSerieId)
    .map((evento) => Utilities.formatDate(evento.getStartTime(), ritual.zonaHoraria, 'yyyy-MM-dd'));
}

// ¿Está hoy el organizador fuera de la oficina? Lo dice un evento de tipo «Fuera de la
// oficina» en su calendario, que solo puede leer la cuenta dueña del servicio.
// opciones.directo: leer el calendario sin pasar por el servicio. Lo usa el propio
// servicio, y cualquier ejecución con la cuenta del organizador.
// opciones.sinCache: no fiarse de la caché. Lo usan los hitos, que deciden a quién
// escribir y no pueden actuar con una respuesta de hace diez minutos.
// El resultado se guarda en caché diez minutos para que /tema no espere al servicio.
function organizadorAusente_(ritual, opciones) {
  opciones = opciones || {};
  const hoy = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const cache = CacheService.getScriptCache();
  const clave = `ausencia:${ritual.organizador}:${hoy}`;
  if (!opciones.sinCache) {
    const guardado = cache.get(clave);
    if (guardado !== null) return guardado === 'si';
  }

  let ausente;
  const esOrganizador = Session.getEffectiveUser().getEmail().toLowerCase() === ritual.organizador;
  if (opciones.directo || esOrganizador) {
    ausente = ausenteEseDia(ausenciasDelDia_(ritual, hoy), hoy);
  } else {
    const respuesta = llamarServicio_('ausencia', ritual, {});
    if (!respuesta.ok) throw new Error(Object.values(respuesta.errores).join(' '));
    ausente = respuesta.ausente;
  }
  cache.put(clave, ausente ? 'si' : 'no', 600);
  return ausente;
}

// Eventos de fuera de la oficina del organizador que tocan ese día, en hora local.
function ausenciasDelDia_(ritual, fecha) {
  const inicio = Utilities.parseDate(`${fecha} 00:00`, ritual.zonaHoraria, 'yyyy-MM-dd HH:mm');
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  const formato = (d) => Utilities.formatDate(d, ritual.zonaHoraria, "yyyy-MM-dd'T'HH:mm");
  return calendarioDelOrganizador_(ritual)
    .getEvents(inicio, fin)
    .filter((evento) => evento.getEventType() === CalendarApp.EventType.OUT_OF_OFFICE)
    .map((evento) => ({ desde: formato(evento.getStartTime()), hasta: formato(evento.getEndTime()) }));
}

function calendarioDelOrganizador_(ritual) {
  const calendario = CalendarApp.getCalendarById(ritual.organizador);
  if (!calendario) throw new Error(`No se puede leer el calendario de ${ritual.organizador}.`);
  return calendario;
}
