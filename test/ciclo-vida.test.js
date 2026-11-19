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

const ritual = { organizador: 'jcoto@civitatis.com', suplente: 'fgimenez@civitatis.com' };
const temaDe = (cambios) =>
  Object.assign(crearTema(minimos, actor, '2026-11-03').tema, { id: 'DR-001' }, cambios);

test('el responsable edita su tema propuesto o reabierto', () => {
  for (const estado of ['propuesto', 'reabierto']) {
    const { ok, tema } = simbolo('editarTema')(
      temaDe({ estado }),
      Object.assign({}, minimos, { titulo: 'Nuevo título', urgencia: '4' }),
      actor
    );
    assert.equal(ok, true);
    assert.equal(tema.titulo, 'Nuevo título');
    assert.equal(tema.urgencia, 4);
    assert.equal(tema.estado, estado);
    assert.equal(tema.id, 'DR-001');
  }
});

test('no se edita un tema fuera del backlog ni por quien no es responsable', () => {
  const editarTema = simbolo('editarTema');
  for (const estado of ['seleccionado', 'tratado', 'resuelto', 'descartado']) {
    assert.ok(editarTema(temaDe({ estado }), minimos, actor).errores.estado);
  }
  assert.ok(editarTema(temaDe({}), minimos, { email: 'jcoto@civitatis.com' }).errores.actor);
});

test('al editar se valida igual que al crear', () => {
  const resultado = simbolo('editarTema')(temaDe({}), { titulo: '', tipo: 'x', duracion: '1' }, actor);
  assert.deepEqual(Object.keys(resultado.errores).sort(), ['duracion', 'tipo', 'titulo']);
});

test('descartan el responsable, el organizador y el suplente', () => {
  const descartarTema = simbolo('descartarTema');
  for (const email of ['smacarro@civitatis.com', 'JCOTO@civitatis.com', 'fgimenez@civitatis.com']) {
    const { ok, tema } = descartarTema(temaDe({}), { email }, ritual);
    assert.equal(ok, true);
    assert.equal(tema.estado, 'descartado');
  }
});

test('el ciclo de vida rechaza el descarte de cualquier otra persona', () => {
  const resultado = simbolo('descartarTema')(temaDe({}), { email: 'atoca@civitatis.com' }, ritual);
  assert.equal(resultado.ok, false);
  assert.ok(resultado.errores.actor);
});

test('se descarta desde cualquier estado anterior a resuelto, y descartado no es resuelto', () => {
  const descartarTema = simbolo('descartarTema');
  for (const estado of ['propuesto', 'seleccionado', 'tratado', 'reabierto']) {
    assert.equal(descartarTema(temaDe({ estado }), actor, ritual).tema.estado, 'descartado');
  }
  for (const estado of ['resuelto', 'descartado']) {
    assert.ok(descartarTema(temaDe({ estado }), actor, ritual).errores.estado);
  }
  assert.notEqual(simbolo('ESTADOS').descartado, simbolo('ESTADOS').resuelto);
});

const jcoto = { email: 'jcoto@civitatis.com' };
const miembros = ['jcoto@civitatis.com', 'smacarro@civitatis.com', 'atoca@civitatis.com'];

test('el organizador asigna un tema: proponente y responsable distintos, marcado como asignado', () => {
  const { ok, tema } = crearTema(
    Object.assign({}, minimos, { responsable: 'Atoca@civitatis.com' }),
    jcoto,
    '2026-11-03',
    { permitida: true, miembros }
  );
  assert.equal(ok, true);
  assert.equal(tema.proponente, 'jcoto@civitatis.com');
  assert.equal(tema.responsable, 'atoca@civitatis.com');
  assert.equal(tema.asignado, true);
});

test('elegirse a uno mismo como responsable no es asignar', () => {
  const { tema } = crearTema(
    Object.assign({}, minimos, { responsable: 'jcoto@civitatis.com' }),
    jcoto,
    '2026-11-03',
    { permitida: true, miembros }
  );
  assert.equal(tema.asignado, false);
});

