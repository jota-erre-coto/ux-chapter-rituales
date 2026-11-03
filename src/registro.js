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
