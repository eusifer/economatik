import { pgPool } from '../config/db';
import bcrypt from 'bcryptjs';

async function resetAllUsers() {
  console.log('--- FORZANDO RESTABLECIMIENTO COMPLETO DE CREDENCIALES ---');
  
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // 1. Limpiar o asegurar que existan los roles correctos en la tabla
    const adminHash = await bcrypt.hash('admin123', 12);
    const techHash = await bcrypt.hash('tecnico123', 12);

    // Eliminar si existen para evitar conflictos de llave única y recrear
    await client.query("DELETE FROM usuarios_sistema WHERE username IN ('admin', 'tecnico1');");

    // Insertar limpios
    await client.query(`
      INSERT INTO usuarios_sistema (username, password_hash, rol, nombre_completo, activo) VALUES
      ('admin', $1, 'administrador', 'Administrador Patrimonial', true),
      ('tecnico1', $2, 'tecnico', 'Técnico de Campo 1', true);
    `, [adminHash, techHash]);

    await client.query('COMMIT');
    console.log('\n✅ ÉXITO: Credenciales restablecidas y sembradas en PostgreSQL:');
    console.log('👉 Usuario: admin      | Contraseña: admin123');
    console.log('👉 Usuario: tecnico1   | Contraseña: tecnico123');
    console.log('---------------------------------------------------------');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante el restablecimiento:', error);
  } finally {
    client.release();
    await pgPool.end();
    process.exit(0);
  }
}

resetAllUsers();
