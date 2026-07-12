import { pgPool, ejecutarSembradoManual } from '../config/db';
import redisClient from '../config/redis';
import { ActivoTIC, InsumoEconomato, MovimientoActivo, MovimientoInsumo } from '../models/mongoSchemas';
import { encryptAES, decryptAES } from '../utils/crypto';
import { logger } from '../utils/logger';
import { AuthUser } from '../middleware/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface Context {
  user?: AuthUser;
  remoteIp?: string;
}

export const resolvers = {
  Query: {
    me: (_parent: any, _args: any, context: Context) => {
      return context.user || null;
    },

    searchActivo: async (_parent: any, { query }: { query: string }, _context: Context) => {
      if (query.length < 3) return null;

      const redisKey = `autocomplete:activo:${query.toLowerCase()}`;
      try {
        // 1. Consultar en Redis Cache
        const cached = await redisClient.get(redisKey);
        if (cached) {
          logger.info(`Búsqueda de activo cacheada (Redis HIT): ${query}`);
          return JSON.parse(cached);
        }

        // 2. Consultar en MongoDB
        const activo = await ActivoTIC.findOne({
          $or: [
            { numero_serie: { $regex: query, $options: 'i' } },
            { ip_asignada: { $regex: query, $options: 'i' } },
          ],
        });

        if (activo) {
          // Guardar en Redis con TTL de 60 segundos
          await redisClient.setex(redisKey, 60, JSON.stringify(activo));
          logger.info(`Búsqueda de activo en DB (Redis MISS, Cacheado): ${query}`);
          return activo;
        }
      } catch (err: any) {
        logger.error('Error al buscar activo:', { error: err.message });
      }
      return null;
    },

    checkHistorialActivo: async (_parent: any, { serie }: { serie: string }) => {
      try {
        const result = await pgPool.query(
          'SELECT COUNT(*) FROM tickets WHERE serie_activo = $1;',
          [serie]
        );
        const count = parseInt(result.rows[0].count);
        return count >= 3;
      } catch (err: any) {
        logger.error('Error en checkHistorialActivo:', { error: err.message });
        return false;
      }
    },

    countTicketsActivo: async (_parent: any, { serie }: { serie: string }) => {
      try {
        const result = await pgPool.query(
          'SELECT COUNT(*) FROM tickets WHERE serie_activo = $1;',
          [serie]
        );
        return parseInt(result.rows[0].count);
      } catch (err: any) {
        logger.error('Error en countTicketsActivo:', { error: err.message });
        return 0;
      }
    },

    getHistorialActivo: async (_parent: any, { serie }: { serie: string }) => {
      try {
        const result = await pgPool.query(`
          SELECT t.*, u.username as tecnico_username
          FROM tickets t
          LEFT JOIN usuarios_sistema u ON t.tecnico_id = u.id
          WHERE t.serie_activo = $1
          ORDER BY t.fecha_creacion DESC;
        `, [serie]);

        return result.rows.map(row => ({
          ...row,
          datos_contingencia_cifrados: row.datos_contingencia_cifrados 
            ? decryptAES(row.datos_contingencia_cifrados) 
            : null,
          fecha_creacion: row.fecha_creacion.toISOString(),
          fecha_resolucion: row.fecha_resolucion ? row.fecha_resolucion.toISOString() : null,
        }));
      } catch (err: any) {
        logger.error('Error en getHistorialActivo:', { error: err.message });
        return [];
      }
    },

    listTickets: async (_parent: any, { status, tecnicoId }: { status?: string; tecnicoId?: string }) => {
      try {
        let query = `
          SELECT t.*, u.username as tecnico_username
          FROM tickets t
          LEFT JOIN usuarios_sistema u ON t.tecnico_id = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
          params.push(status);
          query += ` AND t.status = $${params.length}`;
        }

        if (tecnicoId) {
          params.push(tecnicoId);
          query += ` AND t.tecnico_id = $${params.length}`;
        }

        query += ' ORDER BY t.fecha_creacion DESC;';

        const result = await pgPool.query(query, params);
        return result.rows.map(row => ({
          ...row,
          datos_contingencia_cifrados: row.datos_contingencia_cifrados 
            ? decryptAES(row.datos_contingencia_cifrados) 
            : null,
          fecha_creacion: row.fecha_creacion.toISOString(),
          fecha_resolucion: row.fecha_resolucion ? row.fecha_resolucion.toISOString() : null,
        }));
      } catch (err: any) {
        logger.error('Error al listar tickets:', { error: err.message });
        return [];
      }
    },

    listCustodia: async (_parent: any, { tecnicoId }: { tecnicoId?: string }) => {
      try {
        let query = `
          SELECT c.*, u.username as tecnico_username
          FROM custodia_repuestos c
          LEFT JOIN usuarios_sistema u ON c.tecnico_id = u.id
        `;
        const params: any[] = [];
        if (tecnicoId) {
          params.push(tecnicoId);
          query += ' WHERE c.tecnico_id = $1';
        }
        query += ' ORDER BY c.fecha_retiro DESC;';
        
        const result = await pgPool.query(query, params);

        // Mapear con descripción de repuesto desde Mongo
        const eanList = result.rows.map(r => r.ean_codigo);
        const insumos = await InsumoEconomato.find({ ean_codigo: { $in: eanList } });
        const insumoMap = new Map(insumos.map(i => [i.ean_codigo, i.descripcion_articulo]));

        return result.rows.map(row => ({
          ...row,
          descripcion_articulo: insumoMap.get(row.ean_codigo) || 'Repuesto Desconocido',
          fecha_retiro: row.fecha_retiro.toISOString(),
          fecha_cierre_comision: row.fecha_cierre_comision ? row.fecha_cierre_comision.toISOString() : null,
          fecha_regularizacion: row.fecha_regularizacion ? row.fecha_regularizacion.toISOString() : null,
          numero_serie_activo: row.numero_serie_activo || null,
          ubicacion_detalle: row.ubicacion_detalle || null,
        }));
      } catch (err: any) {
        logger.error('Error al listar custodia:', { error: err.message });
        return [];
      }
    },

    checkAgingLogistico: async (_parent: any, { tecnicoId }: { tecnicoId: string }) => {
      try {
        // Buscar si el técnico tiene repuestos 'En Ruta' y la comisión cerró hace más de 48 horas
        const result = await pgPool.query(`
          SELECT COUNT(*) 
          FROM custodia_repuestos 
          WHERE tecnico_id = $1 
            AND estado = 'En Ruta' 
            AND comision_activa = false 
            AND fecha_cierre_comision < NOW() - INTERVAL '48 hours';
        `, [tecnicoId]);
        
        return parseInt(result.rows[0].count) > 0;
      } catch (err: any) {
        logger.error('Error en checkAgingLogistico:', { error: err.message });
        return false;
      }
    },

    listInsumos: async () => {
      return InsumoEconomato.find({});
    },

    listActivosCMDB: async () => {
      return ActivoTIC.find({});
    },

    getKardexActivo: async (_parent: any, { serie }: { serie: string }) => {
      try {
        const result = await MovimientoActivo.find({ numero_serie: serie }).sort({ fecha_movimiento: 1 });
        return result.map(m => ({
          ...m.toObject(),
          id: m._id.toString(),
          fecha_movimiento: m.fecha_movimiento.toISOString(),
        }));
      } catch (err: any) {
        logger.error('Error en getKardexActivo:', { error: err.message });
        return [];
      }
    },

    listUsers: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador puede ver la lista de usuarios.');
      }
      try {
        const result = await pgPool.query(
          'SELECT id, username, rol, nombre_completo, activo FROM usuarios_sistema ORDER BY username ASC;'
        );
        const users = [];
        for (const row of result.rows) {
          const agenciesRes = await pgPool.query(
            'SELECT agencia_id FROM usuario_agencias WHERE usuario_id = $1;',
            [row.id]
          );
          const agencias = agenciesRes.rows.map((r: any) => r.agencia_id);
          users.push({
            id: row.id,
            username: row.username,
            rol: row.rol,
            nombre_completo: row.nombre_completo,
            activo: row.activo,
            agencias
          });
        }
        return users;
      } catch (err: any) {
        logger.error('Error en listUsers:', { error: err.message });
        throw new Error('Error al listar usuarios.');
      }
    },

    listTecnicos: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        throw new Error('No autorizado.');
      }
      try {
        const result = await pgPool.query(
          "SELECT id, username, rol, nombre_completo, activo FROM usuarios_sistema WHERE rol = 'tecnico' AND activo = true ORDER BY username ASC;"
        );
        return result.rows.map(row => ({
          id: row.id,
          username: row.username,
          rol: row.rol,
          nombre_completo: row.nombre_completo,
          activo: row.activo,
          agencias: []
        }));
      } catch (err: any) {
        logger.error('Error al listar técnicos:', { error: err.message });
        return [];
      }
    },

    listMovimientosInsumos: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        throw new Error('No autorizado.');
      }
      try {
        const result = await MovimientoInsumo.find({}).sort({ fecha_movimiento: -1 });
        return result.map(m => ({
          ...m.toObject(),
          id: m._id.toString(),
          fecha_movimiento: m.fecha_movimiento.toISOString(),
        }));
      } catch (err: any) {
        logger.error('Error en listMovimientosInsumos:', { error: err.message });
        return [];
      }
    },
  },

  Mutation: {
    createTicket: async (
      _parent: any,
      args: {
        canal_origen: string;
        resumen: string;
        sintoma_descripcion: string;
        prioridad: string;
        agencia_id: string;
        serie_activo?: string;
        usuario_reporta?: string;
        status?: string;
        registro_manual_contingencia: boolean;
        datos_contingencia_texto?: string;
      },
      context: Context
    ) => {
      let datosCifrados: Buffer | null = null;

      if (args.registro_manual_contingencia && args.datos_contingencia_texto) {
        // Cifrar datos en contingencia usando AES-256
        datosCifrados = encryptAES(args.datos_contingencia_texto);
        logger.info('Generado ticket en modo contingencia con datos cifrados.', { remote_addr: context.remoteIp });
      } else if (args.serie_activo) {
        // En modo normal, validar existencia en MongoDB
        const activo = await ActivoTIC.findOne({ numero_serie: args.serie_activo });
        if (!activo) {
          throw new Error(`El activo con serie ${args.serie_activo} no existe en la CMDB.`);
        }
      }

      const ticketStatus = args.status || 'To Do';
      const isResolved = ticketStatus === 'Done';

      const result = await pgPool.query(`
        INSERT INTO tickets 
        (canal_origen, resumen, sintoma_descripcion, status, prioridad, registro_manual_contingencia, datos_contingencia_cifrados, agencia_id, serie_activo, usuario_reporta, fecha_resolucion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `, [
        args.canal_origen,
        args.resumen,
        args.sintoma_descripcion,
        ticketStatus,
        args.prioridad,
        args.registro_manual_contingencia,
        datosCifrados,
        args.agencia_id,
        args.serie_activo || null,
        args.usuario_reporta || null,
        isResolved ? new Date() : null
      ]);

      const ticket = result.rows[0];
      return {
        ...ticket,
        datos_contingencia_cifrados: args.datos_contingencia_texto || null,
        fecha_creacion: ticket.fecha_creacion.toISOString(),
        fecha_resolucion: ticket.fecha_resolucion ? ticket.fecha_resolucion.toISOString() : null,
      };
    },

    updateTicketStatus: async (
      _parent: any,
      { ticketId, status }: { ticketId: string; status: string },
      context: Context
    ) => {
      const allowed = ['To Do', 'In Progress', 'En Tránsito a Taller', 'Done'];
      if (!allowed.includes(status)) {
        throw new Error('Estado inválido. Debe ser uno de: To Do, In Progress, En Tránsito a Taller, Done.');
      }

      let queryStr = 'UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *;';
      const params = [status, ticketId];
      if (status === 'Done') {
        queryStr = 'UPDATE tickets SET status = $1, fecha_resolucion = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;';
      }

      const result = await pgPool.query(queryStr, params);

      if (result.rowCount === 0) {
        throw new Error('El ticket no existe.');
      }

      const ticket = result.rows[0];

      // Sincronización automática con la CMDB de MongoDB si pasa a 'En Tránsito a Taller'
      if (status === 'En Tránsito a Taller' && ticket && ticket.serie_activo) {
        try {
          const activo = await ActivoTIC.findOne({ numero_serie: ticket.serie_activo });
          if (activo) {
            const agenciaOriginal = activo.ubicacion_agencia || 'Almacen-TIC';
            activo.estado_asignacion = 'En Tránsito a Taller';
            activo.destino_final = 'Taller';
            activo.acta_entrega = {
              estado: 'No Aplica',
              destinatario_nombre: null,
              destinatario_cargo: null,
              jefe_inmediato_nombre: null,
              agencia_destino: null,
              fecha_generacion: null,
              fecha_firma_recibida: null
            };
            activo.markModified('acta_entrega');
            await activo.save();

            // Kardex
            await MovimientoActivo.create({
              numero_serie: activo.numero_serie,
              tipo_movimiento: 'Transferencia',
              agencia_origen: agenciaOriginal,
              agencia_destino: 'Taller',
              usuario_responsable: context.user?.username || 'system',
              factura_referencia: activo.factura_referencia || null,
              motivo_detalle: `Traslado a taller iniciado automáticamente desde ticket Kanban ${ticket.key}`
            });
            logger.info(`Activo ${activo.numero_serie} iniciado traslado a taller automáticamente por ticket ${ticket.key}`);
          }
        } catch (err: any) {
          logger.error('Error al sincronizar traslado de activo por cambio en ticket:', err);
        }
      }

      logger.info(`Ticket ${ticketId} actualizado a estado: ${status}`, { remote_addr: context.remoteIp });
      return {
        ...ticket,
        fecha_creacion: ticket.fecha_creacion.toISOString(),
        fecha_resolucion: ticket.fecha_resolucion ? ticket.fecha_resolucion.toISOString() : null,
      };
    },

    asignarTecnicoTicket: async (
      _parent: any,
      { ticketId, tecnicoId }: { ticketId: string; tecnicoId: string },
      context: Context
    ) => {
      // Validar que el técnico existe y tiene rol técnico
      const techCheck = await pgPool.query('SELECT rol FROM usuarios_sistema WHERE id = $1;', [tecnicoId]);
      if (techCheck.rowCount === 0 || techCheck.rows[0].rol !== 'tecnico') {
        throw new Error('El técnico asignado no existe o no tiene el rol correspondiente.');
      }

      const result = await pgPool.query(
        'UPDATE tickets SET tecnico_id = $1 WHERE id = $2 RETURNING *;',
        [tecnicoId, ticketId]
      );

      logger.info(`Ticket ${ticketId} asignado al técnico ${tecnicoId}`, { remote_addr: context.remoteIp });
      const ticket = result.rows[0];
      return {
        ...ticket,
        fecha_creacion: ticket.fecha_creacion.toISOString(),
        fecha_resolucion: ticket.fecha_resolucion ? ticket.fecha_resolucion.toISOString() : null,
      };
    },

    abrirComisionViaje: async (
      _parent: any,
      { tecnicoId, eanCodigos }: { tecnicoId: string; eanCodigos: string[] },
      context: Context
    ) => {
      // 1. Validar que el técnico no tenga penalización de Aging
      const isBlocked = await resolvers.Query.checkAgingLogistico(null, { tecnicoId });
      if (isBlocked) {
        throw new Error('El técnico se encuentra bloqueado debido al vencimiento del plazo de 48h de rendición.');
      }

      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        
        // Obtener username del técnico
        const techRes = await client.query('SELECT username FROM usuarios_sistema WHERE id = $1;', [tecnicoId]);
        const tecnicoUsername = techRes.rows[0]?.username || tecnicoId;

        const listRes = [];

        for (const ean of eanCodigos) {
          // Descontar en MongoDB
          const insumo = await InsumoEconomato.findOne({ ean_codigo: ean });
          if (!insumo || insumo.cantidad_stock <= 0) {
            throw new Error(`Insumo con EAN ${ean} no disponible en inventario.`);
          }
          const stockAnterior = insumo.cantidad_stock;
          insumo.cantidad_stock -= 1;
          await insumo.save();

          // Registrar MovimientoInsumo
          await MovimientoInsumo.create({
            sku_codigo: insumo.sku_codigo,
            ean_codigo: insumo.ean_codigo,
            descripcion_articulo: insumo.descripcion_articulo,
            tipo_movimiento: 'Asignación Técnico',
            cantidad: 1,
            stock_anterior: stockAnterior,
            stock_nuevo: insumo.cantidad_stock,
            usuario_responsable: context.user?.username || 'system',
            tecnico_asignado: tecnicoUsername,
            observacion: `Repuesto asignado al técnico ${tecnicoUsername} para comisión de viaje`
          });

          // Registrar custodia 'En Ruta' en PG
          const result = await client.query(`
            INSERT INTO custodia_repuestos (tecnico_id, ean_codigo, estado, comision_activa)
            VALUES ($1, $2, 'En Ruta', true)
            RETURNING *;
          `, [tecnicoId, ean]);
          
          listRes.push({
            ...result.rows[0],
            descripcion_articulo: insumo.descripcion_articulo,
            fecha_retiro: result.rows[0].fecha_retiro.toISOString(),
          });
        }

        await client.query('COMMIT');
        logger.info(`Comisión iniciada para técnico ${tecnicoId} con ${eanCodigos.length} repuestos.`, { remote_addr: context.remoteIp });
        return listRes;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    cerrarComisionViaje: async (
      _parent: any,
      { tecnicoId }: { tecnicoId: string },
      context: Context
    ) => {
      // Al cerrar comisión se setea comision_activa = false y empieza el Aging Logístico de 48h
      const result = await pgPool.query(`
        UPDATE custodia_repuestos 
        SET comision_activa = false, fecha_cierre_comision = CURRENT_TIMESTAMP
        WHERE tecnico_id = $1 AND comision_activa = true;
      `, [tecnicoId]);
      
      logger.info(`Comisión cerrada para el técnico ${tecnicoId}. Cuenta regresiva de 48 horas iniciada.`, { remote_addr: context.remoteIp });
      return (result.rowCount ?? 0) > 0;
    },

    regularizarCustodia: async (
      _parent: any,
      { tecnicoId, eanCodigo, estado, numeroSerieActivo, ubicacionDetalle }: { tecnicoId: string; eanCodigo: string; estado: 'Consumido' | 'Devuelto'; numeroSerieActivo?: string; ubicacionDetalle?: string },
      context: Context
    ) => {
      if (!['Consumido', 'Devuelto'].includes(estado)) {
        throw new Error('Estado de regularización inválido. Debe ser Consumido o Devuelto.');
      }

      if (estado === 'Consumido') {
        if (!numeroSerieActivo || numeroSerieActivo.trim() === '') {
          throw new Error('Debe especificar el número de serie o ID interno del equipo donde se utilizó el repuesto.');
        }
        if (!ubicacionDetalle || ubicacionDetalle.trim() === '') {
          throw new Error('Debe especificar la agencia/sede de destino donde se usó el repuesto.');
        }

        // Validar que el equipo exista en la CMDB de MongoDB
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerieActivo }, { id_interno: numeroSerieActivo }]
        });
        if (!activo) {
          throw new Error(`El equipo con número de serie o ID interno "${numeroSerieActivo}" no se encuentra registrado en la CMDB.`);
        }
      }

      // Buscar el repuesto en custodia 'En Ruta'
      const check = await pgPool.query(`
        SELECT id FROM custodia_repuestos 
        WHERE tecnico_id = $1 AND ean_codigo = $2 AND estado = 'En Ruta'
        LIMIT 1;
      `, [tecnicoId, eanCodigo]);

      if (check.rowCount === 0) {
        throw new Error('No se encontró repuesto en tránsito con ese código EAN bajo custodia.');
      }

      const id = check.rows[0].id;

      // Si es Devuelto, reingresar stock a MongoDB
      // Si es Devuelto, reingresar stock a MongoDB
      const insumo = await InsumoEconomato.findOne({ ean_codigo: eanCodigo });
      const stockAnterior = insumo ? insumo.cantidad_stock : 0;

      if (estado === 'Devuelto') {
        const stockNuevo = stockAnterior + 1;
        await InsumoEconomato.findOneAndUpdate(
          { ean_codigo: eanCodigo },
          { $inc: { cantidad_stock: 1 } }
        );

        if (insumo) {
          await MovimientoInsumo.create({
            sku_codigo: insumo.sku_codigo,
            ean_codigo: insumo.ean_codigo,
            descripcion_articulo: insumo.descripcion_articulo,
            tipo_movimiento: 'Ingreso',
            cantidad: 1,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            usuario_responsable: context.user?.username || tecnicoId,
            tecnico_asignado: tecnicoId,
            observacion: `Insumo devuelto al stock del Economato por el técnico`
          });
        }
      } else if (estado === 'Consumido') {
        if (insumo) {
          // Si es Consumido, se asienta el consumo (el stock ya se descontó al retirar)
          await MovimientoInsumo.create({
            sku_codigo: insumo.sku_codigo,
            ean_codigo: insumo.ean_codigo,
            descripcion_articulo: insumo.descripcion_articulo,
            tipo_movimiento: 'Consumo',
            cantidad: 1,
            stock_anterior: stockAnterior,
            stock_nuevo: stockAnterior,
            usuario_responsable: context.user?.username || tecnicoId,
            tecnico_asignado: tecnicoId,
            numero_serie_activo: numeroSerieActivo || null,
            ubicacion_agencia: ubicacionDetalle || null,
            observacion: `Repuesto consumido e instalado en equipo ${numeroSerieActivo} de la agencia ${ubicacionDetalle}`
          });
        }
      }

      // Actualizar en PG
      await pgPool.query(`
        UPDATE custodia_repuestos 
        SET estado = $1, 
            fecha_regularizacion = CURRENT_TIMESTAMP,
            numero_serie_activo = $2,
            ubicacion_detalle = $3
        WHERE id = $4;
      `, [estado, numeroSerieActivo || null, ubicacionDetalle || null, id]);

      logger.info(`Custodia EAN ${eanCodigo} regularizada como ${estado} en equipo ${numeroSerieActivo || 'N/A'} (agencia ${ubicacionDetalle || 'N/A'}) para técnico ${tecnicoId}.`, { remote_addr: context.remoteIp });
      return true;
    },

    renovacionTecnologica: async (
      _parent: any,
      { serieViejo, serieNuevo }: { serieViejo: string; serieNuevo: string },
      context: Context
    ) => {
      // 1. Buscar ambos CPU en la CMDB de MongoDB
      const cpuViejo = await ActivoTIC.findOne({ numero_serie: serieViejo });
      const cpuNuevo = await ActivoTIC.findOne({ numero_serie: serieNuevo });

      if (!cpuViejo || !cpuNuevo) {
        throw new Error('Ambos activos (viejo y nuevo) deben existir en la CMDB.');
      }

      const originalAgenciaViejo = cpuViejo.ubicacion_agencia;
      const ipOriginal = cpuViejo.ip_asignada;
      const hostOriginal = cpuViejo.nombre_estacion;

      // 2. CPU nuevo hereda IP/Host si es equipo de cómputo y guarda enlace histórico
      if (cpuNuevo.tipo_equipo.toUpperCase() === 'CPU' || cpuNuevo.tipo_equipo.toUpperCase() === 'LAPTOP') {
        cpuNuevo.ip_asignada = ipOriginal;
        cpuNuevo.nombre_estacion = hostOriginal;
      }
      cpuNuevo.activo_reemplazado_id = serieViejo;
      cpuNuevo.ubicacion_agencia = originalAgenciaViejo; // Se ubica en la agencia original del viejo
      cpuNuevo.estado_asignacion = 'Asignado';
      await cpuNuevo.save();

      // 3. CPU viejo limpia parámetros de red y pasa a estado transicional "En Almacén (Para Reasignar)" o "Para Baja"
      cpuViejo.ip_asignada = null;
      if (cpuViejo.nombre_estacion) {
        cpuViejo.nombre_estacion = `${cpuViejo.nombre_estacion}-OBSOLETO`;
      }
      cpuViejo.estado_asignacion = 'Pendiente de Asignación';
      
      const tipoSup = cpuViejo.tipo_equipo ? cpuViejo.tipo_equipo.toUpperCase() : '';
      if (tipoSup === 'CPU' || tipoSup === 'LAPTOP') {
        cpuViejo.ubicacion_agencia = 'En Almacén (Para Reasignar)';
      } else {
        cpuViejo.ubicacion_agencia = 'Para Baja';
      }
      await cpuViejo.save();

      // 4. Asentar movimientos en Kardex
      await MovimientoActivo.create({
        numero_serie: serieNuevo,
        tipo_movimiento: 'Renovación',
        agencia_origen: null,
        agencia_destino: originalAgenciaViejo,
        usuario_responsable: cpuNuevo.nombre_usuario_final || 'Por Asignar',
        factura_referencia: cpuNuevo.factura_referencia || null,
        motivo_detalle: `Instalación por renovación tecnológica. Reemplaza a CPU: ${serieViejo}`
      });

      await MovimientoActivo.create({
        numero_serie: serieViejo,
        tipo_movimiento: 'Renovación',
        agencia_origen: originalAgenciaViejo,
        agencia_destino: 'En Almacén (Para Reasignar)',
        usuario_responsable: cpuViejo.nombre_usuario_final || 'Por Asignar',
        factura_referencia: cpuViejo.factura_referencia || null,
        motivo_detalle: `Desactivado por renovación tecnológica. Reemplazado por CPU: ${serieNuevo}`
      });

      logger.info(`Renovación tecnológica completada: Nuevo CPU (${serieNuevo}) hereda red de CPU Viejo (${serieViejo}).`, { remote_addr: context.remoteIp });
      return true;
    },

    crearInformeBaja: async (
      _parent: any,
      args: { numero_informe: string; diagnostico_tecnico: string; sustento_logistico: string; serie_activo: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede emitir informes de baja.');
      }

      // 1. Insertar informe en PostgreSQL (tipo='Baja')
      await pgPool.query(`
        INSERT INTO informes_baja_renovacion (numero_informe, tipo, diagnostico_tecnico, sustento_logistico, administrador_id)
        VALUES ($1, 'Baja', $2, $3, $4);
      `, [args.numero_informe, args.diagnostico_tecnico, args.sustento_logistico, context.user.id]);

      // 2. Liberar IP y host al instante en MongoDB CMDB
      const activo = await ActivoTIC.findOne({ numero_serie: args.serie_activo });
      const agenciaOriginal = activo ? activo.ubicacion_agencia : 'Desconocida';
      if (activo) {
        activo.ip_asignada = null;
        activo.nombre_estacion = 'DEBAJA';
        activo.ubicacion_agencia = 'Baja Definitiva - Logística';
        await activo.save();
      }

      // 3. Asentar movimiento de Baja en Kardex
      await MovimientoActivo.create({
        numero_serie: args.serie_activo,
        tipo_movimiento: 'Baja',
        agencia_origen: agenciaOriginal,
        agencia_destino: 'Baja Definitiva - Logística',
        usuario_responsable: 'Administrador Patrimonial',
        factura_referencia: args.numero_informe,
        motivo_detalle: `Baja definitiva según informe técnico: ${args.numero_informe}`
      });

      logger.info(`Informe de Baja ${args.numero_informe} emitido. IP liberada para activo ${args.serie_activo}.`, { remote_addr: context.remoteIp });
      return true;
    },

    crearInformeRenovacion: async (
      _parent: any,
      args: { numero_informe: string; diagnostico_tecnico: string; sustento_logistico: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede emitir informes de renovación.');
      }

      // Insertar en PostgreSQL (tipo='Renovacion')
      await pgPool.query(`
        INSERT INTO informes_baja_renovacion (numero_informe, tipo, diagnostico_tecnico, sustento_logistico, administrador_id)
        VALUES ($1, 'Renovacion', $2, $3, $4);
      `, [args.numero_informe, args.diagnostico_tecnico, args.sustento_logistico, context.user.id]);

      logger.info(`Informe de Renovación ${args.numero_informe} emitido. Requiere aprobación manual para reasignar.`, { remote_addr: context.remoteIp });
      return true;
    },

    aprobarReutilizacion: async (
      _parent: any,
      { serie_activo }: { serie_activo: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador puede aprobar la reutilización del activo.');
      }

      const activo = await ActivoTIC.findOne({ numero_serie: serie_activo });
      if (!activo) {
        throw new Error('El activo no existe.');
      }

      activo.ubicacion_agencia = 'Oficina Central (Reasignado)';
      await activo.save();

      logger.info(`Aprobada reutilización del activo ${serie_activo} en CMDB.`, { remote_addr: context.remoteIp });
      return true;
    },

    createUser: async (
      _parent: any,
      { username, nombreCompleto, rol, agencias }: { username: string; nombreCompleto: string; rol: 'administrador' | 'tecnico' | 'invitado'; agencias: string[] },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede crear usuarios.');
      }
      try {
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 12);
        
        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');
          const res = await client.query(
            'INSERT INTO usuarios_sistema (username, password_hash, rol, nombre_completo, activo) VALUES ($1, $2, $3, $4, TRUE) RETURNING id;',
            [username, hash, rol, nombreCompleto]
          );
          const userId = res.rows[0].id;
          for (const ag of agencias) {
            await client.query(
              'INSERT INTO usuario_agencias (usuario_id, agencia_id) VALUES ($1, $2);',
              [userId, ag]
            );
          }
          await client.query('COMMIT');
          logger.info(`Usuario creado por admin: ${username} (rol: ${rol})`, { remote_addr: context.remoteIp });
          return tempPassword;
        } catch (err: any) {
          await client.query('ROLLBACK');
          logger.error('Error al insertar usuario en BD:', { error: err.message });
          if (err.code === '23505' || err.message.includes('unique constraint') || err.message.includes('usuarios_sistema_username_key')) {
            throw new Error('El nombre de usuario ya está registrado por otra cuenta. Elija uno diferente.');
          }
          throw err;
        } finally {
          client.release();
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al crear usuario.');
      }
    },

    updateUser: async (
      _parent: any,
      { id, nombreCompleto, rol, activo, agencias }: { id: string; nombreCompleto: string; rol: 'administrador' | 'tecnico' | 'invitado'; activo: boolean; agencias: string[] },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede editar usuarios.');
      }
      try {
        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            'UPDATE usuarios_sistema SET nombre_completo = $1, rol = $2, activo = $3 WHERE id = $4;',
            [nombreCompleto, rol, activo, id]
          );
          await client.query('DELETE FROM usuario_agencias WHERE usuario_id = $1;', [id]);
          for (const ag of agencias) {
            await client.query(
              'INSERT INTO usuario_agencias (usuario_id, agencia_id) VALUES ($1, $2);',
              [id, ag]
            );
          }
          await client.query('COMMIT');
          logger.info(`Usuario actualizado por admin: ID ${id}`, { remote_addr: context.remoteIp });
          return true;
        } catch (err: any) {
          await client.query('ROLLBACK');
          logger.error('Error al actualizar usuario en BD:', { error: err.message });
          throw err;
        } finally {
          client.release();
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al actualizar usuario.');
      }
    },

    resetUserPassword: async (
      _parent: any,
      { id }: { id: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede restablecer contraseñas.');
      }
      try {
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 12);
        
        const client = await pgPool.connect();
        try {
          const res = await client.query(
            "UPDATE usuarios_sistema SET password_hash = $1 WHERE id = $2 RETURNING username;",
            [hash, id]
          );
          if ((res.rowCount ?? 0) === 0) {
            throw new Error('Usuario no encontrado.');
          }
          logger.info(`Contraseña restablecida por admin para usuario ID ${id} (${res.rows[0].username})`, { remote_addr: context.remoteIp });
          return tempPassword;
        } finally {
          client.release();
        }
      } catch (err: any) {
        throw new Error(err.message || 'Error al restablecer contraseña.');
      }
    },

    asignarActivoAgencia: async (
      _parent: any,
      { numeroSerie, destinoFinal, destinatarioNombre, destinatarioCargo, jefeInmediatoNombre }: { numeroSerie: string; destinoFinal: string; destinatarioNombre: string; destinatarioCargo: string; jefeInmediatoNombre: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerie }, { id_interno: numeroSerie }]
        });
        if (!activo) {
          throw new Error('El activo no existe.');
        }

        const agenciaOriginal = activo.ubicacion_agencia || 'Almacen-TIC';
        activo.estado_asignacion = 'Asignado';
        activo.destino_final = destinoFinal;
        activo.ubicacion_agencia = destinoFinal;
        activo.acta_entrega = {
          estado: 'Pendiente de Firma',
          destinatario_nombre: destinatarioNombre,
          destinatario_cargo: destinatarioCargo,
          jefe_inmediato_nombre: jefeInmediatoNombre,
          agencia_destino: destinoFinal,
          fecha_generacion: new Date(),
          fecha_firma_recibida: null
        };
        await activo.save();

        // Registrar en Kardex
        await MovimientoActivo.create({
          numero_serie: activo.numero_serie,
          tipo_movimiento: 'Transferencia',
          agencia_origen: agenciaOriginal,
          agencia_destino: destinoFinal,
          usuario_responsable: context.user.username,
          factura_referencia: activo.factura_referencia || null,
          motivo_detalle: 'Asignación desde Módulo de Asignaciones'
        });

        logger.info(`Activo ${activo.numero_serie} asignado a agencia ${destinoFinal}.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en asignarActivoAgencia:', { error: err.message });
        throw new Error(err.message || 'Error al asignar activo.');
      }
    },

    marcarActaFirmada: async (
      _parent: any,
      { numeroSerie }: { numeroSerie: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerie }, { id_interno: numeroSerie }]
        });
        if (!activo) {
          throw new Error('El activo no existe.');
        }

        if (activo.acta_entrega) {
          activo.acta_entrega.estado = 'Firmado y Devuelto';
          activo.acta_entrega.fecha_firma_recibida = new Date();
          activo.markModified('acta_entrega');
          await activo.save();
          logger.info(`Acta firmada y devuelta para activo ${activo.numero_serie}.`, { remote_addr: context.remoteIp });
          return true;
        }
        return false;
      } catch (err: any) {
        logger.error('Error en marcarActaFirmada:', { error: err.message });
        throw new Error(err.message || 'Error al marcar acta como firmada.');
      }
    },

    registrarIngresoActivo: async (
      _parent: any,
      args: {
        ubicacion_inicial: 'Almacen-TIC' | 'Economato-Equipos' | 'Economato-InsRep';
        marca: string;
        modelo: string;
        tipo_equipo: string;
        numero_serie?: string;
        informacion_adicional?: string;
        factura_referencia?: string;
        factura_adjunto_b64?: string;
        factura_adjunto_mime?: string;
      },
      context: Context
    ) => {
      if (!context.user || (context.user.rol !== 'administrador' && context.user.rol !== 'tecnico')) {
        throw new Error('Solo el administrador patrimonial o técnicos de campo pueden registrar nuevos ingresos.');
      }

      const { ubicacion_inicial, marca, modelo, tipo_equipo, numero_serie, informacion_adicional, factura_referencia, factura_adjunto_b64, factura_adjunto_mime } = args;

      if (ubicacion_inicial === 'Economato-InsRep') {
        const ean = numero_serie ? numero_serie.trim() : `EAN-${Date.now().toString().slice(-6)}`;
        const sku = `SKU-${ean}`;
        const desc = `${marca} ${modelo}`.toUpperCase();

        const insumo = await InsumoEconomato.findOneAndUpdate(
          { ean_codigo: ean },
          {
            $set: {
              sku_codigo: sku,
              ean_codigo: ean,
              descripcion_articulo: desc,
              categoria: tipo_equipo.toLowerCase().includes('repuesto') ? 'Repuesto' : 'Insumo',
              unidad_medida: 'Unidad',
              factura_referencia: factura_referencia || null,
            },
            $inc: { cantidad_stock: 1 }
          },
          { upsert: true, new: true }
        );

        logger.info(`Insumo individual ingresado: ${desc} (EAN: ${ean})`, { remote_addr: context.remoteIp });
        return {
          id: insumo.id,
          numero_serie: ean,
          tipo_equipo: 'Insumo / Repuesto',
          marca: marca,
          modelo: modelo,
          ip_asignada: null,
          nombre_estacion: 'ECONOMATO',
          usuario_red_asignado: 'Sin Asignar',
          nombre_usuario_final: 'Por Asignar',
          fecha_registro_sistema: new Date().toISOString(),
          ubicacion_agencia: 'Economato-InsRep',
          estado_asignacion: 'Asignado',
          ubicacion_inicial: 'Economato-InsRep'
        };
      }

      let finalSerie = numero_serie ? numero_serie.trim() : '';
      let idInterno = null;
      let infoAdicionalModificada = informacion_adicional || '';

      let exists = false;
      if (finalSerie) {
        const check = await ActivoTIC.findOne({ numero_serie: finalSerie });
        if (check) exists = true;
      }

      if (!finalSerie || exists) {
        const cleanType = tipo_equipo.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const count = await ActivoTIC.countDocuments({ tipo_equipo });
        idInterno = `${cleanType}-${(count + 1).toString().padStart(4, '0')}`;

        if (exists && finalSerie) {
          infoAdicionalModificada = `EAN/Serie compartido original: ${finalSerie}. ${infoAdicionalModificada}`.trim();
        }
        finalSerie = idInterno;
      } else {
        idInterno = finalSerie;
      }

      const isEnumValid = ['Almacen-TIC', 'Economato-Equipos', 'Economato-InsRep'].includes(ubicacion_inicial);
      const finalUbicacionInicial = isEnumValid ? (ubicacion_inicial as any) : 'Almacen-TIC';
      const finalUbicacionAgencia = ubicacion_inicial;
      const finalEstadoAsignacion = isEnumValid ? 'Pendiente de Asignación' : 'Asignado';

      const activo = await ActivoTIC.create({
        numero_serie: finalSerie,
        tipo_equipo,
        marca,
        modelo,
        ip_asignada: null,
        nombre_estacion: 'Pendiente de Asignación',
        usuario_red_asignado: 'Sin Asignar',
        nombre_usuario_final: 'Por Asignar',
        ubicacion_agencia: finalUbicacionAgencia,
        estado_asignacion: finalEstadoAsignacion,
        ubicacion_inicial: finalUbicacionInicial,
        id_interno: idInterno,
        informacion_adicional: infoAdicionalModificada || null,
        factura_referencia: factura_referencia || null,
        factura_adjunto_b64: factura_adjunto_b64 || null,
        factura_adjunto_mime: factura_adjunto_mime || null,
        acta_entrega: {
          estado: 'No Aplica'
        }
      });

      await MovimientoActivo.create({
        numero_serie: finalSerie,
        tipo_movimiento: 'Ingreso',
        agencia_origen: null,
        agencia_destino: finalUbicacionAgencia,
        usuario_responsable: context.user.username,
        factura_referencia: factura_referencia || null,
        motivo_detalle: `Ingreso individual simplificado a ${finalUbicacionAgencia}`
      });

      logger.info(`Activo ingresado exitosamente: ${finalSerie} en ${finalUbicacionAgencia}`, { remote_addr: context.remoteIp });
      return activo;
    },

    updateActivo: async (
      _parent: any,
      { id, tipo_equipo, marca, modelo, numero_serie, ip_asignada, informacion_adicional }: { id: string; tipo_equipo: string; marca: string; modelo: string; numero_serie: string; ip_asignada?: string; informacion_adicional?: string },
      context: Context
    ) => {
      if (!context.user || (context.user.rol !== 'administrador' && context.user.rol !== 'tecnico')) {
        throw new Error('Solo el administrador o técnicos de campo pueden actualizar activos.');
      }
      try {
        const activo = await ActivoTIC.findById(id);
        if (!activo) {
          throw new Error('Activo no encontrado.');
        }

        const viejaSerie = activo.numero_serie;

        activo.tipo_equipo = tipo_equipo;
        activo.marca = marca;
        activo.modelo = modelo;
        activo.numero_serie = numero_serie;
        activo.ip_asignada = ip_asignada || null;
        activo.informacion_adicional = informacion_adicional || null;

        await activo.save();

        if (viejaSerie !== numero_serie) {
          await MovimientoActivo.updateMany({ numero_serie: viejaSerie }, { $set: { numero_serie: numero_serie } });
          await pgPool.query('UPDATE tickets SET serie_activo = $1 WHERE serie_activo = $2;', [numero_serie, viejaSerie]);
        }

        logger.info(`Activo ID ${id} actualizado por ${context.user.username}. Nueva serie: ${numero_serie}`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en updateActivo:', { error: err.message });
        throw new Error(err.message || 'Error al actualizar activo.');
      }
    },

    registrarUsoInsumo: async (
      _parent: any,
      { skuCodigo, numeroSerieActivo, ubicacionDetalle, cantidad }: { skuCodigo: string; numeroSerieActivo: string; ubicacionDetalle: string; cantidad: number },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const insumo = await InsumoEconomato.findOne({ sku_codigo: skuCodigo });
        if (!insumo) {
          throw new Error('El insumo/repuesto no existe.');
        }
        if (insumo.cantidad_stock < cantidad) {
          throw new Error(`Stock insuficiente. Disponible: ${insumo.cantidad_stock}`);
        }

        const stockAnterior = insumo.cantidad_stock;
        insumo.cantidad_stock -= cantidad;
        await insumo.save();

        // Registrar MovimientoInsumo
        await MovimientoInsumo.create({
          sku_codigo: insumo.sku_codigo,
          ean_codigo: insumo.ean_codigo,
          descripcion_articulo: insumo.descripcion_articulo,
          tipo_movimiento: 'Consumo',
          cantidad: cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: insumo.cantidad_stock,
          usuario_responsable: context.user.username,
          numero_serie_activo: numeroSerieActivo || null,
          ubicacion_agencia: ubicacionDetalle || null,
          observacion: `Consumo manual registrado en equipo ${numeroSerieActivo || 'N/A'}`
        });

        logger.info(`Técnico ${context.user.username} registró uso de ${cantidad} unidades de ${insumo.descripcion_articulo} en equipo ${numeroSerieActivo} de la agencia ${ubicacionDetalle}.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en registrarUsoInsumo:', { error: err.message });
        throw new Error(err.message || 'Error al registrar uso de insumo.');
      }
    },

    trasladarActivoAgencia: async (
      _parent: any,
      { numeroSerie, destinoFinal, destinatarioNombre, destinatarioCargo, jefeInmediatoNombre }: { numeroSerie: string; destinoFinal: string; destinatarioNombre: string; destinatarioCargo: string; jefeInmediatoNombre: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerie }, { id_interno: numeroSerie }]
        });
        if (!activo) {
          throw new Error('El activo no existe.');
        }

        const agenciaOriginal = activo.ubicacion_agencia || 'Almacen-TIC';
        activo.estado_asignacion = 'En Tránsito';
        activo.destino_final = destinoFinal;
        activo.acta_entrega = {
          estado: 'Pendiente de Firma',
          destinatario_nombre: destinatarioNombre,
          destinatario_cargo: destinatarioCargo,
          jefe_inmediato_nombre: jefeInmediatoNombre,
          agencia_destino: destinoFinal,
          fecha_generacion: new Date(),
          fecha_firma_recibida: null
        };
        activo.markModified('acta_entrega');
        await activo.save();

        // Kardex
        await MovimientoActivo.create({
          numero_serie: activo.numero_serie,
          tipo_movimiento: 'Transferencia',
          agencia_origen: agenciaOriginal,
          agencia_destino: destinoFinal,
          usuario_responsable: context.user.username,
          factura_referencia: activo.factura_referencia || null,
          motivo_detalle: `Traslado rápido de agencia iniciado hacia ${destinoFinal}`
        });

        logger.info(`Activo ${activo.numero_serie} iniciado traslado hacia ${destinoFinal}.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en trasladarActivoAgencia:', { error: err.message });
        throw new Error(err.message || 'Error al iniciar traslado.');
      }
    },

    trasladarActivoTaller: async (
      _parent: any,
      { numeroSerie }: { numeroSerie: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerie }, { id_interno: numeroSerie }]
        });
        if (!activo) {
          throw new Error('El activo no existe.');
        }

        const agenciaOriginal = activo.ubicacion_agencia || 'Almacen-TIC';
        activo.estado_asignacion = 'En Tránsito a Taller';
        activo.destino_final = 'Taller';
        activo.acta_entrega = {
          estado: 'No Aplica',
          destinatario_nombre: null,
          destinatario_cargo: null,
          jefe_inmediato_nombre: null,
          agencia_destino: null,
          fecha_generacion: null,
          fecha_firma_recibida: null
        };
        activo.markModified('acta_entrega');
        await activo.save();

        // Kardex
        await MovimientoActivo.create({
          numero_serie: activo.numero_serie,
          tipo_movimiento: 'Transferencia',
          agencia_origen: agenciaOriginal,
          agencia_destino: 'Taller',
          usuario_responsable: context.user.username,
          factura_referencia: activo.factura_referencia || null,
          motivo_detalle: `Traslado a taller iniciado para soporte/reparación`
        });

        logger.info(`Activo ${activo.numero_serie} en tránsito a Taller.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en trasladarActivoTaller:', { error: err.message });
        throw new Error(err.message || 'Error al iniciar traslado a taller.');
      }
    },

    confirmarRecepcionTraslado: async (
      _parent: any,
      { numeroSerie }: { numeroSerie: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol === 'invitado') {
        throw new Error('Permisos insuficientes. El rol Invitado es de solo lectura.');
      }
      try {
        const activo = await ActivoTIC.findOne({
          $or: [{ numero_serie: numeroSerie }, { id_interno: numeroSerie }]
        });
        if (!activo) {
          throw new Error('El activo no existe.');
        }

        if (activo.estado_asignacion !== 'En Tránsito' && activo.estado_asignacion !== 'En Tránsito a Taller') {
          throw new Error('El equipo no se encuentra en estado de tránsito.');
        }

        const agenciaOriginal = activo.ubicacion_agencia || 'Almacen-TIC';
        const destino = activo.destino_final || 'Almacen-TIC';

        if (destino === 'Taller') {
          activo.ubicacion_agencia = 'Almacen-TIC';
          activo.ubicacion_inicial = 'Almacen-TIC';
          activo.estado_asignacion = 'Pendiente de Asignación';
        } else {
          activo.ubicacion_agencia = destino;
          activo.estado_asignacion = 'Asignado';
        }

        activo.destino_final = null;
        await activo.save();

        // Kardex
        await MovimientoActivo.create({
          numero_serie: activo.numero_serie,
          tipo_movimiento: 'Transferencia',
          agencia_origen: agenciaOriginal,
          agencia_destino: activo.ubicacion_agencia,
          usuario_responsable: context.user.username,
          factura_referencia: activo.factura_referencia || null,
          motivo_detalle: `Recepción física y llegada confirmada en destino: ${activo.ubicacion_agencia}`
        });

        logger.info(`Llegada de activo ${activo.numero_serie} confirmada en ${activo.ubicacion_agencia}.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error en confirmarRecepcionTraslado:', { error: err.message });
        throw new Error(err.message || 'Error al confirmar recepción.');
      }
    },

    ajustarStockInsumo: async (
      _parent: any,
      { skuCodigo, cantidadNueva, observacion }: { skuCodigo: string; cantidadNueva: number; observacion: string },
      context: Context
    ) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial puede ajustar el inventario.');
      }
      try {
        const insumo = await InsumoEconomato.findOne({ sku_codigo: skuCodigo });
        if (!insumo) {
          throw new Error('El insumo/repuesto no existe.');
        }

        const stockAnterior = insumo.cantidad_stock;
        insumo.cantidad_stock = cantidadNueva;
        await insumo.save();

        // Registrar en MovimientoInsumo
        await MovimientoInsumo.create({
          sku_codigo: insumo.sku_codigo,
          ean_codigo: insumo.ean_codigo,
          descripcion_articulo: insumo.descripcion_articulo,
          tipo_movimiento: 'Ajuste',
          cantidad: cantidadNueva - stockAnterior,
          stock_anterior: stockAnterior,
          stock_nuevo: cantidadNueva,
          usuario_responsable: context.user.username,
          observacion: observacion || 'Ajuste de inventario manual'
        });

        logger.info(`Ajuste de stock para ${insumo.sku_codigo} por ${context.user.username}. De ${stockAnterior} a ${cantidadNueva}`, { remote_addr: context.remoteIp });
        return insumo;
      } catch (err: any) {
        logger.error('Error en ajustarStockInsumo:', { error: err.message });
        throw new Error(err.message || 'Error al ajustar stock.');
      }
    },

    limpiarDatosPrueba: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial tiene autorización para realizar la limpieza de base de datos.');
      }
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // 1. Limpiar tablas transaccionales en PostgreSQL
        await client.query('TRUNCATE TABLE tickets RESTART IDENTITY CASCADE;');
        await client.query('TRUNCATE TABLE custodia_repuestos RESTART IDENTITY CASCADE;');
        // Eliminar otros usuarios de prueba excepto el admin
        await client.query("DELETE FROM usuarios_sistema WHERE username != 'admin';");

        // Asegurar que el usuario admin esté creado y activo con la contraseña de .env o admin123
        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
        const adminHash = await bcrypt.hash(adminPassword, 12);
        const adminCheck = await client.query("SELECT id FROM usuarios_sistema WHERE username = 'admin';");
        if (adminCheck.rows.length > 0) {
          await client.query("UPDATE usuarios_sistema SET password_hash = $1, activo = true WHERE username = 'admin';", [adminHash]);
        } else {
          await client.query("INSERT INTO usuarios_sistema (username, password_hash, rol, nombre_completo, activo) VALUES ('admin', $1, 'administrador', 'Administrador Patrimonial', true);", [adminHash]);
        }

        await client.query('COMMIT');

        // 2. Limpiar colecciones de MongoDB CMDB
        await ActivoTIC.deleteMany({});
        await InsumoEconomato.deleteMany({});
        await MovimientoActivo.deleteMany({});
        await MovimientoInsumo.deleteMany({});

        // 3. Limpiar Redis cache
        try {
          await redisClient.flushall();
          logger.info('Redis cache limpiado exitosamente durante inicialización de datos.');
        } catch (redisErr: any) {
          logger.warn(`No se pudo vaciar la caché de Redis: ${redisErr.message}`);
        }

        logger.info(`Limpieza total de base de datos ejecutada por el Administrador: ${context.user.username}. Sistema inicializado en producción.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        await client.query('ROLLBACK');
        logger.error('Error durante la limpieza de base de datos:', { error: err.message });
        throw new Error(err.message || 'Error interno al limpiar base de datos.');
      } finally {
        client.release();
      }
    },

    sembrarDatosIniciales: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.rol !== 'administrador') {
        throw new Error('Solo el administrador patrimonial tiene autorización para sembrar los datos iniciales.');
      }
      try {
        await ejecutarSembradoManual();
        logger.info(`Sembrado manual de catálogo y activos ejecutado por el Administrador: ${context.user.username}.`, { remote_addr: context.remoteIp });
        return true;
      } catch (err: any) {
        logger.error('Error durante el sembrado manual de datos:', { error: err.message });
        throw new Error(err.message || 'Error al ejecutar sembrado manual.');
      }
    },
  },
};
