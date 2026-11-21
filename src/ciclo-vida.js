// Ciclo de vida del tema. Lógica pura: recibe datos y devuelve el tema o los errores.
// Cubre por ahora la creación, la edición y el descarte.

const LONGITUD_MAX_TITULO = 120;

// Las listas de estados son funciones y no constantes porque Apps Script carga los
// archivos por orden alfabético y ESTADOS (dominio.js) aún no existe al cargar este.

// Estados en los que el responsable puede editar su tema: los del backlog.
function estadosEditables_() {
  return [ESTADOS.propuesto, ESTADOS.reabierto];
}

// Estados desde los que se puede descartar: cualquiera anterior a resuelto.
function estadosDescartables_() {
  return [ESTADOS.propuesto, ESTADOS.seleccionado, ESTADOS.tratado, ESTADOS.reabierto];
}

// datos: lo que llega del diálogo de alta (texto sin normalizar). Si trae un
// responsable distinto de quien propone, el tema es asignado.
// actor: { email } de quien propone.
// fechaAlta: 'AAAA-MM-DD' en la zona horaria del ritual.
// asignacion: { permitida, miembros: [emails] }; solo hace falta para asignar.
// Devuelve { ok: true, tema } o { ok: false, errores: { campo: mensaje } }.
function crearTema(datos, actor, fechaAlta, asignacion) {
  const { valores, errores } = validarCampos_(datos);
  const email = emailDe_(actor);
  if (!email) errores.actor = 'No se ha podido identificar a quien propone el tema.';

  const responsable = limpiar_(datos.responsable).toLowerCase() || email;
  const asignado = Boolean(email) && responsable !== email;
  if (asignado) {
    asignacion = asignacion || { permitida: false, miembros: [] };
    if (!asignacion.permitida)
      errores.responsable = 'Solo el organizador, o el suplente en su ausencia, puede asignar temas.';
    else if (!asignacion.miembros.includes(responsable))
      errores.responsable = 'El responsable tiene que ser miembro del espacio.';
  }
  if (Object.keys(errores).length) return { ok: false, errores };

  return {
    ok: true,
    tema: Object.assign(valores, {
      proponente: email,
      responsable,
      asignado,
      estado: ESTADOS.propuesto,
      fechaAlta,
      preferencia: false,
      sesiones: [],
    }),
  };
}

// Solo el responsable edita, y solo mientras el tema está en el backlog.
function editarTema(tema, datos, actor) {
  if (emailDe_(actor) !== tema.responsable) {
    return { ok: false, errores: { actor: 'Solo el responsable puede editar este tema.' } };
  }
  if (!estadosEditables_().includes(tema.estado)) {
    return {
      ok: false,
      errores: { estado: `El tema está ${tema.estado} y ya no se puede editar.` },
    };
  }
  const { valores, errores } = validarCampos_(datos);
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, tema: Object.assign({}, tema, valores) };
}

// Descartan el responsable, el organizador del ritual o el suplente.
// ritual: { organizador, suplente } con sus emails.
function descartarTema(tema, actor, ritual) {
  const email = emailDe_(actor);
  const autorizados = [tema.responsable, ritual.organizador, ritual.suplente].map((e) =>
    String(e || '').toLowerCase()
  );
  if (!email || !autorizados.includes(email)) {
    return {
      ok: false,
      errores: { actor: 'Solo el responsable, el organizador o el suplente pueden descartar el tema.' },
    };
  }
  const esGestor = [ritual.organizador, ritual.suplente]
    .map((e) => String(e || '').toLowerCase())
    .includes(email);
  if (tema.asignado && !esGestor) {
    return {
      ok: false,
      errores: {
        actor: 'Un tema asignado no se puede descartar. Si no puedes llevarlo, habla con quien te lo asignó.',
      },
    };
  }
  if (!estadosDescartables_().includes(tema.estado)) {
    return {
      ok: false,
      errores: { estado: `El tema está ${tema.estado} y ya no se puede descartar.` },
    };
  }
  return { ok: true, tema: Object.assign({}, tema, { estado: ESTADOS.descartado }) };
}

// Selecciona un tema para la sesión: lo hacen el organizador o el suplente, y solo
// con temas del backlog que no tengan Falta preparación.
function seleccionarTema(tema, actor, ritual) {
  const email = emailDe_(actor);
  const gestores = [ritual.organizador, ritual.suplente].map((e) => String(e || '').toLowerCase());
  if (!email || !gestores.includes(email)) {
    return { ok: false, errores: { actor: 'Solo el organizador o el suplente pueden seleccionar temas.' } };
  }
  if (!estadosEditables_().includes(tema.estado)) {
    return { ok: false, errores: { estado: `El tema ${tema.id} está ${tema.estado} y no se puede seleccionar.` } };
  }
  if (tema.preparacion === PREPARACIONES.falta) {
    return { ok: false, errores: { preparacion: `Al tema ${tema.id} le falta preparación.` } };
  }
  return { ok: true, tema: Object.assign({}, tema, { estado: ESTADOS.seleccionado }) };
}

