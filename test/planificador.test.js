const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('planificador.js');
const hitosPendientes = simbolo('hitosPendientes');

const ritual = {
  hitos: {
    convocatoria: { dia: 1, hora: '11:00' },
    propuesta: { dia: 1, hora: '13:00' },
    anuncio: { dia: 2, hora: '12:00' },
  },
};

// Convierte un instante UTC a hora local de Madrid, como hará el adaptador.
const madrid = (iso) => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso)).map((p) => [p.type, p.value])
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
};
const nombres = (lista) => [...lista].map((h) => h.hito);

test('el lunes a las 11:00 toca la convocatoria, y no antes', () => {
  const sesiones = ['2026-11-25'];
  assert.deepEqual(nombres(hitosPendientes(ritual, '2026-11-23T10:59', sesiones, [])), []);
  const ahora = hitosPendientes(ritual, '2026-11-23T11:05', sesiones, []);
  assert.deepEqual(nombres(ahora), ['convocatoria']);
  assert.equal(ahora[0].sesion, '2026-11-25');
});

test('un hito ya ejecutado no se repite y el siguiente llega a su hora', () => {
  const sesiones = ['2026-11-25'];
  assert.deepEqual(nombres(hitosPendientes(ritual, '2026-11-23T13:00', sesiones, ['convocatoria'])), ['propuesta']);
});

test('pasadas 3 horas, un hito que no se lanzó ya no se lanza', () => {
  assert.deepEqual(nombres(hitosPendientes(ritual, '2026-11-23T15:30', ['2026-11-25'], ['propuesta'])), []);
});

test('semana sin ocurrencia, o con la ocurrencia cancelada: aviso y ninguna convocatoria', () => {
  // La ocurrencia cancelada no llega en la lista; la de otra semana no cuenta.
  const pendientes = hitosPendientes(ritual, '2026-11-23T11:00', ['2026-12-02'], []);
  assert.deepEqual(nombres(pendientes), ['sinSesion']);
  assert.equal(pendientes[0].sesion, null);
  assert.deepEqual(nombres(hitosPendientes(ritual, '2026-11-23T13:00', [], ['sinSesion'])), []);
});

test('el domingo pertenece a la semana que empezó el lunes anterior', () => {
  const lunesDe = simbolo('lunesDe');
  assert.equal(lunesDe('2026-11-29'), '2026-11-23');
  assert.equal(lunesDe('2026-11-23'), '2026-11-23');
  assert.equal(lunesDe('2027-01-03'), '2026-12-28');
});

test('cambio de hora de octubre: la convocatoria sale a las 11:00 de Madrid, que pasan a ser las 10:00 UTC', () => {
  // El 25 de octubre de 2026 Madrid pasa de UTC+2 a UTC+1.
  const sesiones = ['2026-10-28'];
  assert.deepEqual(nombres(hitosPendientes(ritual, madrid('2026-10-26T09:30:00Z'), sesiones, [])), []);
  assert.deepEqual(nombres(hitosPendientes(ritual, madrid('2026-10-26T10:00:00Z'), sesiones, [])), ['convocatoria']);
});

test('cambio de hora de marzo: la convocatoria sale a las 11:00 de Madrid, que pasan a ser las 9:00 UTC', () => {
  // El 28 de marzo de 2027 Madrid pasa de UTC+1 a UTC+2.
  const sesiones = ['2027-03-31'];
  assert.deepEqual(nombres(hitosPendientes(ritual, madrid('2027-03-29T08:59:00Z'), sesiones, [])), []);
  assert.deepEqual(nombres(hitosPendientes(ritual, madrid('2027-03-29T09:00:00Z'), sesiones, [])), ['convocatoria']);
});
