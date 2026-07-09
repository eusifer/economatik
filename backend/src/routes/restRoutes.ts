import { Router, Request, Response } from 'express';
import { loginController } from '../controllers/authController';
import { downloadReportController } from '../controllers/reportController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { ActivoTIC } from '../models/mongoSchemas';
import { logger } from '../utils/logger';

const router = Router();

// 1. Ruta de Autenticación
router.post('/auth/login', loginController);

// 2. Ruta de Reportes (Con autenticación y jerarquías internas)
router.get('/reports/download', authenticateJWT, downloadReportController);

// 3. Ruta de Carga Masiva de Facturas / Activos (Solo Administrador)
router.post(
  '/assets/bulk-upload',
  authenticateJWT,
  requireRole(['administrador']),
  async (req: Request, res: Response) => {
    const assets = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ message: 'El payload debe ser un arreglo de activos no vacío.' });
    }

    try {
      const processed = [];
      for (const item of assets) {
        const {
          numero_serie,
          tipo_equipo,
          marca,
          modelo,
          ip_asignada,
          nombre_estacion,
          usuario_red_asignado,
          nombre_usuario_final,
          ubicacion_agencia
        } = item;

        if (!numero_serie || !tipo_equipo || !marca || !modelo || !nombre_estacion) {
          logger.warn('Falta campo requerido en item para carga masiva de activos.', { item });
          continue;
        }

        // Upsert en MongoDB CMDB
        const result = await ActivoTIC.findOneAndUpdate(
          { numero_serie },
          {
            numero_serie,
            tipo_equipo,
            marca,
            modelo,
            ip_asignada: ip_asignada || null,
            nombre_estacion,
            usuario_red_asignado: usuario_red_asignado || 'system',
            nombre_usuario_final: nombre_usuario_final || 'Por Asignar',
            fecha_registro_sistema: new Date(),
            ubicacion_agencia
          },
          { upsert: true, new: true }
        );
        processed.push(result);
      }

      logger.info(`Carga masiva completada: ${processed.length} activos procesados en la CMDB.`);
      return res.status(200).json({
        message: 'Carga masiva procesada con éxito.',
        processed_count: processed.length,
      });
    } catch (error: any) {
      logger.error('Error durante la carga masiva de activos:', { error: error.message });
      return res.status(500).json({ message: 'Error interno durante la carga masiva.' });
    }
  }
);

export default router;
