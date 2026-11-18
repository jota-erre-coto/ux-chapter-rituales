// Adaptador de Calendar. Lee las ocurrencias del evento del ritual, identificado por
// el ID de su serie y nunca por el título (hay otra serie con el mismo nombre).

// Fechas locales ('AAAA-MM-DD') de las ocurrencias no canceladas entre lunes y domingo.
// Una ocurrencia cancelada no aparece en el calendario, así que tampoco aquí.
function sesionesDeLaSemana_(ritual, lunes) {
  const inicio = Utilities.parseDate(`${lunes} 00:00`, ritual.zonaHoraria, 'yyyy-MM-dd HH:mm');
  const fin = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  const calendario = CalendarApp.getCalendarById(ritual.organizador);
  if (!calendario) throw new Error(`No se puede leer el calendario de ${ritual.organizador}.`);
  return calendario
    .getEvents(inicio, fin)
    .filter((evento) => evento.getId().split('@')[0] === ritual.eventoSerieId)
    .map((evento) => Utilities.formatDate(evento.getStartTime(), ritual.zonaHoraria, 'yyyy-MM-dd'));
}

// ¿Está hoy el organizador fuera de la oficina? Lo dice un evento de tipo «Fuera de la
// oficina» en su calendario. Solo la cuenta dueña (el organizador) puede leerlo; para
// cualquier otra persona se pregunta al servicio del registro, que se ejecuta como ella.
// El resultado se guarda en caché diez minutos.
function organizadorAusente_(ritual) {
  const hoy = Utilities.formatDate(new Date(), ritual.zonaHoraria, 'yyyy-MM-dd');
  const cache = CacheService.getScriptCache();
  const clave = `ausencia:${ritual.organizador}:${hoy}`;
  const guardado = cache.get(clave);
  if (guardado !== null) return guardado === 'si';

  let ausente;
  if (Session.getEffectiveUser().getEmail().toLowerCase() === ritual.organizador) {
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
  return CalendarApp.getCalendarById(ritual.organizador)
    .getEvents(inicio, fin)
    .filter((evento) => evento.getEventType() === CalendarApp.EventType.OUT_OF_OFFICE)
    .map((evento) => ({ desde: formato(evento.getStartTime()), hasta: formato(evento.getEndTime()) }));
}
