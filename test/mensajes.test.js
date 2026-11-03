const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'prioridad.js', 'mensajes.js');
const campos = (tarjeta) =>
  tarjeta.sections[0].widgets
    .map((w) => (w.textInput || w.selectionInput || {}).name)
    .filter(Boolean);

test('el diálogo de alta pide los 3 obligatorios antes que los opcionales', () => {
  const tarjeta = simbolo('dialogoAltaTema')();
  assert.deepEqual([...campos(tarjeta)], [
    'titulo', 'tipo', 'duracion', 'urgencia', 'preparacion', 'contexto', 'enlace',
  ]);
});

test('al reabrir por un error, conserva lo escrito y muestra los errores', () => {
  const tarjeta = simbolo('dialogoAltaTema')(
    { titulo: 'Tag', duracion: '45', urgencia: '4' },
    { tipo: 'Elige el tipo de feedback.' }
  );
  const widgets = tarjeta.sections[0].widgets;
  assert.match(widgets[0].textParagraph.text, /Elige el tipo de feedback/);
  const titulo = widgets.find((w) => w.textInput && w.textInput.name === 'titulo');
  assert.equal(titulo.textInput.value, 'Tag');
  const duracion = widgets.find((w) => w.selectionInput && w.selectionInput.name === 'duracion');
  assert.equal(duracion.selectionInput.items.find((i) => i.selected).value, '45');
});

const conPrioridad = cargar('dominio.js', 'prioridad.js', 'mensajes.js');
const botones = (seccion) =>
  [...(seccion.widgets.find((w) => w.buttonList) || { buttonList: { buttons: [] } }).buttonList.buttons]
    .map((b) => b.text);

test('/mis-temas solo pinta los botones que el ciclo de vida permite', () => {
  const tema = { id: 'DR-001', titulo: 'Tag', estado: 'propuesto', tipo: 'Informar', duracion: 15,
    urgencia: 3, preparacion: 'Lista', fechaAlta: '2026-11-03', responsable: 'atoca@civitatis.com' };
  const tarjeta = conPrioridad('dialogoMisTemas')(
    [tema, Object.assign({}, tema, { id: 'DR-002', estado: 'resuelto' })],
    [],
    '2026-11-03',
    (t) => ({ editar: t.estado === 'propuesto', descartar: t.estado === 'propuesto' })
  );
  assert.deepEqual(botones(tarjeta.sections[0]), ['Editar', 'Descartar']);
  assert.deepEqual(botones(tarjeta.sections[1]), []);
});

test('/mis-temas sin temas invita a usar /tema', () => {
  const tarjeta = conPrioridad('dialogoMisTemas')([], [], '2026-11-03', () => ({}));
  assert.match(tarjeta.sections[0].widgets[0].textParagraph.text, /\/tema/);
});

test('en edición el diálogo guarda los cambios del tema y no crea uno nuevo', () => {
  const tarjeta = conPrioridad('dialogoAltaTema')({ titulo: 'Tag' }, null, { id: 'DR-001' });
  const boton = tarjeta.sections[0].widgets.find((w) => w.buttonList).buttonList.buttons[0];
  assert.equal(tarjeta.header.title, 'Editar DR-001');
  assert.equal(boton.onClick.action.function, 'guardarEdicion');
  assert.equal(boton.onClick.action.parameters[0].value, 'DR-001');
});
