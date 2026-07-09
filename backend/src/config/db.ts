import { Pool } from 'pg';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ActivoTIC, InsumoEconomato } from '../models/mongoSchemas';

dotenv.config();

// Configuración de PostgreSQL
export const pgPool = new Pool({
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

    // Sembrado automático de activos TIC e insumos del Economato
    const activoCount = await ActivoTIC.countDocuments();
    if (activoCount === 0) {
      await ActivoTIC.insertMany([
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
      console.log('Colección activos_tic sembrada en MongoDB.');
    }

    const insumoCount = await InsumoEconomato.countDocuments();
    if (insumoCount === 0) {
      await InsumoEconomato.insertMany([
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
        },
        {
          sku_codigo: 'SKU-ALC-ISOPR',
          ean_codigo: 'EAN-1003',
          descripcion_articulo: 'ALCOHOL ISOPROPILICO BURGA MORENO (BM)',
          categoria: 'Insumo',
          cantidad_stock: 8,
          unidad_medida: 'Litro'
        },
        {
          sku_codigo: 'SKU-RL2-0656',
          ean_codigo: 'EAN-1004',
          descripcion_articulo: 'ROLLER PAPER PICKUP ASSEMBLY HP MFP 426 (RL2-0656)',
          categoria: 'Repuesto',
          cantidad_stock: 15,
          unidad_medida: 'Unidad'
        }
      ]);
      console.log('Colección insumos_economato sembrada en MongoDB.');
    }

    return mongoose;
  } catch (error) {
    console.error('Error de conexión en MongoDB:', error);
    throw error;
  }
};
