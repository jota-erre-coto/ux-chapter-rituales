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

const ritualPruebas = { nombre: 'Design Review', actaId: 'ACTA', hitos: { propuesta: { dia: 1, hora: '13:00' } } };

test('la convocatoria nombra la sesión, el cierre de las 13:00 y abre el diálogo de alta', () => {
  const mensaje = conPrioridad('mensajeConvocatoria')(ritualPruebas, '2026-11-25');
  assert.match(mensaje.text, /miércoles 25 de noviembre/);
  assert.match(mensaje.text, /13:00/);
  const boton = mensaje.cardsV2[0].card.sections[0].widgets[0].buttonList.buttons[0];
  assert.equal(boton.text, 'Proponer tema');
  assert.equal(boton.onClick.action.function, 'abrirAltaTema');
  assert.equal(boton.onClick.action.interaction, 'OPEN_DIALOG');
  const acta = mensaje.cardsV2[0].card.sections[0].widgets[0].buttonList.buttons[1];
  assert.equal(acta.onClick.openLink.url, 'https://docs.google.com/document/d/ACTA/edit');
});

test('una semana sin sesión se anuncia sin botón de proponer', () => {
  const mensaje = conPrioridad('mensajeSinSesion')(ritualPruebas, '2026-11-23');
  assert.match(mensaje.text, /no hay Design Review/);
  assert.equal(mensaje.cardsV2, undefined);
});

const ritualPropuesta = {
  nombre: 'Design Review', duracionSesionMin: 60,
  hitos: { confirmacion: { dia: 2, hora: '11:00' } },
};
const temaPropuesto = (cambios) => Object.assign(
  { id: 'DR-001', titulo: 'Tag', tipo: 'Informar', duracion: 30, urgencia: 3, preparacion: 'Lista',
    fechaAlta: '2026-11-16', responsable: 'atoca@civitatis.com', preferencia: false },
  cambios
);
const botonesDe = (mensaje) => {
  const secciones = mensaje.cardsV2[0].card.sections;
  const lista = secciones[secciones.length - 1].widgets.find((w) => w.buttonList);
  return lista ? [...lista.buttonList.buttons].map((b) => b.text) : [];
};

test('la propuesta pendiente muestra los temas, los minutos, el plazo y los tres botones', () => {
  const mensaje = conPrioridad('mensajePropuesta')(
    ritualPropuesta,
    { claveRitual: 'pruebas', lunes: '2026-11-23', sesion: '2026-11-25', estado: 'pendiente' },
    [temaPropuesto({}), temaPropuesto({ id: 'DR-002', duracion: 15, preferencia: true })],
    [temaPropuesto({ id: 'DR-003' })],
    '2026-11-23'
  );
  assert.match(mensaje.text, /miércoles 25 de noviembre/);
  const pie = JSON.stringify(mensaje.cardsV2);
  assert.match(pie, /45 de 60 minutos/);
  assert.match(pie, /Sustitutos si alguien no confirma: DR-003/);
  assert.match(pie, /antes del martes a las 11:00/);
  assert.match(pie, /aplazado de la sesión anterior/);
  assert.deepEqual(botonesDe(mensaje), ['Confirmar', 'Cambiar tema', 'Dejar solo uno']);
});

test('la propuesta confirmada no tiene botones y una vacía solo deja añadir', () => {
  const mensajePropuesta = conPrioridad('mensajePropuesta');
  const base = { claveRitual: 'pruebas', lunes: '2026-11-23', sesion: '2026-11-25' };
  const confirmada = mensajePropuesta(ritualPropuesta, Object.assign({ estado: 'confirmada', confirmadaPor: 'Jota' }, base), [temaPropuesto({})], [], '2026-11-23');
  assert.match(confirmada.text, /confirmada por Jota/);
  assert.deepEqual(botonesDe(confirmada), []);
  const vacia = mensajePropuesta(ritualPropuesta, Object.assign({ estado: 'pendiente' }, base), [], [], '2026-11-23');
  assert.deepEqual(botonesDe(vacia), ['Añadir tema']);
});

test('cada tema de /mis-temas muestra su fecha de alta', () => {
  const tema = { id: 'DR-001', titulo: 'Tag', estado: 'propuesto', tipo: 'Informar', duracion: 15,
    urgencia: 3, preparacion: 'Lista', fechaAlta: '2026-11-03', responsable: 'atoca@civitatis.com' };
  const tarjeta = conPrioridad('dialogoMisTemas')([tema], [], '2026-11-18', () => ({}));
  assert.equal(tarjeta.sections[0].widgets[0].decoratedText.topLabel, 'DR-001 · 3 nov 2026 · propuesto');
});

test('si la propuesta llega al suplente, dice por qué', () => {
  const mensaje = conPrioridad('mensajePropuesta')(
    Object.assign({ organizador: 'jcoto@civitatis.com' }, ritualPropuesta),
    { claveRitual: 'pruebas', lunes: '2026-11-23', sesion: '2026-11-25', estado: 'pendiente', enSustitucion: true },
    [temaPropuesto({})], [], '2026-11-23'
  );
  assert.match(JSON.stringify(mensaje.cardsV2), /porque jcoto@civitatis.com está fuera de la oficina/);
});

