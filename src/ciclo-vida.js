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

// datos: lo que llega del diálogo de alta (texto sin normalizar).
// actor: { email } de quien propone.
// fechaAlta: 'AAAA-MM-DD' en la zona horaria del ritual.
// Devuelve { ok: true, tema } o { ok: false, errores: { campo: mensaje } }.
function crearTema(datos, actor, fechaAlta) {
  const { valores, errores } = validarCampos_(datos);
  const email = emailDe_(actor);
  if (!email) errores.actor = 'No se ha podido identificar a quien propone el tema.';
  if (Object.keys(errores).length) return { ok: false, errores };

  return {
    ok: true,
    tema: Object.assign(valores, {
      proponente: email,
      responsable: email,
      asignado: false,
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
  if (!estadosDescartables_().includes(tema.estado)) {
    return {
      ok: false,
      errores: { estado: `El tema está ${tema.estado} y ya no se puede descartar.` },
    };
  }
  return { ok: true, tema: Object.assign({}, tema, { estado: ESTADOS.descartado }) };
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
    errores.titulo = `El título no puede pasar de ${LONGITUD_MAX_TITULO} caracteres.`;
  if (!TIPOS_FEEDBACK.includes(valores.tipo)) errores.tipo = 'Elige el tipo de feedback.';
  if (!DURACIONES_MIN.includes(valores.duracion))
    errores.duracion = 'Elige la duración: 15, 30 o 45 minutos.';
  if (!Number.isInteger(valores.urgencia) || valores.urgencia < 1 || valores.urgencia > 5)
    errores.urgencia = 'La urgencia va de 1 a 5.';
  if (!Object.values(PREPARACIONES).includes(valores.preparacion))
    errores.preparacion = 'Elige la preparación.';
  if (valores.enlace && !/^https?:\/\/\S+$/.test(valores.enlace))
    errores.enlace = 'El enlace tiene que empezar por https://.';

  return { valores, errores };
}

function emailDe_(actor) {
  const email = limpiar_(actor && actor.email).toLowerCase();
  return email.includes('@') ? email : '';
}

function limpiar_(valor) {
  return String(valor == null ? '' : valor).trim();
}
