// Ciclo de vida del tema. Lógica pura: recibe datos y devuelve el tema o los errores.
// Primer corte: la creación de un tema propuesto por su propio responsable.

const LONGITUD_MAX_TITULO = 120;

// datos: lo que llega del diálogo de alta (texto sin normalizar).
// actor: { email } de quien propone.
// fechaAlta: 'AAAA-MM-DD' en la zona horaria del ritual.
// Devuelve { ok: true, tema } o { ok: false, errores: { campo: mensaje } }.
function crearTema(datos, actor, fechaAlta) {
  const errores = {};
  const titulo = limpiar_(datos.titulo);
  const contexto = limpiar_(datos.contexto);
  const enlace = limpiar_(datos.enlace);
  const duracion = Number(datos.duracion);
  const urgencia = datos.urgencia ? Number(datos.urgencia) : URGENCIA_POR_DEFECTO;
  const preparacion = datos.preparacion || PREPARACIONES.falta;
  const email = limpiar_(actor && actor.email).toLowerCase();

  if (!titulo) errores.titulo = 'Escribe un título.';
  else if (titulo.length > LONGITUD_MAX_TITULO)
    errores.titulo = `El título no puede pasar de ${LONGITUD_MAX_TITULO} caracteres.`;
  if (!TIPOS_FEEDBACK.includes(datos.tipo)) errores.tipo = 'Elige el tipo de feedback.';
  if (!DURACIONES_MIN.includes(duracion)) errores.duracion = 'Elige la duración: 15, 30 o 45 minutos.';
  if (!Number.isInteger(urgencia) || urgencia < 1 || urgencia > 5)
    errores.urgencia = 'La urgencia va de 1 a 5.';
  if (!Object.values(PREPARACIONES).includes(preparacion))
    errores.preparacion = 'Elige la preparación.';
  if (enlace && !/^https?:\/\/\S+$/.test(enlace)) errores.enlace = 'El enlace tiene que empezar por https://.';
  if (!email.includes('@')) errores.actor = 'No se ha podido identificar a quien propone el tema.';

  if (Object.keys(errores).length) return { ok: false, errores };

  return {
    ok: true,
    tema: {
      titulo,
      contexto,
      enlace,
      proponente: email,
      responsable: email,
      asignado: false,
      tipo: datos.tipo,
      duracion,
      preparacion,
      urgencia,
      estado: ESTADOS.propuesto,
      fechaAlta,
      preferencia: false,
      sesiones: [],
    },
  };
}

function limpiar_(valor) {
  return String(valor == null ? '' : valor).trim();
}
