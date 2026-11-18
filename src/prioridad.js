// Priorización y propuesta de selección. Lógica pura.

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

// Orden de prioridad: primero los aplazados (con preferencia), después por urgencia
// efectiva y, a igual urgencia, el más antiguo. El ID desempata para que el orden
// sea siempre el mismo.
function ordenarPorPrioridad(temas, hoy) {
  const clave = (t) => [t.preferencia ? 0 : 1, -urgenciaEfectiva(t, hoy), t.fechaAlta, t.id];
  return temas.slice().sort((a, b) => {
    const ka = clave(a);
    const kb = clave(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
    return 0;
  });
}

// Temas del backlog que se pueden seleccionar: propuestos o reabiertos, y preparados
// o con la preparación comprometida para la sesión.
function candidatos(temas) {
  return temas.filter(
    (t) =>
      [ESTADOS.propuesto, ESTADOS.reabierto].includes(t.estado) &&
      t.preparacion !== PREPARACIONES.falta
  );
}

// Propuesta de selección: recorre los candidatos por prioridad y mete cada uno que
// quepa en la duración de la sesión. Los sustitutos son los que quedan fuera con
// preparación Lista, en el mismo orden.
// Devuelve { seleccion, sustitutos, minutos }.
function proponerSeleccion(temas, hoy, duracionSesionMin) {
  const ordenados = ordenarPorPrioridad(candidatos(temas), hoy);
  const seleccion = [];
  let minutos = 0;
  ordenados.forEach((t) => {
    if (minutos + t.duracion <= duracionSesionMin) {
      seleccion.push(t);
      minutos += t.duracion;
    }
  });
  return { seleccion, sustitutos: sustitutosPara(temas, seleccion, hoy), minutos };
}

// Sustitutos de una selección: candidatos que han quedado fuera con preparación Lista,
// por prioridad.
function sustitutosPara(temas, seleccion, hoy) {
  const dentro = seleccion.map((t) => t.id);
  return ordenarPorPrioridad(candidatos(temas), hoy).filter(
    (t) => !dentro.includes(t.id) && t.preparacion === PREPARACIONES.lista
  );
}

// «Solo uno»: deja en la selección únicamente el tema indicado.
function quedarseConUno(seleccion, id) {
  const tema = seleccion.find((t) => t.id === id);
  if (!tema) return { ok: false, errores: { id: `El tema ${id} no está en la propuesta.` } };
  return { ok: true, seleccion: [tema] };
}

// «Cambiar tema»: sustituye un tema de la selección por otro candidato del backlog,
// también uno que llegó después del cierre de la convocatoria, siempre que quepa.
// Sin saleId, añade el tema a la selección si hay hueco.
function cambiarTema(seleccion, saleId, entra, duracionSesionMin) {
  if (saleId && !seleccion.some((t) => t.id === saleId))
    return { ok: false, errores: { id: `El tema ${saleId} no está en la propuesta.` } };
  if (!candidatos([entra]).length)
    return { ok: false, errores: { id: `El tema ${entra.id} no se puede seleccionar: ${motivoNoCandidato_(entra)}.` } };
  if (seleccion.some((t) => t.id === entra.id))
    return { ok: false, errores: { id: `El tema ${entra.id} ya está en la propuesta.` } };
  const nueva = saleId ? seleccion.map((t) => (t.id === saleId ? entra : t)) : seleccion.concat([entra]);
  const minutos = nueva.reduce((suma, t) => suma + t.duracion, 0);
  if (minutos > duracionSesionMin)
    return { ok: false, errores: { duracion: `Con ese cambio la sesión pasaría a ${minutos} minutos.` } };
  return { ok: true, seleccion: nueva };
}

function motivoNoCandidato_(tema) {
  if (tema.preparacion === PREPARACIONES.falta) return 'le falta preparación';
  return `está ${tema.estado}`;
}
