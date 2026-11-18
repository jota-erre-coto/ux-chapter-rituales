const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'prioridad.js');
const urgenciaEfectiva = simbolo('urgenciaEfectiva');
const proponerSeleccion = simbolo('proponerSeleccion');
const ids = (lista) => [...lista].map((t) => t.id);

let siguiente = 0;
const tema = (cambios) =>
  Object.assign(
    { id: `DR-${String(++siguiente).padStart(3, '0')}`, estado: 'propuesto', preparacion: 'Lista',
      urgencia: 3, duracion: 15, fechaAlta: '2026-11-16', preferencia: false },
    cambios
  );
const HOY = '2026-11-23';

test('la urgencia sube un punto cada 3 semanas en el backlog, hasta 5', () => {
  const t = { urgencia: 2, fechaAlta: '2026-11-03' };
  assert.equal(urgenciaEfectiva(t, '2026-11-03'), 2);
  assert.equal(urgenciaEfectiva(t, '2026-11-23'), 2); // 2 semanas y 6 días
  assert.equal(urgenciaEfectiva(t, '2026-11-24'), 3); // 3 semanas
  assert.equal(urgenciaEfectiva(t, '2026-12-15'), 4); // 6 semanas
  assert.equal(urgenciaEfectiva(t, '2027-06-01'), 5);
});

test('primero los aplazados, después por urgencia efectiva y, a igual urgencia, el más antiguo', () => {
  const urgente = tema({ urgencia: 5, id: 'DR-A' });
  const antiguo = tema({ urgencia: 3, fechaAlta: '2026-11-02', id: 'DR-B' });
  const nuevo = tema({ urgencia: 3, fechaAlta: '2026-11-20', id: 'DR-C' });
  const aplazado = tema({ urgencia: 1, preferencia: true, id: 'DR-D' });
  const { seleccion } = proponerSeleccion([nuevo, antiguo, urgente, aplazado], HOY, 60);
  assert.deepEqual(ids(seleccion), ['DR-D', 'DR-A', 'DR-B', 'DR-C']);
});

test('la antigüedad hace que un tema poco urgente acabe ganando a uno nuevo', () => {
  const demo = tema({ urgencia: 2, fechaAlta: '2026-10-12', duracion: 45, id: 'DR-DEMO' }); // 6 semanas → 4
  const reciente = tema({ urgencia: 3, fechaAlta: '2026-11-20', duracion: 45, id: 'DR-NUEVO' });
  assert.deepEqual(ids(proponerSeleccion([reciente, demo], HOY, 60).seleccion), ['DR-DEMO']);
});

test('los temas con Falta preparación no aparecen nunca, ni como sustitutos', () => {
  const sinPreparar = tema({ urgencia: 5, preparacion: 'Falta preparación', id: 'DR-X' });
  const resultado = proponerSeleccion([sinPreparar, tema({ id: 'DR-Y' })], HOY, 60);
  assert.deepEqual(ids(resultado.seleccion), ['DR-Y']);
  assert.ok(!ids(resultado.sustitutos).includes('DR-X'));
});

test('solo entran temas propuestos o reabiertos', () => {
  const temas = ['seleccionado', 'tratado', 'resuelto', 'descartado', 'reabierto'].map((estado) =>
    tema({ estado, id: `DR-${estado}` })
  );
  assert.deepEqual(ids(proponerSeleccion(temas, HOY, 60).seleccion), ['DR-reabierto']);
});

test('la selección no pasa de 60 minutos y aprovecha el hueco con temas más cortos', () => {
  const temas = [
    tema({ urgencia: 5, duracion: 45, id: 'DR-1' }),
    tema({ urgencia: 4, duracion: 30, id: 'DR-2' }), // no cabe con el de 45
    tema({ urgencia: 3, duracion: 15, id: 'DR-3' }),
  ];
  const { seleccion, minutos } = proponerSeleccion(temas, HOY, 60);
  assert.deepEqual(ids(seleccion), ['DR-1', 'DR-3']);
  assert.equal(minutos, 60);
});

test('los sustitutos son los que quedan fuera con preparación Lista, por prioridad', () => {
  const temas = [
    tema({ urgencia: 5, duracion: 45, id: 'DR-1' }),
    tema({ urgencia: 5, duracion: 15, id: 'DR-2' }),
    tema({ urgencia: 4, duracion: 30, id: 'DR-3' }),
    tema({ urgencia: 4, duracion: 30, preparacion: 'La tendré para la sesión', id: 'DR-4' }),
    tema({ urgencia: 2, duracion: 15, id: 'DR-5' }),
  ];
  const { seleccion, sustitutos } = proponerSeleccion(temas, HOY, 60);
  assert.deepEqual(ids(seleccion), ['DR-1', 'DR-2']);
  assert.deepEqual(ids(sustitutos), ['DR-3', 'DR-5']);
});

test('«Solo uno» deja únicamente el tema elegido', () => {
  const a = tema({ id: 'DR-A' });
  const b = tema({ id: 'DR-B' });
  assert.deepEqual(ids(simbolo('quedarseConUno')([a, b], 'DR-B').seleccion), ['DR-B']);
  assert.equal(simbolo('quedarseConUno')([a], 'DR-Z').ok, false);
});

test('«Cambiar tema» acepta un candidato que quepa y rechaza el resto', () => {
  const cambiarTema = simbolo('cambiarTema');
  const a = tema({ id: 'DR-A', duracion: 30 });
  const b = tema({ id: 'DR-B', duracion: 30 });
  const tardio = tema({ id: 'DR-T', duracion: 15, fechaAlta: HOY });
  assert.deepEqual(ids(cambiarTema([a, b], 'DR-B', tardio, 60).seleccion), ['DR-A', 'DR-T']);
  assert.ok(cambiarTema([a, b], 'DR-B', tema({ duracion: 45 }), 60).errores.duracion);
  assert.match(
    cambiarTema([a, b], 'DR-B', tema({ preparacion: 'Falta preparación' }), 60).errores.id,
    /falta preparación/
  );
  assert.ok(cambiarTema([a, b], 'DR-B', a, 60).errores.id);
});
