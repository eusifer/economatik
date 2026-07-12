import { pgPool } from '../config/db';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  console.log('Iniciando restablecimiento de contraseña para admin...');
  const newPassword = 'admin123';
  
  try {
    const hash = await bcrypt.hash(newPassword, 12);
    const client = await pgPool.connect();
    
    try {
      const res = await client.query(
        "UPDATE usuarios_sistema SET password_hash = $1 WHERE username = 'admin' RETURNING id, username, rol;",
        [hash]
      );
      
      if ((res.rowCount ?? 0) > 0) {
        console.log(`\n✅ Éxito: Contraseña de '${res.rows[0].username}' (Rol: ${res.rows[0].rol}) restablecida a: ${newPassword}`);
      } else {
        console.warn(`\n⚠️ Advertencia: No se encontró al usuario 'admin' en la base de datos.`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al actualizar la contraseña:', error);
  } finally {
    await pgPool.end();
    process.exit(0);
  }
}

resetAdminPassword();
