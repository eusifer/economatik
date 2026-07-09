import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  enum Rol {
    administrador
    tecnico
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
    regularizarCustodia(tecnicoId: ID!, eanCodigo: String!, estado: String!): Boolean!

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
  }
`;
