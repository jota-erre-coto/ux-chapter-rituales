// Redacción del acta (Documento de sesiones). Lógica pura: recibe una sesión con sus
// temas validados y devuelve la entrada como una lista de bloques, sin saber nada de
// Google Docs. El adaptador del acta (#14) los escribe en la pestaña del trimestre,
// con la sesión más reciente arriba.
//
// sesion: { fecha, participantes: [nombres], facilita, notasUrl, temas: [tema] }
// tema: { id, titulo, responsable, tipo, contexto, hilo, validado,
//         resultado: 'resuelto' | 'reabierto' | 'no_tratado',
//         acuerdos: [texto], siguientesPasos: [{ accion, encargado }], falta }
//
// Bloques: { tipo: 'sesion' | 'datos' | 'tema' | 'campo' | 'lista' | 'nota', ... }

const RESULTADO_ACTA = { resuelto: 'resuelto', reabierto: 'reabierto', noTratado: 'no_tratado' };

// Pestaña del acta para una fecha 'AAAA-MM-DD': '2026 · T4'.
function pestanaTrimestre(fecha) {
  const [anio, mes] = fecha.split('-').map(Number);
  return `${anio} · T${Math.floor((mes - 1) / 3) + 1}`;
}

function redactarEntradaActa(sesion) {
  const validados = sesion.temas.filter((t) => t.validado);
  const tratados = validados.filter((t) => t.resultado !== RESULTADO_ACTA.noTratado);
  const noTratados = validados.filter((t) => t.resultado === RESULTADO_ACTA.noTratado);

  const bloques = [
    { tipo: 'sesion', texto: `Sesión del ${fechaLarga(sesion.fecha)} de ${sesion.fecha.slice(0, 4)}` },
    {
      tipo: 'datos',
      lineas: [
        `Facilitó: ${sesion.facilita}`,
        `Participantes: ${sesion.participantes.length ? sesion.participantes.join(', ') : 'sin registrar'}`,
      ],
      enlace: sesion.notasUrl ? { texto: 'Notas de Gemini', url: sesion.notasUrl } : null,
    },
  ];

  if (!tratados.length) {
    bloques.push({ tipo: 'nota', texto: 'No hay temas validados de esta sesión.' });
  }
  tratados.forEach((tema) => bloques.push(...bloquesTema_(tema)));
  if (noTratados.length) {
    bloques.push({
      tipo: 'nota',
      texto: `No se llegaron a tratar y pasan a la próxima sesión: ${noTratados.map((t) => `${t.id} «${t.titulo}»`).join(', ')}.`,
    });
  }
  return bloques;
}

function bloquesTema_(tema) {
  const reabierto = tema.resultado === RESULTADO_ACTA.reabierto;
  const bloques = [
    { tipo: 'tema', texto: `${tema.id} · ${tema.titulo}`, enlace: tema.hilo ? { texto: 'Hilo', url: tema.hilo } : null },
    { tipo: 'campo', etiqueta: 'Responsable', valor: tema.responsable },
    { tipo: 'campo', etiqueta: 'Tipo de feedback', valor: tema.tipo },
    { tipo: 'campo', etiqueta: 'Estado', valor: reabierto ? 'Reabierto' : 'Resuelto' },
  ];
  if (tema.contexto) bloques.push({ tipo: 'campo', etiqueta: 'Contexto', valor: tema.contexto });
  bloques.push({
    tipo: 'lista',
    etiqueta: 'Acuerdos',
    items: (tema.acuerdos || []).length ? tema.acuerdos : ['Sin acuerdos.'],
  });
  if (reabierto) {
    bloques.push({ tipo: 'campo', etiqueta: 'Falta para cerrarlo', valor: tema.falta || 'Sin indicar.' });
  }
  const pasos = (tema.siguientesPasos || []).map((p) => `${p.accion} (encargado: ${p.encargado || 'sin asignar'})`);
  bloques.push({ tipo: 'lista', etiqueta: 'Siguientes pasos', items: pasos.length ? pasos : ['Ninguno.'] });
  return bloques;
}

// Sesiones en las que se trató un tema, para el registro: añade la fecha sin repetir.
function anotarSesion(sesiones, fecha) {
  return sesiones.includes(fecha) ? sesiones.slice() : sesiones.concat([fecha]).sort();
}
