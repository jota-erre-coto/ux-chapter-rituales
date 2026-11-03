const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'ciclo-vida.js');
const crearTema = simbolo('crearTema');
const actor = { email: 'Smacarro@Civitatis.com' };
const minimos = { titulo: '  Tag + Tooltip  ', tipo: 'Validar una propuesta', duracion: '30' };

test('un tema con los 3 campos obligatorios nace propuesto con los valores por defecto', () => {
  const { ok, tema } = crearTema(minimos, actor, '2026-11-03');
  assert.equal(ok, true);
  assert.equal(tema.titulo, 'Tag + Tooltip');
  assert.equal(tema.estado, 'propuesto');
  assert.equal(tema.duracion, 30);
  assert.equal(tema.urgencia, 3);
  assert.equal(tema.preparacion, 'Falta preparación');
  assert.equal(tema.fechaAlta, '2026-11-03');
  assert.equal(tema.asignado, false);
  assert.equal(tema.preferencia, false);
});

test('quien propone queda como proponente y responsable, identificado por su email', () => {
  const { tema } = crearTema(minimos, actor, '2026-11-03');
  assert.equal(tema.proponente, 'smacarro@civitatis.com');
  assert.equal(tema.responsable, 'smacarro@civitatis.com');
});

test('los campos opcionales se respetan', () => {
  const { tema } = crearTema(
    Object.assign({}, minimos, {
      urgencia: '5',
      preparacion: 'Lista',
      contexto: 'Traslados',
      enlace: 'https://figma.com/x',
    }),
    actor,
    '2026-11-03'
  );
  assert.equal(tema.urgencia, 5);
  assert.equal(tema.preparacion, 'Lista');
  assert.equal(tema.contexto, 'Traslados');
  assert.equal(tema.enlace, 'https://figma.com/x');
});

test('sin título, tipo ni duración válidos no se crea el tema y se dice por qué', () => {
  const resultado = crearTema({ titulo: ' ', tipo: 'Otro', duracion: '20' }, actor, '2026-11-03');
  assert.equal(resultado.ok, false);
  assert.deepEqual(Object.keys(resultado.errores).sort(), ['duracion', 'tipo', 'titulo']);
});

test('se rechazan urgencia fuera de 1 a 5, enlaces que no son web y actor sin email', () => {
  const resultado = crearTema(
    Object.assign({}, minimos, { urgencia: '7', enlace: 'figma.com/x' }),
    { email: '' },
    '2026-11-03'
  );
  assert.deepEqual(Object.keys(resultado.errores).sort(), ['actor', 'enlace', 'urgencia']);
});
