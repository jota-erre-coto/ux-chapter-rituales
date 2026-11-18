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

test('el campo Responsable solo aparece para quien puede asignar, con su nombre marcado', () => {
  const dialogo = conPrioridad('dialogoAltaTema');
  assert.ok(![...campos(dialogo())].includes('responsable'));
  const asignables = [
    { email: 'atoca@civitatis.com', nombre: 'Alberto' },
    { email: 'jcoto@civitatis.com', nombre: 'Jota' },
  ];
  const tarjeta = dialogo(null, null, null, asignables, 'jcoto@civitatis.com');
  const campo = tarjeta.sections[0].widgets.find((w) => w.selectionInput && w.selectionInput.name === 'responsable');
  const elegido = campo.selectionInput.items.find((i) => i.selected);
  assert.equal(elegido.value, 'jcoto@civitatis.com');
  assert.equal(elegido.text, 'Jota (tú)');
});

const ritualPruebas = { nombre: 'Design Review', hitos: { propuesta: { dia: 1, hora: '13:00' } } };

test('la convocatoria nombra la sesión, el cierre de las 13:00 y abre el diálogo de alta', () => {
  const mensaje = conPrioridad('mensajeConvocatoria')(ritualPruebas, '2026-11-25');
  assert.match(mensaje.text, /miércoles 25 de noviembre/);
  assert.match(mensaje.text, /13:00/);
  const boton = mensaje.cardsV2[0].card.sections[0].widgets[0].buttonList.buttons[0];
  assert.equal(boton.text, 'Proponer tema');
  assert.equal(boton.onClick.action.function, 'abrirAltaTema');
  assert.equal(boton.onClick.action.interaction, 'OPEN_DIALOG');
});

test('una semana sin sesión se anuncia sin botón de proponer', () => {
  const mensaje = conPrioridad('mensajeSinSesion')(ritualPruebas, '2026-11-23');
  assert.match(mensaje.text, /no hay Design Review/);
  assert.equal(mensaje.cardsV2, undefined);
});
