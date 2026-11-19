const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'prioridad.js', 'confirmacion.js', 'mensajes.js', 'acta.js');
const redactar = simbolo('redactarEntradaActa');
const plano = (x) => JSON.parse(JSON.stringify(x));

const tema = (cambios) => Object.assign(
  { id: 'DR-1', titulo: 'Tag + Tooltip', responsable: 'atoca@civitatis.com', tipo: 'Validar una propuesta',
    contexto: 'Traslados', hilo: 'https://chat.google.com/room/A/B', validado: true, resultado: 'resuelto',
    acuerdos: ['Se usa el tooltip'], siguientesPasos: [{ accion: 'Actualizar Figma', encargado: 'atoca@civitatis.com' }] },
  cambios
);
const sesion = (temas) => ({
  fecha: '2026-11-25', participantes: ['Jota', 'Fer'], facilita: 'jcoto@civitatis.com',
  notasUrl: 'https://docs.google.com/document/d/NOTAS/edit', temas,
});

test('la pestaña es la del trimestre de la sesión', () => {
  const pestana = simbolo('pestanaTrimestre');
  assert.equal(pestana('2026-11-25'), '2026 · T4');
  assert.equal(pestana('2027-01-01'), '2027 · T1');
  assert.equal(pestana('2027-06-30'), '2027 · T2');
});

test('la sesión lleva fecha, quién facilitó, participantes y enlace a las notas de Gemini', () => {
  const [cabecera, datos] = plano(redactar(sesion([tema({})])));
  assert.equal(cabecera.texto, 'Sesión del miércoles 25 de noviembre de 2026');
  assert.deepEqual(datos.lineas, ['Facilitó: jcoto@civitatis.com', 'Participantes: Jota, Fer']);
  assert.equal(datos.enlace.url, 'https://docs.google.com/document/d/NOTAS/edit');
});

test('cada tema lleva responsable, tipo, estado, contexto, acuerdos y siguientes pasos con encargado', () => {
  const bloques = plano(redactar(sesion([tema({})])));
  const temaBloque = bloques.find((b) => b.tipo === 'tema');
  assert.equal(temaBloque.texto, 'DR-1 · Tag + Tooltip');
  assert.equal(temaBloque.enlace.url, 'https://chat.google.com/room/A/B');
  const campos = Object.fromEntries(bloques.filter((b) => b.tipo === 'campo').map((b) => [b.etiqueta, b.valor]));
  assert.deepEqual(campos, {
    Responsable: 'atoca@civitatis.com', 'Tipo de feedback': 'Validar una propuesta', Estado: 'Resuelto', Contexto: 'Traslados',
  });
  const listas = Object.fromEntries(bloques.filter((b) => b.tipo === 'lista').map((b) => [b.etiqueta, b.items]));
  assert.deepEqual(listas.Acuerdos, ['Se usa el tooltip']);
  assert.deepEqual(listas['Siguientes pasos'], ['Actualizar Figma (encargado: atoca@civitatis.com)']);
});

test('un tema reabierto dice qué falta para cerrarlo', () => {
  const bloques = plano(redactar(sesion([tema({ resultado: 'reabierto', falta: 'Datos de uso', acuerdos: [] })])));
  const campos = Object.fromEntries(bloques.filter((b) => b.tipo === 'campo').map((b) => [b.etiqueta, b.valor]));
  assert.equal(campos.Estado, 'Reabierto');
  assert.equal(campos['Falta para cerrarlo'], 'Datos de uso');
  assert.deepEqual(bloques.find((b) => b.etiqueta === 'Acuerdos').items, ['Sin acuerdos.']);
});

test('solo entra lo validado; lo no tratado se nombra en una nota', () => {
  const bloques = plano(redactar(sesion([
    tema({ id: 'DR-1' }),
    tema({ id: 'DR-2', validado: false }),
    tema({ id: 'DR-3', titulo: 'PDP', resultado: 'no_tratado' }),
  ])));
  const temas = bloques.filter((b) => b.tipo === 'tema').map((b) => b.texto);
  assert.deepEqual(temas, ['DR-1 · Tag + Tooltip']);
  assert.match(bloques[bloques.length - 1].texto, /DR-3 «PDP»/);
  assert.doesNotMatch(JSON.stringify(bloques), /DR-2/);
});

test('sin temas validados, la sesión lo dice', () => {
  const bloques = plano(redactar(sesion([tema({ validado: false })])));
  assert.equal(bloques[2].texto, 'No hay temas validados de esta sesión.');
});

test('el registro anota cada sesión en la que se trató un tema, sin repetir', () => {
  const anotar = simbolo('anotarSesion');
  assert.deepEqual([...anotar([], '2026-11-25')], ['2026-11-25']);
  assert.deepEqual([...anotar(['2026-11-25'], '2026-11-25')], ['2026-11-25']);
  assert.deepEqual([...anotar(['2026-12-02'], '2026-11-25')], ['2026-11-25', '2026-12-02']);
});
