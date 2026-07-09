import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redisClient: Redis;

try {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    console.log('Cliente Redis conectado exitosamente.');
  });

  redisClient.on('error', (err) => {
    console.error('Error de conexión en Redis:', err.message);
  });
} catch (error) {
  console.error('No se pudo inicializar el cliente Redis:', error);
  // Crear un cliente mock en caso de fallo crítico en entornos de prueba
  redisClient = new Redis({ lazyConnect: true });
}

export default redisClient;
