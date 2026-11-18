// Planificador de hitos. Lógica pura: trabaja con fechas y horas locales del ritual
// ('AAAA-MM-DD' y 'AAAA-MM-DDTHH:mm'), así que los cambios de hora los resuelve quien
// convierte el instante actual a hora local, no este módulo.

const HITO_SIN_SESION = 'sinSesion';

// Pasado este margen, un hito que no se ejecutó a su hora ya no se lanza: una
// convocatoria el martes por la tarde no sirve de nada.
const HORAS_VENTANA_HITO = 3;

// Hitos que tocan ahora. ahoraLocal: 'AAAA-MM-DDTHH:mm' en la zona del ritual.
// sesiones: fechas locales de las ocurrencias no canceladas del evento esa semana.
// ejecutados: hitos ya lanzados esa semana. Devuelve [{ hito, momento, sesion }].
function hitosPendientes(ritual, ahoraLocal, sesiones, ejecutados) {
  const lunes = lunesDe(ahoraLocal.slice(0, 10));
  const sesion = sesiones.filter((f) => lunesDe(f) === lunes).sort()[0] || null;
  const hechos = ejecutados || [];
  const limite = sumarMinutos_(ahoraLocal, -HORAS_VENTANA_HITO * 60);

  // Sin sesión esa semana solo se avisa, a la hora de la convocatoria.
  const programa = sesion
    ? Object.keys(ritual.hitos).map((hito) => ({ hito, cuando: ritual.hitos[hito] }))
    : [{ hito: HITO_SIN_SESION, cuando: ritual.hitos.convocatoria }];

  return programa
    .map(({ hito, cuando }) => ({
      hito,
      momento: `${sumarDias(lunes, cuando.dia - 1)}T${cuando.hora}`,
      sesion,
    }))
    .filter((h) => h.momento <= ahoraLocal && h.momento > limite && !hechos.includes(h.hito))
    .sort((a, b) => (a.momento < b.momento ? -1 : 1));
}

// Lunes de la semana de una fecha 'AAAA-MM-DD'.
function lunesDe(fecha) {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Suma minutos a una hora local 'AAAA-MM-DDTHH:mm' como reloj de pared, sin zona.
function sumarMinutos_(local, minutos) {
  const d = new Date(`${local}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutos);
  return d.toISOString().slice(0, 16);
}
