import { pgPool } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const initializePostgreSQL = async () => {
  const client = await pgPool.connect();
  try {
    console.log('Iniciando inicialización de tablas de PostgreSQL...');
    
    // Habilitar extensión pgcrypto para UUIDs si no está habilitada
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 1. Tabla de Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios_sistema (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        nombre_completo VARCHAR(255) NOT NULL DEFAULT 'Usuario del Sistema',
        activo BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // Migración del CHECK constraint de rol para incluir 'invitado'
    await client.query(`
      ALTER TABLE usuarios_sistema DROP CONSTRAINT IF EXISTS usuarios_sistema_rol_check;
      ALTER TABLE usuarios_sistema ADD CONSTRAINT usuarios_sistema_rol_check
        CHECK (rol IN ('administrador', 'tecnico', 'invitado'));
    `);

    // Migración para añadir nuevas columnas a usuarios_sistema si ya existía antes
    await client.query(`
      ALTER TABLE usuarios_sistema ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(255) NOT NULL DEFAULT 'Usuario del Sistema';
    `);
    await client.query(`
      ALTER TABLE usuarios_sistema ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // 2. Secuencia para llave incremental de tickets
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS ticket_key_seq START WITH 1001;
    `);

    // 3. Tabla de Tickets
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(50) UNIQUE NOT NULL DEFAULT ('HD-' || nextval('ticket_key_seq')),
        canal_origen VARCHAR(20) NOT NULL CHECK (canal_origen IN ('Llamada', 'Plataforma')),
        resumen VARCHAR(255) NOT NULL,
        sintoma_descripcion TEXT NOT NULL,
        status VARCHAR(30) NOT NULL CHECK (status IN ('To Do', 'In Progress', 'En Tránsito a Taller', 'Done')),
        prioridad VARCHAR(20) NOT NULL CHECK (prioridad IN ('Baja', 'Media', 'Alta')),
        registro_manual_contingencia BOOLEAN DEFAULT FALSE,
        datos_contingencia_cifrados BYTEA DEFAULT NULL,
        tecnico_id UUID REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
        agencia_id VARCHAR(100) NOT NULL,
        serie_activo VARCHAR(100) DEFAULT NULL,
        usuario_reporta VARCHAR(100) DEFAULT NULL,
        fecha_resolucion TIMESTAMP DEFAULT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ejecutar alteración para agregar columna si no existe (migración segura para producción)
    await client.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usuario_reporta VARCHAR(100) DEFAULT NULL;
    `);
    await client.query(`
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMP DEFAULT NULL;
    `);

    // 4. Tabla de Informes de Baja y Renovación
    await client.query(`
      CREATE TABLE IF NOT EXISTS informes_baja_renovacion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero_informe VARCHAR(50) UNIQUE NOT NULL,
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Baja', 'Renovacion')),
        diagnostico_tecnico TEXT NOT NULL,
        sustento_logistico TEXT NOT NULL,
        administrador_id UUID REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tabla de Registro de Custodia de Repuestos (para control de comisiones y Aging)
    await client.query(`
      CREATE TABLE IF NOT EXISTS custodia_repuestos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tecnico_id UUID NOT NULL REFERENCES usuarios_sistema(id) ON DELETE CASCADE,
        ean_codigo VARCHAR(50) NOT NULL,
        estado VARCHAR(20) NOT NULL CHECK (estado IN ('En Ruta', 'Consumido', 'Devuelto')),
        fecha_retiro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_cierre_comision TIMESTAMP NULL,
        fecha_regularizacion TIMESTAMP NULL,
        comision_activa BOOLEAN DEFAULT TRUE
      );
    `);

    // Migración para añadir campos de equipo y sede de uso a custodia_repuestos
    await client.query(`
      ALTER TABLE custodia_repuestos ADD COLUMN IF NOT EXISTS numero_serie_activo VARCHAR(100) DEFAULT NULL;
    `);
    await client.query(`
      ALTER TABLE custodia_repuestos ADD COLUMN IF NOT EXISTS ubicacion_detalle VARCHAR(100) DEFAULT NULL;
    `);

    // 6. Tabla de Agencias a Cargo de Usuarios (Relación uno-a-muchos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuario_agencias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios_sistema(id) ON DELETE CASCADE,
        agencia_id VARCHAR(100) NOT NULL
      );
    `);

    // Insertar usuarios semilla por defecto si no existen
    const userCount = await client.query('SELECT COUNT(*) FROM usuarios_sistema;');
    if (parseInt(userCount.rows[0].count) === 0) {
      // Las contraseñas se leen desde variables de entorno.
      // Si no están definidas se generan aleatoriamente (fail-safe para primer despliegue).
      // NUNCA se hardcodean en el código fuente.
      const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(16).toString('hex');
      const tecnicoPassword = process.env.SEED_TECNICO_PASSWORD ?? crypto.randomBytes(16).toString('hex');

      const adminHash = await bcrypt.hash(adminPassword, 12);
      const techHash = await bcrypt.hash(tecnicoPassword, 12);

      await client.query(`
        INSERT INTO usuarios_sistema (username, password_hash, rol, nombre_completo) VALUES
        ('admin', $1, 'administrador', 'Administrador Patrimonial'),
        ('tecnico1', $2, 'tecnico', 'Técnico de Campo 1');
      `, [adminHash, techHash]);

      // Las contraseñas generadas se imprimen UNA SOLA VEZ para que el administrador
      // las registre. Después de esto no se loguean de nuevo.
      if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_TECNICO_PASSWORD) {
        console.warn('\n╔══════════════════════════════════════════════════════╗');
        console.warn('║  ⚠️  CREDENCIALES SEMILLA GENERADAS AUTOMÁTICAMENTE  ║');
        console.warn('╠══════════════════════════════════════════════════════╣');
        if (!process.env.SEED_ADMIN_PASSWORD) {
          console.warn(`║  admin     → ${adminPassword.padEnd(38)}║`);
        }
        if (!process.env.SEED_TECNICO_PASSWORD) {
          console.warn(`║  tecnico1  → ${tecnicoPassword.padEnd(38)}║`);
        }
        console.warn('║  Guárdalas en .env y elimina este log de producción. ║');
        console.warn('╚══════════════════════════════════════════════════════╝\n');
      } else {
        console.log('Usuarios semilla insertados con credenciales de entorno.');
      }
    }

    console.log('Inicialización de PostgreSQL finalizada con éxito.');
  } catch (error) {
    console.error('Error al inicializar PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
};
