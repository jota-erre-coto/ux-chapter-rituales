const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { cargar } = require('./cargar');

test('el script carga en el orden alfabético que usa Apps Script', () => {
  const archivos = fs.readdirSync(path.join(__dirname, '..', 'src')).filter((f) => f.endsWith('.js')).sort();
  cargar(...archivos);
});
