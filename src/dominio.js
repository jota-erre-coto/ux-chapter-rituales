// Vocabulario del dominio (ver CONTEXT.md). Lógica pura: sin servicios de Google.

const ESTADOS = {
  propuesto: 'propuesto',
  seleccionado: 'seleccionado',
  tratado: 'tratado',
  resuelto: 'resuelto',
  reabierto: 'reabierto',
  descartado: 'descartado',
};

const TIPOS_FEEDBACK = [
  'Decidir entre opciones',
  'Validar una propuesta',
  'Abrir un debate',
  'Informar',
];

const PREPARACIONES = {
  lista: 'Lista',
  laTendre: 'La tendré para la sesión',
  falta: 'Falta preparación',
};

const DURACIONES_MIN = [15, 30, 45];

const URGENCIA_POR_DEFECTO = 3;