test('no asigna quien no tiene permiso ni a quien no es miembro del espacio', () => {
  const sinPermiso = crearTema(Object.assign({}, minimos, { responsable: 'atoca@civitatis.com' }), actor, '2026-11-03');
  assert.ok(sinPermiso.errores.responsable);
  const ajeno = crearTema(
    Object.assign({}, minimos, { responsable: 'otra@civitatis.com' }),
    jcoto,
    '2026-11-03',
    { permitida: true, miembros }
  );
  assert.ok(ajeno.errores.responsable);
});

test('asigna el organizador, y el suplente solo si el organizador está ausente', () => {
  const puedeAsignar = simbolo('puedeAsignar');
  assert.equal(puedeAsignar(jcoto, ritual, false), true);
  assert.equal(puedeAsignar({ email: 'fgimenez@civitatis.com' }, ritual, false), false);
  assert.equal(puedeAsignar({ email: 'fgimenez@civitatis.com' }, ritual, true), true);
  assert.equal(puedeAsignar(actor, ritual, true), false);
});

test('el responsable no puede rechazar un tema asignado; el organizador y el suplente sí lo descartan', () => {
  const asignado = temaDe({ asignado: true, proponente: 'jcoto@civitatis.com' });
  const rechazo = simbolo('descartarTema')(asignado, actor, ritual);
  assert.equal(rechazo.ok, false);
  assert.match(rechazo.errores.actor, /asignado/);
  assert.equal(simbolo('descartarTema')(asignado, jcoto, ritual).ok, true);
  assert.equal(simbolo('descartarTema')(asignado, { email: 'fgimenez@civitatis.com' }, ritual).ok, true);
});

test('seleccionan el organizador o el suplente, y solo temas del backlog preparados', () => {
  const seleccionarTema = simbolo('seleccionarTema');
  const listo = temaDe({ preparacion: 'Lista' });
  assert.equal(seleccionarTema(listo, jcoto, ritual).tema.estado, 'seleccionado');
  assert.equal(seleccionarTema(listo, { email: 'fgimenez@civitatis.com' }, ritual).ok, true);
  assert.ok(seleccionarTema(listo, actor, ritual).errores.actor);
  assert.ok(seleccionarTema(temaDe({ preparacion: 'Falta preparación' }), jcoto, ritual).errores.preparacion);
  assert.ok(seleccionarTema(temaDe({ preparacion: 'Lista', estado: 'resuelto' }), jcoto, ritual).errores.estado);
});

test('al confirmar, el responsable completa contexto y enlace de su tema seleccionado', () => {
  const completar = simbolo('completarTema');
  const seleccionado = temaDe({ estado: 'seleccionado', contexto: 'previo' });
  const r = completar(seleccionado, { contexto: '', enlace: 'https://figma.com/x' }, actor);
  assert.equal(r.tema.contexto, 'previo');
  assert.equal(r.tema.enlace, 'https://figma.com/x');
  assert.ok(completar(seleccionado, { enlace: 'figma' }, actor).errores.enlace);
  assert.ok(completar(seleccionado, {}, jcoto).errores.actor);
  assert.ok(completar(temaDe({}), {}, actor).errores.estado);
});

test('un tema seleccionado vuelve al backlog por su responsable, el organizador o el suplente', () => {
  const liberar = simbolo('liberarTema');
  const seleccionado = temaDe({ estado: 'seleccionado' });
  assert.equal(liberar(seleccionado, actor, ritual).tema.estado, 'propuesto');
  assert.equal(liberar(seleccionado, jcoto, ritual).ok, true);
  assert.ok(liberar(seleccionado, { email: 'atoca@civitatis.com' }, ritual).errores.actor);
  assert.ok(liberar(temaDe({}), actor, ritual).errores.estado);
});

test('al cancelarse la sesión, un tema seleccionado vuelve con preferencia', () => {
  const aplazar = simbolo('aplazarTema');
  const r = aplazar(temaDe({ estado: 'seleccionado' }), jcoto, ritual);
  assert.equal(r.tema.estado, 'propuesto');
  assert.equal(r.tema.preferencia, true);
  assert.ok(aplazar(temaDe({ estado: 'seleccionado' }), actor, ritual).errores.actor);
  assert.ok(aplazar(temaDe({}), jcoto, ritual).errores.estado);
});
