import { Pool } from 'pg';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ActivoTIC, InsumoEconomato } from '../models/mongoSchemas';

dotenv.config();

// Configuración de PostgreSQL
export const pgPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'enocomatik_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

pgPool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/enocomatik_cmdb';

export const connectMongoDB = async (): Promise<typeof mongoose> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGO_URI, {
      connectTimeoutMS: 5000,
    });
    console.log('MongoDB conectado exitosamente a Atlas/Local.');
    return mongoose;
  } catch (error) {
    console.error('Error de conexión en MongoDB:', error);
    throw error;
  }
};

/**
 * Ejecuta de manera explícita y bajo demanda el sembrado inicial del inventario y del catálogo del economato.
 */
export const ejecutarSembradoManual = async (): Promise<{ activosCount: number; insumosCount: number }> => {
  let activosCount = 0;
  let insumosCount = 0;

  // 1. Sembrar activos TIC semilla si no existen
  const existingActivos = await ActivoTIC.countDocuments();
  if (existingActivos === 0) {
    const seeded = await ActivoTIC.insertMany([
      {
        numero_serie: 'YLT1ABWL',
        tipo_equipo: 'PC',
        marca: 'LENOVO',
        modelo: '12XG0013LS',
        ip_asignada: '192.168.20.29',
        nombre_estacion: 'APT-01OP-29',
        usuario_red_asignado: 'rsaez',
        nombre_usuario_final: 'R. Saez',
        ubicacion_agencia: 'San Martin'
      },
      {
        numero_serie: 'KOD-3021',
        tipo_equipo: 'Scanner Kodak i2900',
        marca: 'Kodak',
        modelo: 'i2900',
        ip_asignada: '10.200.12.44',
        nombre_estacion: 'Ventanilla-03',
        usuario_red_asignado: 'lrodriguez',
        nombre_usuario_final: 'Luis Rodriguez',
        ubicacion_agencia: 'Sede Cusco'
      },
      {
        numero_serie: 'CPU-5542',
        tipo_equipo: 'Workstation Dell 7090',
        marca: 'Dell',
        modelo: 'Optiplex 7090',
        ip_asignada: '10.200.12.80',
        nombre_estacion: 'MesaPartes-01',
        usuario_red_asignado: 'mperez',
        nombre_usuario_final: 'Maria Perez',
        ubicacion_agencia: 'Sede Tacna'
      },
      {
        numero_serie: 'CPU-9988',
        tipo_equipo: 'CPU HP ProDesk 400',
        marca: 'HP',
        modelo: 'ProDesk 400',
        ip_asignada: null,
        nombre_estacion: 'MesaPartes-02',
        usuario_red_asignado: 'system',
        nombre_usuario_final: 'Por Asignar',
        ubicacion_agencia: 'Sede Cusco'
      }
    ]);
    activosCount = seeded.length;
    console.log(`[Sembrado] ${activosCount} activos TIC registrados.`);
  }

  // 2. Sembrar Economato desde Excel
  const economatoExcelPath = process.env.CATALOGO_ECONOMATO_PATH || 'D:\\ECONOMATIK\\contexto\\data\\CATALOGO_ECONOMATO.xlsx';
  const { Workbook } = require('exceljs');
  const fs = require('fs');

  if (fs.existsSync(economatoExcelPath)) {
    console.log('[Sembrado] Leyendo CATALOGO_ECONOMATO.xlsx...');
    const workbook = new Workbook();
    await workbook.xlsx.readFile(economatoExcelPath);
    const worksheet = workbook.worksheets[0];
    
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell: any, colNumber: number) => {
      headers[colNumber] = cell.value ? String(cell.value).trim().toUpperCase() : '';
    });
    
    let eanColIdx = -1;
    let skuColIdx = -1;
    let descColIdx = -1;
    let catColIdx = -1;
    let stockColIdx = -1;
    let unidadColIdx = -1;
    
    headers.forEach((h, idx) => {
      if (!h) return;
      if (h.includes('EAN') || h.includes('CODIGO_BARRAS')) eanColIdx = idx;
      if (h.includes('SKU') || h.includes('CODIGO')) {
        if (skuColIdx === -1 || h.includes('SKU')) skuColIdx = idx;
      }
      if (h.includes('DESCRIPCION') || h.includes('ARTICULO') || h.includes('NOMBRE')) descColIdx = idx;
      if (h.includes('CATEGORIA') || h.includes('TIPO') || h.includes('CLASE')) catColIdx = idx;
      if (h.includes('STOCK') || h.includes('CANTIDAD') || h.includes('FISICO')) stockColIdx = idx;
      if (h.includes('UNIDAD') || h.includes('MEDIDA')) unidadColIdx = idx;
    });

    if (eanColIdx === -1) eanColIdx = 1;
    if (skuColIdx === -1) skuColIdx = 2;
    if (descColIdx === -1) descColIdx = 3;
    if (catColIdx === -1) catColIdx = 4;
    if (stockColIdx === -1) stockColIdx = 5;
    if (unidadColIdx === -1) unidadColIdx = 6;

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const ean = row.getCell(eanColIdx).value ? String(row.getCell(eanColIdx).value).trim() : '';
      const sku = row.getCell(skuColIdx).value ? String(row.getCell(skuColIdx).value).trim() : '';
      const desc = row.getCell(descColIdx).value ? String(row.getCell(descColIdx).value).trim() : '';
      const catRaw = row.getCell(catColIdx).value ? String(row.getCell(catColIdx).value).trim().toLowerCase() : '';
      const stockRaw = row.getCell(stockColIdx).value ? Number(row.getCell(stockColIdx).value) : 0;
      const unidad = row.getCell(unidadColIdx).value ? String(row.getCell(unidadColIdx).value).trim() : 'Unidad';

      if (!ean || !desc) continue;

      const categoria = catRaw.includes('insumo') ? 'Insumo' : 'Repuesto';

      await InsumoEconomato.findOneAndUpdate(
        { ean_codigo: ean },
        {
          $set: {
            sku_codigo: sku || `SKU-${ean}`,
            ean_codigo: ean,
            descripcion_articulo: desc,
            categoria,
            unidad_medida: unidad
          },
          $setOnInsert: {
            cantidad_stock: isNaN(stockRaw) ? 0 : stockRaw
          }
        },
        { upsert: true, new: true }
      );
      insumosCount++;
    }
    console.log(`[Sembrado] Sincronizados ${insumosCount} artículos de economato.`);
  } else {
    // Semillas estáticas de contingencia
    const seeded = await InsumoEconomato.insertMany([
      {
        sku_codigo: 'SKU-RM2-5452-0000',
        ean_codigo: 'EAN-1001',
        descripcion_articulo: 'ROLLER MULTI PURPOSE HP MFP M426 (RM2-5452-0000)',
        categoria: 'Repuesto',
        cantidad_stock: 12,
        unidad_medida: 'Unidad'
      },
      {
        sku_codigo: 'SKU-DP109-UGREEN',
        ean_codigo: 'EAN-1002',
        descripcion_articulo: 'ADAPTADOR DE DISPLAYPORT A VGA UGREEN (DP109)',
        categoria: 'Insumo',
        cantidad_stock: 25,
        unidad_medida: 'Unidad'
      }
    ]);
    insumosCount = seeded.length;
    console.log(`[Sembrado Fallback] Registrados ${insumosCount} insumos semilla.`);
  }

  return { activosCount, insumosCount };
};
