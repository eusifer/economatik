import { Schema, model, Document } from 'mongoose';

// Interface y Schema para Activo TIC (CMDB Dinámica)
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
