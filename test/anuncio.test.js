// Anuncio del martes y cancelación (anuncio.js), con dobles en memoria.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { cargarEn } = require('./cargar');

const RITUAL = { organizador: 'org@x.com', suplente: 'sup@x.com', espacio: 'spaces/AAA' };
const LUNES = '2026-11-23';
const SESION = '2026-11-26';
const tema = (id) => ({ id, titulo: id, estado: 'seleccionado', duracion: 15, responsable: 'r@x.com', tipo: 'Informar' });

function montar({ propuesta, fallaHiloDe = null, aplazarFalla = false }) {
  const ctx = vm.createContext({ console: { error() {}, log() {} } });
  const s = cargarEn(ctx, 'dominio.js', 'confirmacion.js', 'ronda.js', 'anuncio.js');
  const estado = { propuesta, publicados: [], privados: [], llamadas: [], fallaHiloDe };
  const copia = (x) => JSON.parse(JSON.stringify(x));
  Object.assign(ctx, {
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    leerPropuesta_: () => copia(estado.propuesta),
    guardarPropuesta_: (p) => (estado.propuesta = copia(p)),
    leerTemas_: () => [tema('DR-1'), tema('DR-2')],
    claveDeRitual_: () => 'dr',
    organizadorAusente_: () => false,
    destinatarioGestion: (r) => r.organizador,
    publicarEnEspacio_: (e, m) => (estado.publicados.push(m), { name: `msg-${estado.publicados.length}` }),
    publicarEnHilo_: (e, clave, m) => {
      if (estado.fallaHiloDe && clave.endsWith(estado.fallaHiloDe)) throw new Error('fallo de Chat');
      estado.publicados.push(m);
      return { thread: { name: `spaces/AAA/threads/${clave}` } };
    },
    enviarPrivadoPorEmail_: (r, e, m) => (estado.privados.push(m), { name: 'p' }),
    llamarServicio_: (accion) => (estado.llamadas.push(accion), aplazarFalla && accion === 'aplazar' ? { ok: false, errores: {} } : { ok: true }),
    mensajeAnuncio: () => ({ tipo: 'cabecera' }),
    mensajeTemaAnunciado: (t) => ({ tipo: 'tema', id: t.id }),
    mensajeCancelacion: () => ({ tipo: 'cancelacion' }),
    mensajeTemasAplazados: () => ({ tipo: 'aplazados' }),
  });
  return { s, estado };
}

const confirmada = (extra) => Object.assign(
  { estado: 'confirmada', sesion: SESION, ids: ['DR-1', 'DR-2'], confirmaciones: { 'DR-1': 'confirmado', 'DR-2': 'confirmado' } },
  extra
);

test('un anuncio que falla a mitad se completa sin repetir la cabecera ni los hilos', () => {
  const m = montar({ propuesta: confirmada(), fallaHiloDe: 'DR-2' });
  assert.throws(() => m.s('anunciar_')(RITUAL, { sesion: SESION, lunes: LUNES }));
  m.estado.fallaHiloDe = null;
  m.s('anunciar_')(RITUAL, { sesion: SESION, lunes: LUNES });
  const tipos = m.estado.publicados.map((p) => p.tipo + (p.id || ''));
  assert.deepEqual(tipos, ['cabecera', 'temaDR-1', 'temaDR-2']);
  assert.deepEqual(Object.keys(m.estado.propuesta.anuncio.hilos), ['DR-1', 'DR-2']);
  assert.equal(m.estado.propuesta.anuncio.completo, undefined);
  m.s('anunciar_')(RITUAL, { sesion: SESION, lunes: LUNES });
  assert.equal(m.estado.publicados.length, 3);
});

test('si no se pueden aplazar los temas, la sesión no se da por cancelada', () => {
  const m = montar({ propuesta: confirmada({ anuncio: { mensaje: 'm', hilos: {} } }), aplazarFalla: true });
  m.s('revisarCancelacion_')(RITUAL, { lunes: LUNES, sesiones: [], hoy: '2026-11-24' });
  assert.ok(!m.estado.propuesta.cancelada);
  assert.equal(m.estado.publicados.length, 0);
});

test('una sesión anunciada que desaparece del calendario se cancela una sola vez', () => {
  const m = montar({ propuesta: confirmada({ anuncio: { mensaje: 'm', hilos: {} } }) });
  m.s('revisarCancelacion_')(RITUAL, { lunes: LUNES, sesiones: [], hoy: '2026-11-24' });
  m.s('revisarCancelacion_')(RITUAL, { lunes: LUNES, sesiones: [], hoy: '2026-11-24' });
  assert.ok(m.estado.propuesta.cancelada);
  assert.deepEqual(m.estado.publicados.map((p) => p.tipo), ['cancelacion']);
});
