const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando script de análisis de inventario...');

// 1. Asegurar la presencia de la librería 'xlsx' (SheetJS)
try {
  require.resolve('xlsx');
  console.log('La librería "xlsx" ya está instalada.');
} catch (e) {
  console.log('Instalando la librería "xlsx" para el análisis de archivos .xls de forma temporal...');
  execSync('npm install xlsx --no-save', { stdio: 'inherit', cwd: __dirname });
}

const XLSX = require('xlsx');

const cpuPath = path.join(__dirname, 'DB_CPU.xls');
const ImpresorasPath = path.join(__dirname, 'db_impresoras.xls');

const result = {
  cpu: {
    columns: [],
    sample: [],
    agencias: new Set(),
    ciudades: new Set(),
    tipos: new Set(),
    marcas: new Set(),
    modelos: new Set(),
    totalRows: 0
  },
  impresoras: {
    columns: [],
    sample: [],
    agencias: new Set(),
    ciudades: new Set(),
    tipos: new Set(),
    marcas: new Set(),
    modelos: new Set(),
    totalRows: 0
  }
};

function normalizeText(txt) {
  if (!txt) return '';
  return String(txt).trim().toUpperCase();
}

function processFile(filePath, key) {
  if (!fs.existsSync(filePath)) {
    console.error(`El archivo no existe: ${filePath}`);
    return;
  }

  console.log(`Leyendo archivo: ${path.basename(filePath)}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Obtener todos los registros como JSON
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  result[key].totalRows = rows.length;

  if (rows.length === 0) return;

  // Obtener columnas/encabezados
  const columns = Object.keys(rows[0]);
  result[key].columns = columns;
  result[key].sample = rows.slice(0, 3); // Guardar una pequeña muestra

  // Analizar datos fila por fila
  rows.forEach(row => {
    // Buscar campos comunes de agencia, ciudad, tipo, marca y modelo de manera dinámica
    let agencia = '';
    let ciudad = '';
    let tipo = key === 'impresoras' ? 'IMPRESORA' : 'CPU';
    let marca = '';
    let modelo = '';

    Object.keys(row).forEach(col => {
      const colNorm = normalizeText(col);
      const val = row[col];
      
      if (colNorm.includes('AGENCIA') || colNorm.includes('SEDE') || colNorm.includes('OFICINA') || colNorm.includes('UBICACION')) {
        if (val) agencia = val;
      }
      if (colNorm.includes('CIUDAD') || colNorm.includes('DEPARTAMENTO') || colNorm.includes('PROVINCIA')) {
        if (val) ciudad = val;
      }
      if (colNorm.includes('TIPO') || colNorm.includes('CATEGORIA') || colNorm.includes('EQUIPO')) {
        if (val) tipo = val;
      }
      if (colNorm.includes('MARCA') || colNorm.includes('FABRICANTE')) {
        if (val) marca = val;
      }
      if (colNorm.includes('MODELO')) {
        if (val) modelo = val;
      }
    });

    if (agencia) result[key].agencias.add(normalizeText(agencia));
    if (ciudad) result[key].ciudades.add(normalizeText(ciudad));
    if (tipo) result[key].tipos.add(normalizeText(tipo));
    if (marca) result[key].marcas.add(normalizeText(marca));
    if (modelo) result[key].modelos.add(normalizeText(modelo));
  });
}

processFile(cpuPath, 'cpu');
processFile(ImpresorasPath, 'impresoras');

// Consolidar conjuntos únicos
const summary = {
  totalCpuRows: result.cpu.totalRows,
  totalImpresoraRows: result.impresoras.totalRows,
  
  cpuColumns: result.cpu.columns,
  impresoraColumns: result.impresoras.columns,
  
  agenciasUnicas: Array.from(new Set([...result.cpu.agencias, ...result.impresoras.agencias])),
  ciudadesUnicas: Array.from(new Set([...result.cpu.ciudades, ...result.impresoras.ciudades])),
  tiposEquipos: Array.from(new Set([...result.cpu.tipos, ...result.impresoras.tipos])),
  marcasUnicas: Array.from(new Set([...result.cpu.marcas, ...result.impresoras.marcas])),
  modelosUnicos: Array.from(new Set([...result.cpu.modelos, ...result.impresoras.modelos])),
  
  cpuSample: result.cpu.sample,
  impresoraSample: result.impresoras.sample
};

const summaryPath = path.join(__dirname, 'inventario_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
console.log(`\n✅ Análisis completado con éxito. Resultados guardados en: ${summaryPath}`);
