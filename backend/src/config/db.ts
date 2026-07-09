import { Pool } from 'pg';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
    return mongoose;
  } catch (error) {
    console.error('Error de conexión en MongoDB:', error);
    throw error;
  }
};
