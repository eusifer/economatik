import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Fallbacks seguros de desarrollo si no se definen en el entorno
const AES_KEY_HEX = process.env.AES_KEY || '603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914df1a';
const AES_IV_HEX = process.env.AES_IV || '2b7e151628aed2a6abf7158809cf4f3c';

const key = Buffer.from(AES_KEY_HEX, 'hex');
const iv = Buffer.from(AES_IV_HEX, 'hex');
const algorithm = 'aes-256-cbc';

/**
 * Encripta un string de texto plano usando AES-256-CBC y devuelve un Buffer binario para almacenar en columnas BYTEA.
 */
export const encryptAES = (text: string): Buffer => {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted;
  } catch (error) {
    console.error('Error durante la encriptación AES:', error);
    throw new Error('Fallo crítico al encriptar datos.');
  }
};

/**
 * Desencripta un Buffer binario recuperado de PostgreSQL usando AES-256-CBC y devuelve el string original.
 */
export const decryptAES = (buffer: Buffer): string => {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(buffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error durante la desencriptación AES:', error);
    throw new Error('Fallo crítico al desencriptar datos.');
  }
};
