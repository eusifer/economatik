import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pgPool } from '../config/db';
import { signToken } from '../middleware/auth';
import { logger, getClientIp } from '../utils/logger';

/**
 * Endpoint de Login: Valida credenciales contra PostgreSQL y emite un JWT asimétrico RS256.
 */
export const loginController = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const result = await pgPool.query(
      'SELECT * FROM usuarios_sistema WHERE username = $1 LIMIT 1;',
      [username]
    );

    if (result.rowCount === 0) {
      logger.warn(`Intento de login fallido: Usuario '${username}' no registrado.`, { remote_addr: ip });
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      logger.warn(`Intento de login fallido: Contraseña incorrecta para el usuario '${username}'.`, { remote_addr: ip });
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    // Emitir Token JWT firmado con RSA
    const token = signToken({
      id: user.id,
      username: user.username,
      rol: user.rol,
    });

    logger.info(`Sesión iniciada correctamente por usuario '${username}' (Rol: ${user.rol}).`, { remote_addr: ip });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        rol: user.rol,
      },
    });
  } catch (error: any) {
    logger.error('Error durante el proceso de login:', { error: error.message });
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