const conRonda = cargar('dominio.js', 'prioridad.js', 'confirmacion.js', 'mensajes.js');
const ritualRonda = { nombre: 'Design Review', hitos: { plazoSustitucion: { dia: 2, hora: '11:45' } } };
const propuestaRonda = { claveRitual: 'pruebas', lunes: '2026-11-23', sesion: '2026-11-25' };
const botonesTarjeta = (m) => {
  const w = m.cardsV2[0].card.sections[0].widgets.find((x) => x.buttonList);
  return [...w.buttonList.buttons];
};

test('la petición de confirmación abre diálogo solo si faltan contexto o enlace', () => {
  const peticion = conRonda('mensajePeticionConfirmacion');
  const sinInfo = peticion(ritualRonda, propuestaRonda, temaPropuesto({ contexto: '', enlace: '' }));
  assert.match(sinInfo.text, /antes de las 11:45/);
  assert.equal(botonesTarjeta(sinInfo)[0].onClick.action.interaction, 'OPEN_DIALOG');
  assert.equal(botonesTarjeta(sinInfo)[1].text, 'No puedo');
  const completo = peticion(ritualRonda, propuestaRonda, temaPropuesto({ contexto: 'x', enlace: 'https://a.b' }));
  assert.equal(botonesTarjeta(completo)[0].onClick.action.function, 'confirmarTemaDirecto');
});

test('la oferta de sustituto lleva Sustituir, o solo quitar si no hay sustituto', () => {
  const oferta = conRonda('mensajeOfertaSustituto');
  const sale = temaPropuesto({ id: 'DR-1' });
  const con = oferta(ritualRonda, propuestaRonda, sale, temaPropuesto({ id: 'DR-5' }), 'no_puede');
  assert.match(con.text, /no puede presentar DR-1/);
  assert.deepEqual(botonesTarjeta(con).map((b) => b.text), ['Sustituir', 'No sustituir']);
  const sin = oferta(ritualRonda, propuestaRonda, sale, null, 'pendiente');
  assert.match(sin.text, /no ha confirmado DR-1/);
  assert.deepEqual(botonesTarjeta(sin).map((b) => b.text), ['Quitarlo de la sesión']);
});

test('sin temas, se pregunta si cancelar o anunciar una sesión abierta', () => {
  const m = conRonda('mensajeSinTemas')(ritualRonda, propuestaRonda);
  assert.deepEqual(botonesTarjeta(m).map((b) => b.text), ['Cancelar la sesión', 'Anunciar sesión abierta']);
});

const conAnuncio = cargar('dominio.js', 'prioridad.js', 'confirmacion.js', 'mensajes.js');
const ritualAnuncio = { nombre: 'Design Review', actaId: 'ACTA' };

test('el anuncio dice fecha, quién facilita, los temas y enlaza el acta', () => {
  const m = conAnuncio('mensajeAnuncio')(ritualAnuncio, '2026-11-25',
    [temaPropuesto({ id: 'DR-1' }), temaPropuesto({ id: 'DR-2', duracion: 15 })], 'jcoto@civitatis.com');
  assert.match(m.text, /miércoles 25 de noviembre\. La sesión la facilita jcoto@civitatis\.com/);
  assert.match(m.text, /Temas \(45 min\)/);
  assert.match(m.text, /DR-2 «Tag» · atoca@civitatis\.com · 15 min/);
  const boton = m.cardsV2[0].card.sections[0].widgets[0].buttonList.buttons[0];
  assert.equal(boton.onClick.openLink.url, 'https://docs.google.com/document/d/ACTA/edit');
});

test('el «Antes de la sesión» cambia según el tipo de feedback', () => {
  const antes = conAnuncio('antesDeLaSesion');
  const textos = ['Decidir entre opciones', 'Validar una propuesta', 'Abrir un debate', 'Informar'].map(antes);
  assert.equal(new Set(textos).size, 4);
  const m = conAnuncio('mensajeTemaAnunciado')(temaPropuesto({ tipo: 'Informar', contexto: 'Traslados', enlace: 'https://figma.com/x' }));
  const json = JSON.stringify(m.cardsV2);
  assert.match(json, /Antes de la sesión/);
  assert.match(json, /No hace falta preparar nada/);
  assert.match(json, /Traslados/);
  assert.match(json, /https:\/\/figma\.com\/x/);
});

test('un tema sin contexto ni enlace se anuncia sin esos bloques', () => {
  const json = JSON.stringify(conAnuncio('mensajeTemaAnunciado')(temaPropuesto({ contexto: '', enlace: '' })).cardsV2);
  assert.doesNotMatch(json, /Contexto/);
  assert.doesNotMatch(json, /Abrir enlace/);
});

test('la cancelación avisa de que los temas pasan con preferencia solo si los había', () => {
  const cancelar = conAnuncio('mensajeCancelacion');
  assert.match(cancelar(ritualAnuncio, '2026-11-25', true).text, /pasan con preferencia/);
  assert.doesNotMatch(cancelar(ritualAnuncio, '2026-11-25', false).text, /preferencia/);
});
