import { Router, Request, Response } from 'express';
import { loginController } from '../controllers/authController';
import { downloadReportController } from '../controllers/reportController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { ActivoTIC, InsumoEconomato } from '../models/mongoSchemas';
import { logger } from '../utils/logger';

const router = Router();

// 1. Ruta de Autenticación
router.post('/auth/login', loginController);

// 2. Ruta de Reportes (Con autenticación y jerarquías internas)
router.get('/reports/download', authenticateJWT, downloadReportController);

// 3. Ruta de Carga Masiva y Registro Unificado de Facturas/Inventario (Solo Administrador)
router.post(
  '/assets/bulk-upload',
  authenticateJWT,
  requireRole(['administrador']),
  async (req: Request, res: Response) => {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'El payload debe ser un arreglo de elementos de inventario no vacío.' });
    }

    try {
      const processed = [];
      for (const item of items) {
        if (item.tipo_registro === 'equipo') {
          const {
            numero_serie,
            tipo_equipo,
            marca,
            modelo,
            ip_asignada,
            nombre_estacion,
            usuario_red_asignado,
            nombre_usuario_final,
            ubicacion_agencia,
            factura_referencia
          } = item;

          if (!numero_serie || !tipo_equipo || !marca || !modelo || !nombre_estacion) {
            logger.warn('Falta campo requerido en item para carga masiva de activo equipo.', { item });
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
              ubicacion_agencia: ubicacion_agencia || 'Sede Central',
              factura_referencia: factura_referencia || null
            },
            { upsert: true, new: true }
          );
          processed.push({ id: result.id, tipo: 'equipo', serie: numero_serie });
        } else if (item.tipo_registro === 'insumo' || item.tipo_registro === 'repuesto') {
          const {
            ean_codigo,
            sku_codigo,
            descripcion_articulo,
            categoria,
            cantidad_stock,
            unidad_medida,
            factura_referencia
          } = item;

          if (!ean_codigo || !descripcion_articulo || !categoria) {
            logger.warn('Falta campo requerido en item para carga de insumo/repuesto.', { item });
            continue;
          }

          // Incrementar stock en MongoDB de forma unificada en base a EAN
          const result = await InsumoEconomato.findOneAndUpdate(
            { ean_codigo },
            {
              $set: {
                sku_codigo: sku_codigo || `SKU-${ean_codigo}`,
                ean_codigo,
                descripcion_articulo,
                categoria: categoria === 'Insumo' ? 'Insumo' : 'Repuesto',
                unidad_medida: unidad_medida || 'Unidad',
                factura_referencia: factura_referencia || null
              },
              $inc: {
                cantidad_stock: Number(cantidad_stock || 1)
              }
            },
            { upsert: true, new: true }
          );
          processed.push({ id: result.id, tipo: 'insumo', ean: ean_codigo, stock_actual: result.cantidad_stock });
        } else {
          logger.warn('Tipo de registro no identificado en carga de inventario.', { item });
        }
      }

      logger.info(`Carga de inventario completada: ${processed.length} elementos procesados en MongoDB.`);
      return res.status(200).json({
        message: 'Lote de inventario procesado con éxito.',
        processed_count: processed.length,
      });
    } catch (error: any) {
      logger.error('Error durante la carga masiva de inventario:', { error: error.message });
      return res.status(500).json({ message: 'Error interno durante la carga de inventario.' });
    }
  }
);

export default router;
