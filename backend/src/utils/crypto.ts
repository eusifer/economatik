import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────────────────────────────────────────────────────────
// FAIL-FAST: La clave AES DEBE estar definida como variable de entorno.
// No se permiten valores por defecto — si la variable no existe el servidor
// no arranca, protegiendo datos en reposo desde el inicio.
// ──────────────────────────────────────────────────────────────────────────────
const AES_KEY_HEX = process.env.AES_KEY;

if (!AES_KEY_HEX) {
  throw new Error(
    '[CRYPTO] FATAL: La variable de entorno AES_KEY no está definida. ' +
    'El servidor no puede arrancar sin una clave AES-256 configurada. ' +
    'Consulte .env.example para instrucciones de configuración.'
  );
}

if (AES_KEY_HEX.length !== 64) {
  throw new Error(
    `[CRYPTO] FATAL: AES_KEY debe ser exactamente 64 caracteres hexadecimales (256 bits). ` +
    `Longitud actual: ${AES_KEY_HEX.length} caracteres.`
  );
}

const key = Buffer.from(AES_KEY_HEX, 'hex');
const algorithm = 'aes-256-cbc';

/**
 * Encripta un string de texto plano usando AES-256-CBC con IV aleatorio por mensaje.
 * El IV (16 bytes) se prepende al Buffer cifrado para permitir la desencriptación posterior.
 * Formato del resultado: [IV (16 bytes)] + [Ciphertext]
 */
export const encryptAES = (text: string): Buffer => {
  try {
    // IV aleatorio generado en cada llamada — previene ataques de análisis de patrones
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Prepender IV al ciphertext para que decryptAES pueda extraerlo
    return Buffer.concat([iv, encrypted]);
  } catch (error) {
    console.error('Error durante la encriptación AES:', error);
    throw new Error('Fallo crítico al encriptar datos.');
  }
};

/**
 * Desencripta un Buffer recuperado de PostgreSQL (columna BYTEA).
 * Extrae el IV de los primeros 16 bytes y usa el resto como ciphertext.
 * Formato esperado del input: [IV (16 bytes)] + [Ciphertext]
 */
export const decryptAES = (buffer: Buffer): string => {
  try {
    if (buffer.length < 17) {
      throw new Error('Buffer demasiado corto para contener IV + ciphertext.');
    }
    // Extraer el IV de los primeros 16 bytes
    const iv = buffer.subarray(0, 16);
    const ciphertext = buffer.subarray(16);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error durante la desencriptación AES:', error);
    throw new Error('Fallo crítico al desencriptar datos.');
  }
};
