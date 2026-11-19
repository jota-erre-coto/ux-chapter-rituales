const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'prioridad.js', 'confirmacion.js');
const iniciar = simbolo('iniciarConfirmaciones');
const responder = simbolo('responderConfirmacion');
const lista = (x) => [...x];
const HOY = '2026-11-24';

const tema = (id, cambios) => Object.assign(
  { id, estado: 'propuesto', preparacion: 'Lista', urgencia: 3, duracion: 15, fechaAlta: '2026-11-16', preferencia: false },
  cambios
);
const base = () => iniciar({ ids: ['DR-1', 'DR-2'] });

test('la ronda empieza con todos los temas pendientes', () => {
  const p = base();
  assert.deepEqual(JSON.parse(JSON.stringify(p.confirmaciones)), { 'DR-1': 'pendiente', 'DR-2': 'pendiente' });
});

test('cada responsable responde una sola vez y solo por temas de la sesión', () => {
  const r = responder(base(), 'DR-1', 'confirmado');
  assert.equal(r.propuesta.confirmaciones['DR-1'], 'confirmado');
  assert.ok(responder(r.propuesta, 'DR-1', 'no_puede').errores.id);
  assert.ok(responder(base(), 'DR-9', 'confirmado').errores.id);
});

test('solo los confirmados quedan para el anuncio', () => {
  const p = responder(responder(base(), 'DR-1', 'confirmado').propuesta, 'DR-2', 'no_puede').propuesta;
  assert.deepEqual(lista(simbolo('temasConfirmados')(p)), ['DR-1']);
});

test('necesitan sustituto los que no pueden y, pasado el plazo, los pendientes', () => {
  const sinConfirmar = simbolo('sinConfirmar');
  const p = responder(base(), 'DR-1', 'no_puede').propuesta;
  assert.deepEqual(lista(sinConfirmar(p, false)), ['DR-1']);
  assert.deepEqual(lista(sinConfirmar(p, true)), ['DR-1', 'DR-2']);
});

test('el sustituto siempre tiene preparación Lista, está fuera de la sesión y cabe', () => {
  const elegir = simbolo('elegirSustituto');
  const temas = [
    tema('DR-1', { estado: 'seleccionado', duracion: 30 }),
    tema('DR-2', { estado: 'seleccionado', duracion: 30 }),
    tema('DR-3', { urgencia: 5, preparacion: 'La tendré para la sesión' }),
    tema('DR-4', { urgencia: 4, duracion: 45 }),
    tema('DR-5', { urgencia: 2, duracion: 30 }),
  ];
  const p = responder(base(), 'DR-2', 'no_puede').propuesta;
  // DR-3 no está Lista y DR-4 no cabe con DR-1 (30 + 45 > 60).
  assert.equal(elegir(temas, p, 'DR-2', HOY, 60).id, 'DR-5');
  // Un tema ya liberado esta semana no vuelve como sustituto.
  assert.equal(elegir(temas, Object.assign({}, p, { liberados: ['DR-5'] }), 'DR-2', HOY, 60), null);
});

test('sustituir mete el tema nuevo ya confirmado y libera el que sale', () => {
  const p = responder(base(), 'DR-2', 'no_puede').propuesta;
  const r = simbolo('sustituirTema')(p, 'DR-2', 'DR-5');
  assert.deepEqual(lista(r.propuesta.ids), ['DR-1', 'DR-5']);
  assert.equal(r.propuesta.confirmaciones['DR-5'], 'confirmado');
  assert.equal(r.propuesta.confirmaciones['DR-2'], undefined);
  assert.deepEqual(lista(r.propuesta.liberados), ['DR-2']);
  const confirmado = responder(base(), 'DR-1', 'confirmado').propuesta;
  assert.ok(simbolo('sustituirTema')(confirmado, 'DR-1', 'DR-5').errores.id);
});

test('sin temas confirmados ni pendientes, la sesión se queda sin temas', () => {
  const sesionSinTemas = simbolo('sesionSinTemas');
  const retirar = simbolo('retirarTema');
  let p = responder(base(), 'DR-1', 'no_puede').propuesta;
  assert.equal(sesionSinTemas(p), false);
  p = responder(p, 'DR-2', 'no_puede').propuesta;
  assert.equal(sesionSinTemas(p), true);
  p = retirar(retirar(p, 'DR-1').propuesta, 'DR-2').propuesta;
  assert.deepEqual(lista(p.ids), []);
  assert.equal(sesionSinTemas(p), true);
});
