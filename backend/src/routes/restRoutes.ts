import { Router, Request, Response } from 'express';
import { loginController } from '../controllers/authController';
import { downloadReportController, downloadEconomatoReportController } from '../controllers/reportController';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { ActivoTIC, InsumoEconomato, MovimientoActivo, MovimientoInsumo } from '../models/mongoSchemas';
import { logger } from '../utils/logger';

const router = Router();

// 1. Ruta de Autenticación
router.post('/auth/login', loginController);

// 2. Ruta de Reportes (Con autenticación y jerarquías internas)
router.get('/reports/download', authenticateJWT, downloadReportController);
router.get('/reports/economato', authenticateJWT, downloadEconomatoReportController);

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
            factura_referencia,
            factura_adjunto_b64,
            factura_adjunto_mime,
            fecha_compra
          } = item;

          if (!numero_serie || !tipo_equipo || !marca || !modelo || !nombre_estacion) {
            logger.warn('Falta campo requerido en item para carga masiva de activo equipo.', { item });
            continue;
          }

          // Consultar si ya existe el activo en MongoDB CMDB para saber si es ingreso inicial o transferencia
          const exist = await ActivoTIC.findOne({ numero_serie });
          const isNew = !exist;

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
              fecha_registro_sistema: exist ? exist.fecha_registro_sistema : new Date(),
              ubicacion_agencia: ubicacion_agencia || 'Sede Central',
              factura_referencia: factura_referencia || null,
              factura_adjunto_b64: factura_adjunto_b64 || null,
              factura_adjunto_mime: factura_adjunto_mime || null,
              fecha_compra: fecha_compra ? new Date(fecha_compra) : (exist && exist.fecha_compra ? exist.fecha_compra : new Date())
            },
            { upsert: true, new: true }
          );

          // Asentar en Kardex de Activos (MovimientoActivo)
          if (isNew) {
            await MovimientoActivo.create({
              numero_serie,
              tipo_movimiento: 'Ingreso',
              agencia_origen: null,
              agencia_destino: ubicacion_agencia || 'Sede Central',
              usuario_responsable: nombre_usuario_final || 'Por Asignar',
              factura_referencia: factura_referencia || null,
              motivo_detalle: 'Ingreso de compra inicial de lote de hardware'
            });
          } else if (exist.ubicacion_agencia !== (ubicacion_agencia || 'Sede Central')) {
            await MovimientoActivo.create({
              numero_serie,
              tipo_movimiento: 'Transferencia',
              agencia_origen: exist.ubicacion_agencia,
              agencia_destino: ubicacion_agencia || 'Sede Central',
              usuario_responsable: nombre_usuario_final || 'Por Asignar',
              factura_referencia: factura_referencia || null,
              motivo_detalle: 'Transferencia y asignación de equipo a nueva Sede'
            });
          }

          processed.push({ id: result.id, tipo: 'equipo', serie: numero_serie });
        } else if (item.tipo_registro === 'insumo' || item.tipo_registro === 'repuesto') {
          const {
            ean_codigo,
            sku_codigo,
            descripcion_articulo,
            categoria,
            cantidad_stock,
            unidad_medida,
            factura_referencia,
            factura_adjunto_b64,
            factura_adjunto_mime
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
                factura_referencia: factura_referencia || null,
                factura_adjunto_b64: factura_adjunto_b64 || null,
                factura_adjunto_mime: factura_adjunto_mime || null
              },
              $inc: {
                cantidad_stock: Number(cantidad_stock || 1)
              }
            },
            { upsert: true, new: true }
          );
          processed.push({ id: result.id, tipo: 'insumo', ean: ean_codigo, stock_actual: result.cantidad_stock });
        } else if (item.tipo_registro === 'economato') {
          const {
            codigo,
            descripcion,
            cantidad,
            fecha_registro,
            usuario_registro
          } = item;

          if (!descripcion) {
            logger.warn('Falta campo requerido descripcion en item para carga de economato.', { item });
            continue;
          }

          // Autogenerar código si no viene
          const finalEan = codigo ? String(codigo).trim() : `EAN-${Math.floor(100000 + Math.random() * 900000)}`;
          const finalSku = codigo ? String(codigo).trim() : `SKU-${finalEan}`;

          // Determinar categoría por descripción
          const descLower = descripcion.toLowerCase();
          const categoria = (descLower.includes('toner') || descLower.includes('tinta') || descLower.includes('cinta') || descLower.includes('alcohol') || descLower.includes('limpia')) 
            ? 'Insumo' 
            : 'Repuesto';

          const cantNum = Number(cantidad || 0);

          // Upsert en MongoDB
          const result = await InsumoEconomato.findOneAndUpdate(
            { ean_codigo: finalEan },
            {
              $set: {
                sku_codigo: finalSku,
                ean_codigo: finalEan,
                descripcion_articulo: descripcion,
                categoria,
                unidad_medida: 'Unidad',
                factura_referencia: 'CARGA_INICIAL'
              },
              $inc: {
                cantidad_stock: cantNum
              }
            },
            { upsert: true, new: true }
          );

          // Asentar en Kardex (MovimientoInsumo)
          await MovimientoInsumo.create({
            sku_codigo: result.sku_codigo,
            ean_codigo: result.ean_codigo,
            descripcion_articulo: result.descripcion_articulo,
            tipo_movimiento: 'Ingreso',
            cantidad: cantNum,
            stock_anterior: result.cantidad_stock - cantNum,
            stock_nuevo: result.cantidad_stock,
            usuario_responsable: usuario_registro || 'admin',
            observacion: 'Carga Masiva - Registro Inicial de Stock',
            fecha_movimiento: fecha_registro ? new Date(fecha_registro) : new Date()
          });

          processed.push({ id: result.id, tipo: 'insumo', ean: finalEan, stock_actual: result.cantidad_stock });
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

// 4. Ruta de Descarga de Kardex Consolidado (Solo Administrador)
router.get(
  '/reports/kardex',
  authenticateJWT,
  requireRole(['administrador']),
  async (_req: Request, res: Response) => {
    try {
      const { Workbook } = require('exceljs');
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Kardex de Activos TIC');

      worksheet.columns = [
        { header: 'NUMERO SERIE', key: 'numero_serie', width: 15 },
        { header: 'TIPO EQUIPO', key: 'tipo_equipo', width: 15 },
        { header: 'MARCA - MODELO', key: 'marca_modelo', width: 25 },
        { header: 'AGENCIA ACTUAL', key: 'agencia_actual', width: 20 },
        { header: 'FECHA COMPRA', key: 'fecha_compra', width: 15 },
        { header: 'FACTURA REFERENCIA', key: 'factura_referencia', width: 20 },
        { header: 'HISTORIAL DE MOVIMIENTOS', key: 'historial_movimientos', width: 65 }
      ];

      // Formatear cabecera (Azul Celeste Institucional)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: import('exceljs').Cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF87CEEB' }
        };
        cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const activos = await ActivoTIC.find({});
      for (const a of activos) {
        const movimientos = await MovimientoActivo.find({ numero_serie: a.numero_serie }).sort({ fecha_movimiento: 1 });
        
        const transicion = movimientos.map(m => {
          const fechaStr = m.fecha_movimiento.toISOString().substring(0, 10);
          return `[${fechaStr}] ${m.tipo_movimiento}: ${m.agencia_origen || 'N/A'} -> ${m.agencia_destino} (${m.usuario_responsable})`;
        }).join(' | ');

        worksheet.addRow({
          numero_serie: a.numero_serie.toUpperCase(),
          tipo_equipo: a.tipo_equipo.toUpperCase(),
          marca_modelo: `${a.marca} - ${a.modelo}`.toUpperCase(),
          agencia_actual: a.ubicacion_agencia.toUpperCase(),
          fecha_compra: a.fecha_compra ? a.fecha_compra.toISOString().substring(0, 10) : 'SIN FECHA',
          factura_referencia: a.factura_referencia ? a.factura_referencia.toUpperCase() : 'SIN FACTURA',
          historial_movimientos: transicion
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=kardex_consolidado_activos.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      logger.error('Error al exportar reporte de Kardex:', { error: err.message });
      res.status(500).json({ message: 'Error al exportar reporte de Kardex.' });
    }
  }
);

export default router;
