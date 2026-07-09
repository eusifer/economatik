import { Response } from 'express';
import { Workbook } from 'exceljs';
import { pgPool } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger, getClientIp } from '../utils/logger';

/**
 * Genera y descarga el reporte de productividad mensual en formato Excel (.xlsx) usando ExcelJS.
 */
export const downloadReportController = async (req: AuthenticatedRequest, res: Response) => {
  const ip = getClientIp(req);
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'No autorizado.' });
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
    headerRow.eachCell((cell) => {
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
    result.rows.forEach((row) => {
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
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
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
    return res.status(500).json({ message: 'Error interno al generar reporte.' });
  }
};
