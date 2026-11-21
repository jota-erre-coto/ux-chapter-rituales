// Ronda de confirmación (ronda.js) y operaciones confirmar/noPuedo del servicio, con
// dobles en memoria del registro, la propuesta y la mensajería de Chat.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { cargarEn } = require('./cargar');

const ORG = 'org@x.com';
const RITUAL = { organizador: ORG, suplente: 'sup@x.com', duracionSesionMin: 45 };
const LUNES = '2026-11-23';

const tema = (id, cambios) => Object.assign(
  { id, estado: 'propuesto', preparacion: 'Lista', urgencia: 3, duracion: 15,
    fechaAlta: '2026-11-16', preferencia: false, responsable: `${id.toLowerCase()}@x.com` },
  cambios
);

function montar({ temas, propuesta, envioFalla = () => false, actualizarFalla = false }) {
  const ctx = vm.createContext({ console });
  const s = cargarEn(ctx, 'dominio.js', 'prioridad.js', 'ciclo-vida.js', 'confirmacion.js', 'ronda.js', 'servicio.js');
  const estado = { propuesta: JSON.parse(JSON.stringify(propuesta)), temas: temas.map((t) => ({ ...t })), enviados: [] };
  const copia = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);
  Object.assign(ctx, {
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    leerPropuesta_: () => copia(estado.propuesta),
    guardarPropuesta_: (p) => (estado.propuesta = copia(p)),
    leerTemas_: () => copia(estado.temas),
    buscarTema_: (r, id) => copia(estado.temas.find((t) => t.id === id)),
    actualizarTema_: (r, t) => {
      if (actualizarFalla) throw new Error('fallo de escritura');
      estado.temas = estado.temas.map((x) => (x.id === t.id ? { ...t } : x));
    },
    enviarPrivadoPorEmail_: (r, email, m) => {
      if (envioFalla(email, m)) return null;
      estado.enviados.push({ email, m });
      return { name: `msg-${estado.enviados.length}` };
    },
    claveDeRitual_: () => 'dr',
    hoyDe_: () => '2026-11-24',
    organizadorAusente_: () => false,
    destinatarioGestion: (r, aus) => (aus ? r.suplente : r.organizador),
    revisarConfirmacionPropuesta_: () => {},
    actualizarMensaje_: () => {},
    mensaje_: (texto) => ({ texto }),
    mensajePeticionConfirmacion: (r, p, t) => ({ tipo: 'peticion', id: t.id }),
    mensajeOfertaSustituto: (r, p, sale, entra) => ({ tipo: 'oferta', sale: sale.id, entra: entra && entra.id }),
    mensajeSinTemas: () => ({ tipo: 'sinTemas' }),
    mensajeAvisoSustituto: (r, p, t) => ({ tipo: 'aviso', id: t.id }),
    mensajeSustitucionResuelta: () => ({ tipo: 'resuelta' }),
    mensajeConfirmacionRespondida: () => ({ tipo: 'respondida' }),
    actorDe_: (e) => e.actor,
    RITUALES: { dr: RITUAL },
  });
  const ops = s('OPERACIONES_SERVICIO_');
  ctx.llamarServicio_ = (accion, r, datos) => ops[accion](r, { email: ctx.__actor }, datos);
  return { s, ctx, estado, ops };
}

const ronda = (ids, conf, extra) => Object.assign(
  { ritual: 'dr', lunes: LUNES, estado: 'confirmada', ids, confirmaciones: conf, liberados: [], peticiones: {}, ofertas: {} },
  extra
);
const seleccionados = (...ids) => ids.map((id) => tema(id, { estado: 'seleccionado' }));
const boton = (actor, parameters) => ({ actor: { email: actor }, commonEventObject: { parameters: Object.assign({ ritual: 'dr', lunes: LUNES }, parameters) } });

test('relanzar las confirmaciones no reinicia las respuestas ya recibidas', () => {
  const m = montar({ temas: seleccionados('DR-1'), propuesta: ronda(['DR-1'], { 'DR-1': 'confirmado' }) });
  m.s('lanzarConfirmaciones_')(RITUAL, { lunes: LUNES });
  assert.equal(m.estado.propuesta.confirmaciones['DR-1'], 'confirmado');
  assert.equal(m.estado.enviados.length, 0);
});

