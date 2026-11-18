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
