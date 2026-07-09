import { pgPool } from '../config/db';
import redisClient from '../config/redis';
import { ActivoTIC, InsumoEconomato, MovimientoActivo } from '../models/mongoSchemas';
import { encryptAES, decryptAES } from '../utils/crypto';
import { logger } from '../utils/logger';
import { AuthUser } from '../middleware/auth';

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

      logger.info(`Ticket ${ticketId} actualizado a estado: ${status}`, { remote_addr: context.remoteIp });
      const ticket = result.rows[0];
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
        const listRes = [];

        for (const ean of eanCodigos) {
          // Descontar en MongoDB
          const insumo = await InsumoEconomato.findOne({ ean_codigo: ean });
          if (!insumo || insumo.cantidad_stock <= 0) {
            throw new Error(`Insumo con EAN ${ean} no disponible en inventario.`);
          }
          insumo.cantidad_stock -= 1;
          await insumo.save();

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
      return result.rowCount > 0;
    },

    regularizarCustodia: async (
      _parent: any,
      { tecnicoId, eanCodigo, estado }: { tecnicoId: string; eanCodigo: string; estado: 'Consumido' | 'Devuelto' },
      context: Context
    ) => {
      if (!['Consumido', 'Devuelto'].includes(estado)) {
        throw new Error('Estado de regularización inválido. Debe ser Consumido o Devuelto.');
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
      if (estado === 'Devuelto') {
        await InsumoEconomato.findOneAndUpdate(
          { ean_codigo: eanCodigo },
          { $inc: { cantidad_stock: 1 } }
        );
      }

      // Actualizar en PG
      await pgPool.query(`
        UPDATE custodia_repuestos 
        SET estado = $1, fecha_regularizacion = CURRENT_TIMESTAMP
        WHERE id = $2;
      `, [estado, id]);

      logger.info(`Custodia EAN ${eanCodigo} regularizada como ${estado} para técnico ${tecnicoId}.`, { remote_addr: context.remoteIp });
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

      // 2. CPU nuevo hereda IP/Host y guarda enlace histórico autorreferencial
      cpuNuevo.ip_asignada = ipOriginal;
      cpuNuevo.nombre_estacion = hostOriginal;
      cpuNuevo.activo_reemplazado_id = serieViejo;
      cpuNuevo.ubicacion_agencia = originalAgenciaViejo; // Se ubica en la agencia original del viejo
      await cpuNuevo.save();

      // 3. CPU viejo limpia parámetros de red y pasa a estado transicional "En Almacén (Para Reasignar)"
      cpuViejo.ip_asignada = null;
      cpuViejo.nombre_estacion = `${hostOriginal}-OBSOLETO`;
      cpuViejo.ubicacion_agencia = 'En Almacén (Para Reasignar)';
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
  },
};