// Al confirmar, el responsable completa el contexto y el enlace de su tema
// seleccionado. Solo cambia lo que trae relleno.
function completarTema(tema, datos, actor) {
  if (emailDe_(actor) !== tema.responsable) {
    return { ok: false, errores: { actor: 'Solo el responsable puede confirmar este tema.' } };
  }
  if (tema.estado !== ESTADOS.seleccionado) {
    return { ok: false, errores: { estado: `El tema ${tema.id} no está seleccionado: ahora está ${tema.estado}.` } };
  }
  const contexto = limpiar_(datos.contexto);
  const enlace = limpiar_(datos.enlace);
  if (enlace && !/^https?:\/\/\S+$/.test(enlace)) {
    return { ok: false, errores: { enlace: 'Escribe un enlace que empiece por https://' } };
  }
  const cambios = {};
  if (contexto) cambios.contexto = contexto;
  if (enlace) cambios.enlace = enlace;
  return { ok: true, tema: Object.assign({}, tema, cambios) };
}

// Devuelve al backlog un tema seleccionado que no se presentará (su responsable no
// puede o no confirmó). Lo hacen el responsable, el organizador o el suplente.
function liberarTema(tema, actor, ritual) {
  const email = emailDe_(actor);
  const autorizados = [tema.responsable, ritual.organizador, ritual.suplente].map((e) =>
    String(e || '').toLowerCase()
  );
  if (!email || !autorizados.includes(email)) {
    return { ok: false, errores: { actor: 'No puedes devolver este tema al backlog.' } };
  }
  if (tema.estado !== ESTADOS.seleccionado) {
    return { ok: false, errores: { estado: `El tema ${tema.id} no está seleccionado: ahora está ${tema.estado}.` } };
  }
  return { ok: true, tema: Object.assign({}, tema, { estado: ESTADOS.propuesto }) };
}

// Aplaza un tema seleccionado cuya sesión se cancela: vuelve al backlog con
// preferencia para la siguiente. Lo hacen el organizador o el suplente.
function aplazarTema(tema, actor, ritual) {
  const email = emailDe_(actor);
  const gestores = [ritual.organizador, ritual.suplente].map((e) => String(e || '').toLowerCase());
  if (!email || !gestores.includes(email)) {
    return { ok: false, errores: { actor: 'Solo el organizador o el suplente pueden aplazar temas.' } };
  }
  if (tema.estado !== ESTADOS.seleccionado) {
    return { ok: false, errores: { estado: `El tema ${tema.id} no está seleccionado: ahora está ${tema.estado}.` } };
  }
  return { ok: true, tema: Object.assign({}, tema, { estado: ESTADOS.propuesto, preferencia: true }) };
}

// Asigna temas el organizador, y el suplente solo mientras el organizador está ausente.
function puedeAsignar(actor, ritual, organizadorAusente) {
  const email = emailDe_(actor);
  if (!email) return false;
  if (email === String(ritual.organizador).toLowerCase()) return true;
  return Boolean(organizadorAusente) && email === String(ritual.suplente).toLowerCase();
}

function puedeEditar(tema, actor) {
  return emailDe_(actor) === tema.responsable && estadosEditables_().includes(tema.estado);
}

function puedeDescartar(tema, actor, ritual) {
  return descartarTema(tema, actor, ritual).ok;
}

// Valida y normaliza los campos que la persona rellena en el diálogo.
function validarCampos_(datos) {
  const errores = {};
  const valores = {
    titulo: limpiar_(datos.titulo),
    contexto: limpiar_(datos.contexto),
    enlace: limpiar_(datos.enlace),
    tipo: datos.tipo,
    duracion: Number(datos.duracion),
    urgencia: datos.urgencia ? Number(datos.urgencia) : URGENCIA_POR_DEFECTO,
    preparacion: datos.preparacion || PREPARACIONES.falta,
  };

  if (!valores.titulo) errores.titulo = 'Escribe un título.';
  else if (valores.titulo.length > LONGITUD_MAX_TITULO)
    errores.titulo = `El título admite hasta ${LONGITUD_MAX_TITULO} caracteres.`;
  if (!TIPOS_FEEDBACK.includes(valores.tipo)) errores.tipo = 'Elige el tipo de feedback.';
  if (!DURACIONES_MIN.includes(valores.duracion))
    errores.duracion = 'Elige la duración: 15, 30 o 45 minutos.';
  if (!Number.isInteger(valores.urgencia) || valores.urgencia < 1 || valores.urgencia > 5)
    errores.urgencia = 'Elige una urgencia del 1 al 5.';
  if (!Object.values(PREPARACIONES).includes(valores.preparacion))
    errores.preparacion = 'Elige la preparación.';
  if (valores.enlace && !/^https?:\/\/\S+$/.test(valores.enlace))
    errores.enlace = 'Escribe un enlace que empiece por https://';

  return { valores, errores };
}

function emailDe_(actor) {
  const email = limpiar_(actor && actor.email).toLowerCase();
  return email.includes('@') ? email : '';
}

function limpiar_(valor) {
  return String(valor == null ? '' : valor).trim();
}
