import { Schema, model, Document } from 'mongoose';

export interface IActivoTIC extends Document {
  numero_serie: string;
  tipo_equipo: string;
  marca: string;
  modelo: string;
  ip_asignada: string | null;
  nombre_estacion: string;
  usuario_red_asignado: string;
  nombre_usuario_final: string;
  fecha_registro_sistema: Date;
  ubicacion_agencia: string;
  activo_reemplazado_id?: string | null; // Referencia histórica autorreferencial (serie del equipo anterior)
  factura_referencia?: string | null;
  fecha_compra?: Date | null;
  factura_adjunto_b64?: string | null;
  factura_adjunto_mime?: string | null;
  
  // Nuevos campos de Asignación y Actas
  estado_asignacion: 'Asignado' | 'Pendiente de Asignación' | 'En Tránsito' | 'En Tránsito a Taller';
  ubicacion_inicial: 'Almacen-TIC' | 'Economato-Equipos' | 'Economato-InsRep';
  destino_final?: string | null;
  id_interno?: string | null;
  informacion_adicional?: string | null;
  acta_entrega?: {
    estado: 'No Aplica' | 'Pendiente de Firma' | 'Firmado y Devuelto';
    destinatario_nombre?: string | null;
    destinatario_cargo?: string | null;
    jefe_inmediato_nombre?: string | null;
    agencia_destino?: string | null;
    fecha_generacion?: Date | null;
    fecha_firma_recibida?: Date | null;
  } | null;
}

const ActivoTICSchema = new Schema<IActivoTIC>({
  numero_serie: { type: String, required: true, unique: true, index: true },
  tipo_equipo: { type: String, required: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  ip_asignada: { type: String, default: null },
  nombre_estacion: { type: String, required: true },
  usuario_red_asignado: { type: String, required: true },
  nombre_usuario_final: { type: String, required: true },
  fecha_registro_sistema: { type: Date, default: Date.now },
  ubicacion_agencia: { type: String, required: true },
  activo_reemplazado_id: { type: String, default: null },
  factura_referencia: { type: String, default: null },
  fecha_compra: { type: Date, default: null },
  factura_adjunto_b64: { type: String, default: null },
  factura_adjunto_mime: { type: String, default: null },
 
  // Nuevas propiedades
  estado_asignacion: { type: String, enum: ['Asignado', 'Pendiente de Asignación', 'En Tránsito', 'En Tránsito a Taller'], default: 'Pendiente de Asignación', index: true },
  ubicacion_inicial: { type: String, enum: ['Almacen-TIC', 'Economato-Equipos', 'Economato-InsRep'], required: true, default: 'Almacen-TIC' },
  destino_final: { type: String, default: null },
  id_interno: { type: String, unique: true, sparse: true, index: true },
  informacion_adicional: { type: String, default: null },
  acta_entrega: {
    estado: { type: String, enum: ['No Aplica', 'Pendiente de Firma', 'Firmado y Devuelto'], default: 'No Aplica' },
    destinatario_nombre: { type: String, default: null },
    destinatario_cargo: { type: String, default: null },
    jefe_inmediato_nombre: { type: String, default: null },
    agencia_destino: { type: String, default: null },
    fecha_generacion: { type: Date, default: null },
    fecha_firma_recibida: { type: Date, default: null }
  }
});

export const ActivoTIC = model<IActivoTIC>('ActivoTIC', ActivoTICSchema, 'activos_tic');

// Interface y Schema para Insumo Economato (Inventario/Repuestos)
export interface IInsumoEconomato extends Document {
  sku_codigo: string;
  ean_codigo: string;
  descripcion_articulo: string;
  categoria: 'Repuesto' | 'Insumo';
  cantidad_stock: number;
  unidad_medida: string;
  factura_referencia?: string | null;
}

const InsumoEconomatoSchema = new Schema<IInsumoEconomato>({
  sku_codigo: { type: String, required: true, unique: true, index: true },
  ean_codigo: { type: String, required: true, unique: true, index: true },
  descripcion_articulo: { type: String, required: true },
  categoria: { type: String, enum: ['Repuesto', 'Insumo'], required: true },
  cantidad_stock: { type: Number, required: true, min: 0 },
  unidad_medida: { type: String, required: true },
  factura_referencia: { type: String, default: null },
});

export const InsumoEconomato = model<IInsumoEconomato>('InsumoEconomato', InsumoEconomatoSchema, 'insumos_economato');

// Interface y Schema para Kardex / Movimiento de Activos TIC
export interface IMovimientoActivo extends Document {
  numero_serie: string;
  fecha_movimiento: Date;
  tipo_movimiento: 'Ingreso' | 'Transferencia' | 'Baja' | 'Renovación';
  agencia_origen?: string | null;
  agencia_destino: string;
  usuario_responsable: string;
  factura_referencia?: string | null;
  motivo_detalle: string;
}

const MovimientoActivoSchema = new Schema<IMovimientoActivo>({
  numero_serie: { type: String, required: true, index: true },
  fecha_movimiento: { type: Date, default: Date.now },
  tipo_movimiento: { type: String, enum: ['Ingreso', 'Transferencia', 'Baja', 'Renovación'], required: true },
  agencia_origen: { type: String, default: null },
  agencia_destino: { type: String, required: true },
  usuario_responsable: { type: String, required: true },
  factura_referencia: { type: String, default: null },
  motivo_detalle: { type: String, required: true },
});

export const MovimientoActivo = model<IMovimientoActivo>('MovimientoActivo', MovimientoActivoSchema, 'movimientos_activos');

// Interface y Schema para Kardex / Movimiento de Insumos/Repuestos del Economato
export interface IMovimientoInsumo extends Document {
  sku_codigo: string;
  ean_codigo: string;
  descripcion_articulo: string;
  fecha_movimiento: Date;
  tipo_movimiento: 'Ingreso' | 'Consumo' | 'Ajuste' | 'Asignación Técnico';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  usuario_responsable: string;
  tecnico_asignado?: string | null;
  numero_serie_activo?: string | null;
  ubicacion_agencia?: string | null;
  observacion?: string | null;
}

const MovimientoInsumoSchema = new Schema<IMovimientoInsumo>({
  sku_codigo: { type: String, required: true, index: true },
  ean_codigo: { type: String, required: true, index: true },
  descripcion_articulo: { type: String, required: true },
  fecha_movimiento: { type: Date, default: Date.now },
  tipo_movimiento: { type: String, enum: ['Ingreso', 'Consumo', 'Ajuste', 'Asignación Técnico'], required: true },
  cantidad: { type: Number, required: true },
  stock_anterior: { type: Number, required: true },
  stock_nuevo: { type: Number, required: true },
  usuario_responsable: { type: String, required: true },
  tecnico_asignado: { type: String, default: null },
  numero_serie_activo: { type: String, default: null },
  ubicacion_agencia: { type: String, default: null },
  observacion: { type: String, default: null }
});

export const MovimientoInsumo = model<IMovimientoInsumo>('MovimientoInsumo', MovimientoInsumoSchema, 'movimientos_insumos');
