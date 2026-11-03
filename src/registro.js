// Adaptador del registro de temas (Sheet). Traduce temas del dominio a filas y viceversa.

const NOMBRE_HOJA_TEMAS = 'Temas';

// Orden de columnas del registro. La clave es el campo del tema; null = columna sin campo.
const COLUMNAS_REGISTRO = [
  ['id', 'ID'],
  ['titulo', 'Tema'],
  ['contexto', 'Contexto'],
  ['enlace', 'Enlace'],
  ['proponente', 'Proponente'],
  ['responsable', 'Responsable'],
  ['asignado', 'Asignado'],
  ['tipo', 'Tipo de feedback'],
  ['duracion', 'Duración estimada (min)'],
  ['preparacion', 'Preparación'],
  ['urgencia', 'Urgencia (1-5)'],
  ['prioridad', 'Prioridad'],
  ['estado', 'Estado'],
  ['fechaAlta', 'Fecha de alta'],
  ['preferencia', 'Preferencia'],
  ['sesiones', 'Sesiones'],
  [null, 'Notas'],
];

// Guarda un tema nuevo, le asigna el siguiente ID del ritual y devuelve el tema con su ID.
function guardarTemaNuevo_(ritual, tema) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    const hoja = hojaTemas_(ritual);
    const id = siguienteIdTema_(hoja, ritual.prefijoTema);
    const conId = Object.assign({}, tema, { id });
    hoja.appendRow(temaAFila_(conId));
    return conId;
  } finally {
    bloqueo.releaseLock();
  }
}

// Lee todos los temas del registro, en el orden de la hoja.
function leerTemas_(ritual) {
  const hoja = hojaTemas_(ritual);
  const [cabeceras, ...filas] = hoja.getDataRange().getValues();
  return filas
    .map((fila) =>
      fila.map((v) => (v instanceof Date ? Utilities.formatDate(v, ritual.zonaHoraria, 'yyyy-MM-dd') : v))
    )
    .map((fila) => filaATema(cabeceras, fila))
    .filter((tema) => tema.id);
}

function buscarTema_(ritual, id) {
  return leerTemas_(ritual).find((tema) => tema.id === id) || null;
}

// Reescribe la fila del tema con su ID. Conserva la columna Notas, que no es del dominio.
function actualizarTema_(ritual, tema) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(10000);
  try {
    const hoja = hojaTemas_(ritual);
    const ids = hoja.getRange(1, 1, hoja.getLastRow(), 1).getValues().map(([v]) => String(v));
    const fila = ids.indexOf(tema.id) + 1;
    if (fila < 2) throw new Error(`No existe el tema ${tema.id} en el registro.`);
    const columnas = COLUMNAS_REGISTRO.filter(([campo]) => campo).length;
    hoja.getRange(fila, 1, 1, columnas).setValues([temaAFila_(tema).slice(0, columnas)]);
  } finally {
    bloqueo.releaseLock();
  }
}

// Abre la hoja de temas. Si el registro está vacío, la nombra y escribe las cabeceras.
function hojaTemas_(ritual) {
  const libro = SpreadsheetApp.openById(ritual.registroId);
  let hoja = libro.getSheetByName(NOMBRE_HOJA_TEMAS);
  if (!hoja) {
    hoja = libro.getSheets()[0];
    hoja.setName(NOMBRE_HOJA_TEMAS);
  }
  if (hoja.getLastRow() <= 1) {
    const cabeceras = COLUMNAS_REGISTRO.map(([, cabecera]) => cabecera);
    hoja.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function siguienteIdTema_(hoja, prefijo) {
  const filas = hoja.getLastRow() - 1;
  const ids = filas > 0 ? hoja.getRange(2, 1, filas, 1).getValues().map(([v]) => String(v)) : [];
  return siguienteId(ids, prefijo);
}

// Lógica pura: siguiente ID a partir de los existentes, p. ej. DR-007 tras DR-006.
function siguienteId(ids, prefijo) {
  const patron = new RegExp(`^${prefijo}-(\\d+)$`);
  const maximo = ids.reduce((max, id) => {
    const m = patron.exec(id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `${prefijo}-${String(maximo + 1).padStart(3, '0')}`;
}

// Lógica pura: fila del registro a tema del dominio. Localiza cada campo por su
// cabecera, así que tolera columnas reordenadas o añadidas a mano.
function filaATema(cabeceras, fila) {
  const tema = {};
  COLUMNAS_REGISTRO.forEach(([campo, cabecera]) => {
    if (!campo) return;
    const i = cabeceras.indexOf(cabecera);
    const valor = i >= 0 ? fila[i] : '';
    tema[campo] = valor;
  });
  tema.id = String(tema.id || '');
  tema.responsable = String(tema.responsable || '').toLowerCase();
  tema.proponente = String(tema.proponente || '').toLowerCase();
  tema.duracion = Number(tema.duracion) || 0;
  tema.urgencia = Number(tema.urgencia) || URGENCIA_POR_DEFECTO;
  tema.asignado = tema.asignado === 'Sí';
  tema.preferencia = tema.preferencia === 'Sí';
  tema.sesiones = tema.sesiones ? String(tema.sesiones).split(',').map((s) => s.trim()) : [];
  tema.fechaAlta = String(tema.fechaAlta || '');
  return tema;
}

// Lógica pura: tema del dominio a fila del registro.
function temaAFila_(tema) {
  return COLUMNAS_REGISTRO.map(([campo]) => {
    if (!campo) return '';
    const valor = tema[campo];
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (Array.isArray(valor)) return valor.join(', ');
    return valor == null ? '' : valor;
  });
}
