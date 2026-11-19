// Confirmación de los responsables y sustitutos. Lógica pura sobre el estado de la
// propuesta de la semana: { ids, confirmaciones: { [id]: estado }, liberados, sinTemas }.
//
// Estados de confirmación de un tema seleccionado:
//   pendiente  → aún no ha respondido
//   confirmado → su responsable lo lleva
//   no_puede   → su responsable no puede; espera sustituto o que el organizador decida

const CONFIRMACION = { pendiente: 'pendiente', confirmado: 'confirmado', noPuede: 'no_puede' };

// Abre la ronda de confirmaciones: todos los temas de la propuesta, pendientes.
function iniciarConfirmaciones(propuesta) {
  const confirmaciones = {};
  propuesta.ids.forEach((id) => (confirmaciones[id] = CONFIRMACION.pendiente));
  return Object.assign({}, propuesta, { confirmaciones, liberados: [] });
}

// Registra la respuesta de un responsable. Solo se responde una vez y solo a un tema
// de la propuesta.
function responderConfirmacion(propuesta, id, respuesta) {
  const actual = (propuesta.confirmaciones || {})[id];
  if (!actual) return { ok: false, errores: { id: `El tema ${id} no está en la sesión de esta semana.` } };
  if (actual !== CONFIRMACION.pendiente) {
    return { ok: false, errores: { id: `Ya respondiste por el tema ${id}.` } };
  }
  if (![CONFIRMACION.confirmado, CONFIRMACION.noPuede].includes(respuesta)) {
    return { ok: false, errores: { respuesta: 'Respuesta no válida.' } };
  }
  const confirmaciones = Object.assign({}, propuesta.confirmaciones, { [id]: respuesta });
  return { ok: true, propuesta: Object.assign({}, propuesta, { confirmaciones }) };
}

// Temas que necesitan sustituto: los que no pueden y, pasado el plazo, los pendientes.
function sinConfirmar(propuesta, plazoVencido) {
  return propuesta.ids.filter((id) => {
    const estado = propuesta.confirmaciones[id];
    return estado === CONFIRMACION.noPuede || (plazoVencido && estado === CONFIRMACION.pendiente);
  });
}

function temasConfirmados(propuesta) {
  return propuesta.ids.filter((id) => propuesta.confirmaciones[id] === CONFIRMACION.confirmado);
}

// Sin temas: ninguno confirmado ni pendiente de responder.
function sesionSinTemas(propuesta) {
  return !propuesta.ids.some((id) =>
    [CONFIRMACION.confirmado, CONFIRMACION.pendiente].includes(propuesta.confirmaciones[id])
  );
}

// Siguiente sustituto para el tema que sale: candidato con preparación Lista, fuera de
// la propuesta y de los ya liberados esta semana, que quepa en la sesión sin el que sale.
// temas: registro completo; devuelve el tema o null.
function elegirSustituto(temas, propuesta, saleId, hoy, duracionSesionMin) {
  const porId = Object.fromEntries(temas.map((t) => [t.id, t]));
  const ocupado = propuesta.ids
    .filter((id) => id !== saleId && propuesta.confirmaciones[id] !== CONFIRMACION.noPuede)
    .reduce((suma, id) => suma + ((porId[id] && porId[id].duracion) || 0), 0);
  const fuera = propuesta.ids.concat(propuesta.liberados || []);
  return (
    ordenarPorPrioridad(candidatos(temas), hoy).find(
      (t) =>
        t.preparacion === PREPARACIONES.lista &&
        !fuera.includes(t.id) &&
        ocupado + t.duracion <= duracionSesionMin
    ) || null
  );
}

// Sustituye en la propuesta el tema que sale por el que entra, ya confirmado: es un
// tema Lista y no hay tiempo para otra ronda antes del anuncio.
function sustituirTema(propuesta, saleId, entraId) {
  if (!propuesta.ids.includes(saleId)) {
    return { ok: false, errores: { id: `El tema ${saleId} ya no está en la sesión.` } };
  }
  if (propuesta.confirmaciones[saleId] === CONFIRMACION.confirmado) {
    return { ok: false, errores: { id: `El tema ${saleId} ya está confirmado.` } };
  }
  if (propuesta.ids.includes(entraId)) {
    return { ok: false, errores: { id: `El tema ${entraId} ya está en la sesión.` } };
  }
  const confirmaciones = Object.assign({}, propuesta.confirmaciones, { [entraId]: CONFIRMACION.confirmado });
  delete confirmaciones[saleId];
  return {
    ok: true,
    propuesta: Object.assign({}, propuesta, {
      ids: propuesta.ids.map((id) => (id === saleId ? entraId : id)),
      confirmaciones,
      liberados: (propuesta.liberados || []).concat([saleId]),
    }),
  };
}

// Quita de la sesión un tema sin sustituto («Sin sustituto»).
function retirarTema(propuesta, saleId) {
  if (!propuesta.ids.includes(saleId)) {
    return { ok: false, errores: { id: `El tema ${saleId} ya no está en la sesión.` } };
  }
  if (propuesta.confirmaciones[saleId] === CONFIRMACION.confirmado) {
    return { ok: false, errores: { id: `El tema ${saleId} ya está confirmado.` } };
  }
  const confirmaciones = Object.assign({}, propuesta.confirmaciones);
  delete confirmaciones[saleId];
  return {
    ok: true,
    propuesta: Object.assign({}, propuesta, {
      ids: propuesta.ids.filter((id) => id !== saleId),
      confirmaciones,
      liberados: (propuesta.liberados || []).concat([saleId]),
    }),
  };
}
