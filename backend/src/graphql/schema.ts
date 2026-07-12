import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum Rol {
    administrador
    tecnico
    invitado
  }

  enum TicketStatus {
    ToDo
    InProgress
    EnTransitoATaller
    Done
  }

  type User {
    id: ID!
    username: String!
    rol: Rol!
  }

  type UserAccount {
    id: ID!
    username: String!
    rol: Rol!
    nombre_completo: String!
    activo: Boolean!
    agencias: [String!]!
  }

  type Ticket {
    id: ID!
    key: String!
    canal_origen: String!
    resumen: String!
    sintoma_descripcion: String!
    status: String!
    prioridad: String!
    registro_manual_contingencia: Boolean!
    datos_contingencia_cifrados: String
    tecnico_id: String
    tecnico_username: String
    agencia_id: String!
    serie_activo: String
    usuario_reporta: String
    fecha_resolucion: String
    fecha_creacion: String!
  }

  type ActaEntrega {
    estado: String!
    destinatario_nombre: String
    destinatario_cargo: String
    jefe_inmediato_nombre: String
    agencia_destino: String
    fecha_generacion: String
    fecha_firma_recibida: String
  }

  type ActivoTIC {
    id: ID!
    numero_serie: String!
    tipo_equipo: String!
    marca: String!
    modelo: String!
    ip_asignada: String
    nombre_estacion: String!
    usuario_red_asignado: String!
    nombre_usuario_final: String!
    fecha_registro_sistema: String!
    ubicacion_agencia: String!
    activo_reemplazado_id: String
    factura_referencia: String
    factura_adjunto_b64: String
    factura_adjunto_mime: String
    fecha_compra: String
    estado_asignacion: String!
    ubicacion_inicial: String!
    destino_final: String
    id_interno: String
    informacion_adicional: String
    acta_entrega: ActaEntrega
  }

  type InsumoEconomato {
    id: ID!
    sku_codigo: String!
    ean_codigo: String!
    descripcion_articulo: String!
    categoria: String!
    cantidad_stock: Int!
    unidad_medida: String!
    factura_referencia: String
    factura_adjunto_b64: String
    factura_adjunto_mime: String
  }

  type MovimientoActivo {
    id: ID!
    numero_serie: String!
    fecha_movimiento: String!
    tipo_movimiento: String!
    agencia_origen: String
    agencia_destino: String!
    usuario_responsable: String!
    factura_referencia: String
    motivo_detalle: String!
  }

  type CustodiaRepuesto {
    id: ID!
    tecnico_id: String!
    tecnico_username: String
    ean_codigo: String!
    descripcion_articulo: String
    estado: String!
    fecha_retiro: String!
    fecha_cierre_comision: String
    fecha_regularizacion: String
    comision_activa: Boolean!
    numero_serie_activo: String
    ubicacion_detalle: String
  }

  type MovimientoInsumo {
    id: ID!
    sku_codigo: String!
    ean_codigo: String!
    descripcion_articulo: String!
    fecha_movimiento: String!
    tipo_movimiento: String!
    cantidad: Int!
    stock_anterior: Int!
    stock_nuevo: Int!
    usuario_responsable: String!
    tecnico_asignado: String
    numero_serie_activo: String
    ubicacion_agencia: String
    observacion: String
  }

  type Query {
    me: User
    searchActivo(query: String!): ActivoTIC
    checkHistorialActivo(serie: String!): Boolean!
    listTickets(status: String, tecnicoId: String): [Ticket!]!
    listCustodia(tecnicoId: String): [CustodiaRepuesto!]!
    checkAgingLogistico(tecnicoId: String!): Boolean!
    listInsumos: [InsumoEconomato!]!
    listActivosCMDB: [ActivoTIC!]!
    countTicketsActivo(serie: String!): Int!
    getHistorialActivo(serie: String!): [Ticket!]!
    getKardexActivo(serie: String!): [MovimientoActivo!]!
    
    # Nuevas consultas para los módulos
    listUsers: [UserAccount!]!
    listTecnicos: [UserAccount!]!
    listMovimientosInsumos: [MovimientoInsumo!]!
  }

  type Mutation {
    createTicket(
      canal_origen: String!
      resumen: String!
      sintoma_descripcion: String!
      prioridad: String!
      agencia_id: String!
      serie_activo: String
      usuario_reporta: String
      status: String
      registro_manual_contingencia: Boolean!
      datos_contingencia_texto: String
    ): Ticket!

    updateTicketStatus(ticketId: ID!, status: String!): Ticket!
    asignarTecnicoTicket(ticketId: ID!, tecnicoId: ID!): Ticket!

    abrirComisionViaje(tecnicoId: ID!, eanCodigos: [String!]!): [CustodiaRepuesto!]!
    cerrarComisionViaje(tecnicoId: ID!): Boolean!
    regularizarCustodia(tecnicoId: ID!, eanCodigo: String!, estado: String!, numeroSerieActivo: String, ubicacionDetalle: String): Boolean!

    renovacionTecnologica(serieViejo: String!, serieNuevo: String!): Boolean!
    
    crearInformeBaja(
      numero_informe: String!
      diagnostico_tecnico: String!
      sustento_logistico: String!
      serie_activo: String!
    ): Boolean!

    crearInformeRenovacion(
      numero_informe: String!
      diagnostico_tecnico: String!
      sustento_logistico: String!
    ): Boolean!
    
    aprobarReutilizacion(serie_activo: String!): Boolean!
    
    # Nuevas mutaciones del Módulo de Usuarios
    createUser(username: String!, nombreCompleto: String!, rol: String!, agencias: [String!]!): String!
    updateUser(id: ID!, nombreCompleto: String!, rol: String!, activo: Boolean!, agencias: [String!]!): Boolean!
    resetUserPassword(id: ID!): String!

    # Nuevas mutaciones del Módulo de Asignaciones y Acta
    asignarActivoAgencia(
      numeroSerie: String!
      destinoFinal: String!
      destinatarioNombre: String!
      destinatarioCargo: String!
      jefeInmediatoNombre: String!
    ): Boolean!
    
    marcarActaFirmada(numeroSerie: String!): Boolean!

    # Nuevas mutaciones para Traslado de Equipos (CMDB & Logística)
    trasladarActivoAgencia(
      numeroSerie: String!
      destinoFinal: String!
      destinatarioNombre: String!
      destinatarioCargo: String!
      jefeInmediatoNombre: String!
    ): Boolean!

    trasladarActivoTaller(
      numeroSerie: String!
    ): Boolean!

    confirmarRecepcionTraslado(
      numeroSerie: String!
    ): Boolean!

    # Nueva mutación para Ingreso Simplificado
    registrarIngresoActivo(
      ubicacion_inicial: String!
      marca: String!
      modelo: String!
      tipo_equipo: String!
      numero_serie: String
      informacion_adicional: String
      factura_referencia: String
      factura_adjunto_b64: String
      factura_adjunto_mime: String
    ): ActivoTIC!

    updateActivo(
      id: ID!
      tipo_equipo: String!
      marca: String!
      modelo: String!
      numero_serie: String!
      ip_asignada: String
      informacion_adicional: String
    ): Boolean!

    # Nueva mutación para Registro de Uso de Insumos/Repuestos
    registrarUsoInsumo(
      skuCodigo: String!
      numeroSerieActivo: String!
      ubicacionDetalle: String!
      cantidad: Int!
    ): Boolean!

    # Nueva mutación para Ajuste de Inventario de Insumos/Repuestos
    ajustarStockInsumo(
      skuCodigo: String!
      cantidadNueva: Int!
      observacion: String!
    ): InsumoEconomato!

    # Mutación administrativa para depurar base de datos de pruebas (puesta en producción)
    limpiarDatosPrueba: Boolean!
    
    # Mutación administrativa para sembrar datos semilla (bajo demanda)
    sembrarDatosIniciales: Boolean!
  }
`;
