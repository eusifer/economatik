import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger, getClientIp } from '../utils/logger';

dotenv.config();

let privateKeyPem: string;
let publicKeyPem: string;

// Inicialización de las llaves asimétricas RSA
if (process.env.JWT_PRIVATE_KEY_B64 && process.env.JWT_PUBLIC_KEY_B64) {
  try {
    privateKeyPem = Buffer.from(process.env.JWT_PRIVATE_KEY_B64, 'base64').toString('utf8');
    publicKeyPem = Buffer.from(process.env.JWT_PUBLIC_KEY_B64, 'base64').toString('utf8');
    logger.info('Llaves RSA cargadas desde variables de entorno.');
  } catch (err) {
    logger.error('Error al decodificar llaves RSA de las variables de entorno, generando llaves de respaldo...', err);
    generateBackupKeys();
  }
} else {
  generateBackupKeys();
}

function generateBackupKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  privateKeyPem = privateKey;
  publicKeyPem = publicKey;
  logger.info('Llaves RSA temporales autogeneradas exitosamente.');
}

// Estructura de datos del token JWT
export interface AuthUser {
  id: string;
  username: string;
  rol: 'administrador' | 'tecnico';
}

// Extender la interfaz de Request para Express
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Firma un token de autenticación utilizando la llave RSA privada.
 */
export const signToken = (payload: AuthUser): string => {
  return jwt.sign(payload, privateKeyPem, {
    algorithm: 'RS256',
    expiresIn: '24h',
  });
};

/**
 * Verifica y decodifica un token utilizando la llave RSA pública.
 */
export const verifyToken = (token: string): AuthUser => {
  return jwt.verify(token, publicKeyPem, {
    algorithms: ['RS256'],
  }) as AuthUser;
};

/**
 * Middleware para validar el token JWT y adjuntar el usuario autenticado al Request.
 */
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const ip = getClientIp(req);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Intento de acceso sin cabecera de autenticación válida.', { remote_addr: ip });
    return void res.status(401).json({ message: 'Acceso no autorizado: Token faltante' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.error('Fallo en la validación del token JWT.', { remote_addr: ip, error: error.message });
    return void res.status(401).json({ message: 'Acceso no autorizado: Token inválido o expirado' });
  }
};

/**
 * Middleware RBAC para validar que el usuario tenga un rol autorizado.
 */
export const requireRole = (allowedRoles: ('administrador' | 'tecnico')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    
    if (!req.user) {
      logger.warn('Acceso denegado: Middleware de roles invocado antes de la autenticación.', { remote_addr: ip });
      return void res.status(401).json({ message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      logger.warn(`Acceso prohibido: Usuario ${req.user.username} con rol ${req.user.rol} intentó acceder a recurso restringido.`, {
        remote_addr: ip,
        required_roles: allowedRoles,
      });
      return void res.status(403).json({ message: 'Acceso denegado: Permisos insuficientes' });
    }

    next();
  };
};