test('si no se puede preguntar qué hacer sin temas, no se marca como preguntado', () => {
  const m = montar({
    temas: seleccionados('DR-1'),
    propuesta: ronda(['DR-1'], { 'DR-1': 'no_puede' }),
    envioFalla: (email, msg) => msg.tipo === 'sinTemas',
  });
  assert.throws(() => m.s('preguntarSiSinTemas_')(RITUAL, 'dr', LUNES), /sin temas/);
  assert.ok(!m.estado.propuesta.preguntadoSinTemas);
});

test('dos temas sin confirmar a la vez reciben sustitutos distintos', () => {
  const m = montar({
    temas: [...seleccionados('DR-1', 'DR-2'), tema('DR-3', { urgencia: 5 }), tema('DR-4')],
    propuesta: ronda(['DR-1', 'DR-2'], { 'DR-1': 'pendiente', 'DR-2': 'pendiente' }),
  });
  m.s('revisarPlazo_')(RITUAL, { lunes: LUNES });
  const ofertas = m.estado.enviados.filter((e) => e.m.tipo === 'oferta').map((e) => e.m.entra);
  assert.equal(ofertas.length, 2);
  assert.notEqual(ofertas[0], ofertas[1]);
});

test('«No puedo» tras la oferta de las 11:45 no envía una segunda oferta', () => {
  const m = montar({
    temas: [...seleccionados('DR-1'), tema('DR-3')],
    propuesta: ronda(['DR-1'], { 'DR-1': 'pendiente' }),
  });
  m.s('revisarPlazo_')(RITUAL, { lunes: LUNES });
  const r = m.ops.noPuedo(RITUAL, { email: 'dr-1@x.com' }, { lunes: LUNES, id: 'DR-1' });
  assert.ok(r.ok);
  assert.equal(m.estado.enviados.filter((e) => e.m.tipo === 'oferta').length, 1);
});

test('«No puedo» solo lo puede pulsar el responsable, y sin tocar nada si no lo es', () => {
  const m = montar({ temas: seleccionados('DR-1'), propuesta: ronda(['DR-1'], { 'DR-1': 'pendiente' }) });
  const r = m.ops.noPuedo(RITUAL, { email: ORG }, { lunes: LUNES, id: 'DR-1' });
  assert.ok(!r.ok);
  assert.equal(m.estado.propuesta.confirmaciones['DR-1'], 'pendiente');
  assert.equal(m.estado.temas[0].estado, 'seleccionado');
});

test('si falla el registro, la respuesta se deshace y se puede volver a responder', () => {
  const m = montar({
    temas: seleccionados('DR-1'),
    propuesta: ronda(['DR-1'], { 'DR-1': 'pendiente' }),
    actualizarFalla: true,
  });
  assert.throws(() => m.ops.noPuedo(RITUAL, { email: 'dr-1@x.com' }, { lunes: LUNES, id: 'DR-1' }));
  assert.equal(m.estado.propuesta.confirmaciones['DR-1'], 'pendiente');
  assert.throws(() => m.ops.confirmar(RITUAL, { email: 'dr-1@x.com' }, { lunes: LUNES, id: 'DR-1', contexto: 'algo' }));
  assert.equal(m.estado.propuesta.confirmaciones['DR-1'], 'pendiente');
});

test('una sustitución ya resuelta no avisa otra vez al sustituto', () => {
  const m = montar({
    temas: [...seleccionados('DR-1'), tema('DR-3')],
    propuesta: ronda(['DR-1'], { 'DR-1': 'no_puede' }, { ofertas: { 'DR-1': 'msg-0' }, ofertados: { 'DR-1': 'DR-3' } }),
  });
  m.ctx.__actor = ORG;
  const evento = boton(ORG, { sale: 'DR-1', entra: 'DR-3' });
  const anterior = m.s('leerPropuesta_')();
  m.s('aplicarSustitucion')(evento);
  assert.deepEqual(m.estado.propuesta.ids, ['DR-3']);
  assert.deepEqual(m.estado.propuesta.ofertados, {});
  // Segundo clic simultáneo: leyó el estado antes de que el primero guardase.
  m.ctx.leerPropuesta_ = (() => { let n = 0; const actual = m.ctx.leerPropuesta_; return () => (n++ === 0 ? anterior : actual()); })();
  m.estado.temas = m.estado.temas.map((t) => (t.id === 'DR-3' ? { ...t, estado: 'propuesto' } : t));
  const r = m.s('aplicarSustitucion')(evento);
  assert.match(r.texto, /ya está resuelta/);
  assert.equal(m.estado.enviados.filter((e) => e.m.tipo === 'aviso').length, 1);
});
