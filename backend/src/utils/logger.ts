import winston from 'winston';
import path from 'path';

// Directorio de logs
const logDir = 'logs';

// Formato personalizado para la consola
const consoleFormat = winston.format.printf(({ timestamp, level, message, remote_addr, ...metadata }) => {
  const ipInfo = remote_addr ? ` [Remote IP: ${remote_addr}]` : ' [Internal]';
  const metaInfo = Object.keys(metadata).length ? ` | Meta: ${JSON.stringify(metadata)}` : '';
  return `${timestamp} [${level}]${ipInfo}: ${message}${metaInfo}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'remote_addr'] }),
    winston.format.json()
  ),
  transports: [
    // Consola coloreada
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // Archivo de auditoría general
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
    })
  ]
});

// Helper para capturar IP en Express y pasarlo a Winston
export const getClientIp = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
  return ip || '127.0.0.1';
};
