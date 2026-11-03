const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'ciclo-vida.js', 'registro.js');

test('el ID sigue al mayor del ritual e ignora otros formatos', () => {
  const siguienteId = simbolo('siguienteId');
  assert.equal(siguienteId([], 'DR'), 'DR-001');
  assert.equal(siguienteId(['DR-002', 'DR-010', 'DC-050', ''], 'DR'), 'DR-011');
});

test('el registro no tiene columna Esfuerzo y la fila sigue el orden de las cabeceras', () => {
  const columnas = simbolo('COLUMNAS_REGISTRO');
  const cabeceras = columnas.map(([, c]) => c);
  assert.ok(!cabeceras.some((c) => /esfuerzo/i.test(c)));

  const { tema } = simbolo('crearTema')(
    { titulo: 'Tag', tipo: 'Informar', duracion: '15' },
    { email: 'atoca@civitatis.com' },
    '2026-11-03'
  );
  const fila = simbolo('temaAFila_')(Object.assign({}, tema, { id: 'DR-001' }));
  const celda = (cabecera) => fila[cabeceras.indexOf(cabecera)];
  assert.equal(fila.length, cabeceras.length);
  assert.equal(celda('ID'), 'DR-001');
  assert.equal(celda('Responsable'), 'atoca@civitatis.com');
  assert.equal(celda('Asignado'), 'No');
  assert.equal(celda('Estado'), 'propuesto');
  assert.equal(celda('Sesiones'), '');
});
