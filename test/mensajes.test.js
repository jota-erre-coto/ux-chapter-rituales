const test = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./cargar');

const simbolo = cargar('dominio.js', 'mensajes.js');
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
