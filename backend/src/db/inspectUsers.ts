import { pgPool } from '../config/db';
import bcrypt from 'bcryptjs';

async function inspectUsers() {
  console.log('--- INSPECCIÓN DE USUARIOS EN POSTGRESQL ---');
  const client = await pgPool.connect();
  try {
    const res = await client.query('SELECT id, username, rol, nombre_completo, activo, password_hash FROM usuarios_sistema;');
    console.log(`Total usuarios encontrados: ${res.rowCount}`);
    for (const row of res.rows) {
      console.log(`- ID: ${row.id}`);
      console.log(`  Usuario: '${row.username}'`);
      console.log(`  Rol: '${row.rol}'`);
      console.log(`  Nombre: '${row.nombre_completo}'`);
      console.log(`  Activo: ${row.activo}`);
      
      // Probar si coincide con 'admin123', 'tecnico123' o 'Keiko@2026'
      const isAdmin123 = await bcrypt.compare('admin123', row.password_hash);
      const isTecnico123 = await bcrypt.compare('tecnico123', row.password_hash);
      const isKeiko2026 = await bcrypt.compare('Keiko@2026', row.password_hash);
      
      console.log(`  Coincide con 'admin123': ${isAdmin123}`);
      console.log(`  Coincide con 'tecnico123': ${isTecnico123}`);
      console.log(`  Coincide con 'Keiko@2026': ${isKeiko2026}`);
      console.log('--------------------------------------------');
    }
  } catch (err: any) {
    console.error('Error al consultar usuarios:', err.message);
  } finally {
    client.release();
    await pgPool.end();
    process.exit(0);
  }
}

inspectUsers();
