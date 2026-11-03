// Priorización. Lógica pura. Primer corte: la urgencia efectiva de un tema.
// La propuesta de selección (#8) se apoyará en esto.

const SEMANAS_POR_PUNTO_DE_URGENCIA = 3;
const DIA_MS = 24 * 60 * 60 * 1000;

// Semanas completas que lleva el tema en el backlog. Fechas en 'AAAA-MM-DD'.
function antiguedadSemanas(fechaAlta, hoy) {
  const dias = Math.round((Date.parse(hoy) - Date.parse(fechaAlta)) / DIA_MS);
  return Number.isFinite(dias) && dias > 0 ? Math.floor(dias / 7) : 0;
}

// La urgencia declarada sube 1 punto cada 3 semanas en el backlog, hasta 5.
function urgenciaEfectiva(tema, hoy) {
  const subida = Math.floor(antiguedadSemanas(tema.fechaAlta, hoy) / SEMANAS_POR_PUNTO_DE_URGENCIA);
  return Math.min(5, Number(tema.urgencia) + subida);
}
