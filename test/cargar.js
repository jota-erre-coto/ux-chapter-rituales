// Carga los archivos de src/ en un mismo contexto, como hace Apps Script con el
// ámbito global, y devuelve una función para leer sus símbolos.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(...archivos) {
  return cargarEn(vm.createContext({}), ...archivos);
}

// Igual que cargar, pero sobre un contexto propio: permite sustituir después funciones
// de Apps Script (o de otros archivos) asignándolas en el contexto.
function cargarEn(contexto, ...archivos) {
  for (const archivo of archivos) {
    const ruta = path.join(__dirname, '..', 'src', archivo);
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), contexto, { filename: ruta });
  }
  return (nombre) => vm.runInContext(nombre, contexto);
}

module.exports = { cargar, cargarEn };
