const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const urgenciaEfectiva = cargar('prioridad.js')('urgenciaEfectiva');

test('la urgencia sube un punto cada 3 semanas en el backlog, hasta 5', () => {
  const tema = { urgencia: 2, fechaAlta: '2026-11-03' };
  assert.equal(urgenciaEfectiva(tema, '2026-11-03'), 2);
  assert.equal(urgenciaEfectiva(tema, '2026-11-23'), 2); // 2 semanas y 6 días
  assert.equal(urgenciaEfectiva(tema, '2026-11-24'), 3); // 3 semanas
  assert.equal(urgenciaEfectiva(tema, '2026-12-15'), 4); // 6 semanas
  assert.equal(urgenciaEfectiva(tema, '2027-06-01'), 5);
});
