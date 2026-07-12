import { Response } from 'express';
import { Workbook } from 'exceljs';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger, getClientIp } from '../utils/logger';
import { InsumoEconomato, MovimientoInsumo } from '../models/mongoSchemas';

/**
 * Genera y descarga el reporte de productividad mensual en formato Excel (.xlsx) usando ExcelJS.
 */
export const downloadReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = getClientIp(req);
  const user = req.user;

  if (!user) {
    return void res.status(401).json({ message: 'No autorizado.' });
  }

  try {
    let query = `
      SELECT t.*, u.username as tecnico_username
      FROM tickets t
      LEFT JOIN usuarios_sistema u ON t.tecnico_id = u.id
    `;
    const params: any[] = [];

    // Lógica jerárquica: Los técnicos solo exportan su reporte; los admins descargan todo
    if (user.rol === 'tecnico') {
      params.push(user.id);
      query += ' WHERE t.tecnico_id = $1';
      logger.info(`Técnico '${user.username}' solicitó su reporte mensual.`, { remote_addr: ip });
    } else {
      logger.info(`Administrador '${user.username}' solicitó el consolidado nacional mensual.`, { remote_addr: ip });
    }

    query += ' ORDER BY t.fecha_creacion DESC;';

    const result = await pgPool.query(query, params);

    // Inicializar libro ExcelJS
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Productividad Mensual');

    // Definición de columnas con la separación de NOMBRE y APELLIDOS
    worksheet.columns = [
      { header: 'TICKET KEY', key: 'key', width: 15 },
      { header: 'CANAL ORIGEN', key: 'canal_origen', width: 15 },
      { header: 'RESUMEN', key: 'resumen', width: 30 },
      { header: 'ESTADO', key: 'status', width: 15 },
      { header: 'PRIORIDAD', key: 'prioridad', width: 12 },
      { header: 'TECNICO NOMBRE', key: 'nombre', width: 20 },
      { header: 'TECNICO APELLIDOS', key: 'apellidos', width: 20 },
      { header: 'USUARIO REPORTANTE', key: 'usuario_reporta', width: 25 },
      { header: 'AGENCIA SEDE', key: 'agencia_id', width: 20 },
      { header: 'SERIE ACTIVO', key: 'serie_activo', width: 15 },
      { header: 'FECHA CREACION', key: 'fecha_creacion', width: 22 },
      { header: 'FECHA RESOLUCION', key: 'fecha_resolucion', width: 22 }
    ];

    // Formatear cabecera (Azul Celeste Institucional, Negrita, Texto en Mayúsculas)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CEEB' } // Azul celeste institucional (#87CEEB)
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        color: { argb: 'FF000000' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Agregar filas y forzar valores en MAYÚSCULAS
    result.rows.forEach((row: any) => {
      // Separar nombre y apellidos del username del técnico asignado
      const username = row.tecnico_username || 'SIN ASIGNAR';
      const nameParts = username.trim().split(' ');
      const nombre = nameParts[0].toUpperCase();
      const apellidos = nameParts.slice(1).join(' ').toUpperCase() || 'N/A';

      const rowData = {
        key: String(row.key).toUpperCase(),
        canal_origen: String(row.canal_origen).toUpperCase(),
        resumen: String(row.resumen).toUpperCase(),
        status: String(row.status).toUpperCase(),
        prioridad: String(row.prioridad).toUpperCase(),
        nombre: nombre,
        apellidos: apellidos,
        usuario_reporta: row.usuario_reporta ? String(row.usuario_reporta).toUpperCase() : 'SIN REGISTRAR',
        agencia_id: String(row.agencia_id).toUpperCase(),
        serie_activo: row.serie_activo ? String(row.serie_activo).toUpperCase() : 'N/A',
        fecha_creacion: row.fecha_creacion ? row.fecha_creacion.toISOString().substring(0, 19).replace('T', ' ').toUpperCase() : 'N/A',
        fecha_resolucion: row.fecha_resolucion ? row.fecha_resolucion.toISOString().substring(0, 19).replace('T', ' ').toUpperCase() : 'N/A'
      };

      worksheet.addRow(rowData);
    });

    // Forzar bordes y fuente general a todas las celdas de datos
    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        row.eachCell((cell: any) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
        });
      }
    });

    // Configurar cabeceras de respuesta HTTP para descarga
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_mensual_${user.rol}_${Date.now()}.xlsx`
    );

    // Escribir libro en stream de salida
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    logger.error('Error al generar el reporte Excel mensual:', { error: error.message });
    return void res.status(500).json({ message: 'Error interno al generar reporte.' });
  }
};

/**
 * Genera y descarga el reporte consolidado e historial de uso de economato en formato Excel (.xlsx) usando ExcelJS.
 */
export const downloadEconomatoReportController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ip = getClientIp(req);
  const user = req.user;

  if (!user) {
    return void res.status(401).json({ message: 'No autorizado.' });
  }

  try {
    logger.info(`Usuario '${user.username}' solicitó el reporte mensual consolidado de Economato.`, { remote_addr: ip });

    // Inicializar libro ExcelJS
    const workbook = new Workbook();
    
    // ---------------------------------------------------------
    // HOJA 1: RESUMEN MENSUAL DINÁMICO (Formato pivot de salidas)
    // ---------------------------------------------------------
    const monthlySheet = workbook.addWorksheet('Resumen Mensual Salidas');
    monthlySheet.columns = [
      { header: 'DESCRIPCIÓN DEL SUMINISTRO', key: 'descripcion', width: 35 },
      { header: 'Ene', key: 'm1', width: 8 },
      { header: 'Feb', key: 'm2', width: 8 },
      { header: 'Mar', key: 'm3', width: 8 },
      { header: 'Abr', key: 'm4', width: 8 },
      { header: 'May', key: 'm5', width: 8 },
      { header: 'Jun', key: 'm6', width: 8 },
      { header: 'Jul', key: 'm7', width: 8 },
      { header: 'Ago', key: 'm8', width: 8 },
      { header: 'Set', key: 'm9', width: 8 },
      { header: 'Oct', key: 'm10', width: 8 },
      { header: 'Nov', key: 'm11', width: 8 },
      { header: 'Dic', key: 'm12', width: 8 },
      { header: 'TOTAL SALIDAS', key: 'total_salidas', width: 16 },
      { header: 'TOTAL INGRESOS', key: 'total_ingresos', width: 16 },
      { header: 'STOCK ACTUAL', key: 'stock_actual', width: 16 }
    ];

    // Formatear cabeceras Hoja 1
    const monthlyHeader = monthlySheet.getRow(1);
    monthlyHeader.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Slate-900
      };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const allInsumos = await InsumoEconomato.find({});
    
    // Obtener movimientos del año en curso
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    const yearMovs = await MovimientoInsumo.find({
      fecha_movimiento: { $gte: startOfYear, $lte: endOfYear }
    });

    const statsMap: Record<string, { salidas: number[]; ingresos: number }> = {};
    allInsumos.forEach(ins => {
      statsMap[ins.ean_codigo] = {
        salidas: new Array(12).fill(0),
        ingresos: 0
      };
    });

    yearMovs.forEach((mov: any) => {
      const ean = mov.ean_codigo;
      if (!statsMap[ean]) {
        statsMap[ean] = { salidas: new Array(12).fill(0), ingresos: 0 };
      }
      const date = new Date(mov.fecha_movimiento);
      const month = date.getMonth(); // 0-11
      const cant = Number(mov.cantidad || 0);

      if (mov.tipo_movimiento === 'Consumo' || mov.tipo_movimiento === 'Asignación Técnico') {
        statsMap[ean].salidas[month] += Math.abs(cant);
      } else if (mov.tipo_movimiento === 'Ingreso') {
        statsMap[ean].ingresos += cant;
      } else if (mov.tipo_movimiento === 'Ajuste') {
        if (cant < 0) {
          statsMap[ean].salidas[month] += Math.abs(cant);
        } else {
          statsMap[ean].ingresos += cant;
        }
      }
    });

    allInsumos.forEach((ins: any) => {
      const stats = statsMap[ins.ean_codigo] || { salidas: new Array(12).fill(0), ingresos: 0 };
      const totalSalidas = stats.salidas.reduce((a, b) => a + b, 0);
      
      monthlySheet.addRow({
        descripcion: String(ins.descripcion_articulo || 'N/A').toUpperCase(),
        m1: stats.salidas[0] || null,
        m2: stats.salidas[1] || null,
        m3: stats.salidas[2] || null,
        m4: stats.salidas[3] || null,
        m5: stats.salidas[4] || null,
        m6: stats.salidas[5] || null,
        m7: stats.salidas[6] || null,
        m8: stats.salidas[7] || null,
        m9: stats.salidas[8] || null,
        m10: stats.salidas[9] || null,
        m11: stats.salidas[10] || null,
        m12: stats.salidas[11] || null,
        total_salidas: totalSalidas,
        total_ingresos: stats.ingresos,
        stock_actual: ins.cantidad_stock
      });
    });

    // Formatear celdas de la Hoja 1
    monthlySheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        row.eachCell((cell: any) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });

    // ---------------------------------------------------------
    // HOJA 2: RESUMEN DE STOCK ACTUAL
    // ---------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Resumen de Stock');
    summarySheet.columns = [
      { header: 'EAN CODIGO', key: 'ean_codigo', width: 18 },
      { header: 'SKU CODIGO', key: 'sku_codigo', width: 18 },
      { header: 'DESCRIPCION ARTICULO', key: 'descripcion_articulo', width: 35 },
      { header: 'CATEGORIA', key: 'categoria', width: 15 },
      { header: 'STOCK ACTUAL', key: 'cantidad_stock', width: 15 },
      { header: 'ESTADO DE COMPRA', key: 'estado_compra', width: 25 }
    ];

    const summaryHeader = summarySheet.getRow(1);
    summaryHeader.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CEEB' }
      };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    allInsumos.forEach((ins: any) => {
      const stock = ins.cantidad_stock || 0;
      const estadoCompra = stock === 0 ? 'SOLICITAR COMPRA URGENTE' : (stock <= 3 ? 'STOCK MINIMO - RECOMPRAR' : 'STOCK CONVENIENTE');
      summarySheet.addRow({
        ean_codigo: String(ins.ean_codigo || 'N/A').toUpperCase(),
        sku_codigo: String(ins.sku_codigo || 'N/A').toUpperCase(),
        descripcion_articulo: String(ins.descripcion_articulo || 'N/A').toUpperCase(),
        categoria: String(ins.categoria || 'N/A').toUpperCase(),
        cantidad_stock: stock,
        estado_compra: estadoCompra.toUpperCase()
      });
    });

    summarySheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        row.eachCell((cell: any) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
        });
      }
    });

    // ---------------------------------------------------------
    // HOJA 3: HISTORIAL DETALLADO DE MOVIMIENTOS (KARDEX)
    // ---------------------------------------------------------
    const movementSheet = workbook.addWorksheet('Kardex de Movimientos');
    movementSheet.columns = [
      { header: 'FECHA MOVIMIENTO', key: 'fecha_movimiento', width: 22 },
      { header: 'EAN', key: 'ean_codigo', width: 15 },
      { header: 'SKU', key: 'sku_codigo', width: 15 },
      { header: 'DESCRIPCION', key: 'descripcion_articulo', width: 30 },
      { header: 'TIPO MOVIMIENTO', key: 'tipo_movimiento', width: 20 },
      { header: 'CANTIDAD', key: 'cantidad', width: 12 },
      { header: 'STOCK ANTERIOR', key: 'stock_anterior', width: 15 },
      { header: 'STOCK NUEVO', key: 'stock_nuevo', width: 15 },
      { header: 'USUARIO RESPONSABLE', key: 'usuario_responsable', width: 22 },
      { header: 'TECNICO ASIGNADO', key: 'tecnico_asignado', width: 22 },
      { header: 'SERIE EQUIPO', key: 'numero_serie_activo', width: 15 },
      { header: 'AGENCIA DESTINO', key: 'ubicacion_agencia', width: 20 },
      { header: 'OBSERVACIONES', key: 'observacion', width: 35 }
    ];

    // Formatear cabeceras Hoja 3
    const movementHeader = movementSheet.getRow(1);
    movementHeader.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF87CEEB' }
      };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const movimientos = await MovimientoInsumo.find({}).sort({ fecha_movimiento: -1 });
    movimientos.forEach((mov: any) => {
      movementSheet.addRow({
        fecha_movimiento: mov.fecha_movimiento ? mov.fecha_movimiento.toISOString().substring(0, 19).replace('T', ' ').toUpperCase() : 'N/A',
        ean_codigo: String(mov.ean_codigo || 'N/A').toUpperCase(),
        sku_codigo: String(mov.sku_codigo || 'N/A').toUpperCase(),
        descripcion_articulo: String(mov.descripcion_articulo || 'N/A').toUpperCase(),
        tipo_movimiento: String(mov.tipo_movimiento || 'N/A').toUpperCase(),
        cantidad: mov.cantidad,
        stock_anterior: mov.stock_anterior,
        stock_nuevo: mov.stock_nuevo,
        usuario_responsable: String(mov.usuario_responsable || 'N/A').toUpperCase(),
        tecnico_asignado: mov.tecnico_asignado ? String(mov.tecnico_asignado).toUpperCase() : 'N/A',
        numero_serie_activo: mov.numero_serie_activo ? String(mov.numero_serie_activo).toUpperCase() : 'N/A',
        ubicacion_agencia: mov.ubicacion_agencia ? String(mov.ubicacion_agencia).toUpperCase() : 'N/A',
        observacion: mov.observacion ? String(mov.observacion).toUpperCase() : 'N/A'
      });
    });

    // Forzar fuente a Hoja 3
    movementSheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber > 1) {
        row.eachCell((cell: any) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
        });
      }
    });

    // Configurar cabeceras de respuesta HTTP para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_economato_${Date.now()}.xlsx`);

    // Escribir libro en stream de salida
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    logger.error('Error al generar el reporte Excel de Economato:', { error: error.message });
    return void res.status(500).json({ message: 'Error interno al generar reporte.' });
  }
};
