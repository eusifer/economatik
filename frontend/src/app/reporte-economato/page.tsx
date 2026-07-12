'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Download, 
  Sliders, 
  UserPlus, 
  Search, 
  RefreshCw, 
  AlertOctagon, 
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface MovimientoInsumo {
  id: string;
  sku_codigo: string;
  ean_codigo: string;
  descripcion_articulo: string;
  fecha_movimiento: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  usuario_responsable: string;
  tecnico_asignado: string | null;
  numero_serie_activo: string | null;
  ubicacion_agencia: string | null;
  observacion: string | null;
}

interface InsumoItem {
  sku_codigo: string;
  ean_codigo: string;
  descripcion_articulo: string;
  categoria: string;
  cantidad_stock: number;
  unidad_medida: string;
}

interface UserAccount {
  id: string;
  username: string;
  nombre_completo: string;
}

export default function ReporteEconomatoPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  // Datos
  const [movimientos, setMovimientos] = useState<MovimientoInsumo[]>([]);
  const [insumos, setInsumos] = useState<InsumoItem[]>([]);
  const [tecnicos, setTecnicos] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mensajeOk, setMensajeOk] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // Modales/Formularios
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);

  // Formulario Ajuste
  const [ajustarSku, setAjustarSku] = useState('');
  const [ajustarCantidad, setAjustarCantidad] = useState(0);
  const [ajustarObservacion, setAjustarObservacion] = useState('');

  // Formulario Asignación
  const [asignarEan, setAsignarEan] = useState('');
  const [asignarTecnicoId, setAsignarTecnicoId] = useState('');
  
  // Búsqueda
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            query {
              listMovimientosInsumos {
                id
                sku_codigo
                ean_codigo
                descripcion_articulo
                fecha_movimiento
                tipo_movimiento
                cantidad
                stock_anterior
                stock_nuevo
                usuario_responsable
                tecnico_asignado
                numero_serie_activo
                ubicacion_agencia
                observacion
              }
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                unidad_medida
              }
              listTecnicos {
                id
                username
                nombre_completo
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.data) {
        setMovimientos(data.data.listMovimientosInsumos || []);
        setInsumos(data.data.listInsumos || []);
        setTecnicos(data.data.listTecnicos || []);
      }
    } catch (err) {
      console.error('Error al cargar datos del reporte:', err);
    } finally {
      setLoading(false);
    }
  };

  // Exportar Excel
  const exportarExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/reports/economato`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_economato_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Error al descargar el reporte de economato.');
      }
    } catch (err) {
      console.error('Error al exportar Excel:', err);
    }
  };

  // Enviar Ajuste de Inventario
  const handleAjustarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustarSku || ajustarCantidad < 0 || !ajustarObservacion.trim()) {
      setMensajeError('Por favor, complete todos los campos de ajuste.');
      return;
    }

    setSubmitting(true);
    setMensajeError('');
    setMensajeOk('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation {
              ajustarStockInsumo(
                skuCodigo: "${ajustarSku}",
                cantidadNueva: ${ajustarCantidad},
                observacion: "${ajustarObservacion}"
              ) {
                sku_codigo
                cantidad_stock
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.errors) {
        setMensajeError(data.errors[0].message);
      } else {
        setMensajeOk('Ajuste de inventario aplicado y auditado con éxito.');
        setAjustarSku('');
        setAjustarCantidad(0);
        setAjustarObservacion('');
        setShowAjusteModal(false);
        cargarDatos();
      }
    } catch (err) {
      console.error(err);
      setMensajeError('Error de red al aplicar ajuste.');
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar Asignación a Técnico (Salida a Custodia)
  const handleAsignarTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asignarEan || !asignarTecnicoId) {
      setMensajeError('Debe seleccionar el insumo y el técnico.');
      return;
    }

    setSubmitting(true);
    setMensajeError('');
    setMensajeOk('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation {
              abrirComisionViaje(
                tecnicoId: "${asignarTecnicoId}",
                eanCodigos: ["${asignarEan}"]
              ) {
                id
                ean_codigo
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.errors) {
        setMensajeError(data.errors[0].message);
      } else {
        setMensajeOk('Insumo asignado al técnico y stock total descontado correctamente.');
        setAsignarEan('');
        setAsignarTecnicoId('');
        setShowAsignarModal(false);
        cargarDatos();
      }
    } catch (err) {
      console.error(err);
      setMensajeError('Error de red al asignar insumo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado reactivo de movimientos
  const movimientosFiltrados = movimientos.filter(m => 
    m.descripcion_articulo.toLowerCase().includes(filtro.toLowerCase()) ||
    m.sku_codigo.toLowerCase().includes(filtro.toLowerCase()) ||
    m.ean_codigo.toLowerCase().includes(filtro.toLowerCase()) ||
    m.tipo_movimiento.toLowerCase().includes(filtro.toLowerCase()) ||
    (m.tecnico_asignado && m.tecnico_asignado.toLowerCase().includes(filtro.toLowerCase())) ||
    (m.numero_serie_activo && m.numero_serie_activo.toLowerCase().includes(filtro.toLowerCase())) ||
    (m.ubicacion_agencia && m.ubicacion_agencia.toLowerCase().includes(filtro.toLowerCase()))
  );

  // Advertencias de Insumos Agotados (Stock 0)
  const agotados = insumos.filter(i => i.cantidad_stock === 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/40">
            Mapeo Mensual & Kardex
          </span>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" /> Reporte de Usos y Stock - Economato
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualice el flujo mensual de ingresos, consumos directos, asignación de repuestos a técnicos de campo y auditorías de inventario.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAjusteModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            Ajuste de Inventario
          </button>

          <button
            type="button"
            onClick={() => setShowAsignarModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Asignar a Técnico
          </button>

          <button
            type="button"
            onClick={exportarExcel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-900/20"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Alertas Globales de stock */}
      {mensajeOk && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-900/50 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {mensajeOk}
        </div>
      )}
      {mensajeError && (
        <div className="p-3 bg-red-950/60 border border-red-900/50 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4" /> {mensajeError}
        </div>
      )}

      {/* Grid Resúmenes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alerta stock crítico */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas de Abastecimiento Crítico
            </h3>
            <p className="text-[11px] text-slate-500">Insumos que han alcanzado stock cero. Se recomienda emitir una solicitud de compra inmediata a la Jefatura.</p>
          </div>
          
          {agotados.length === 0 ? (
            <div className="mt-4 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg flex items-center gap-2">
              ✅ Todos los insumos del Economato cuentan con existencias disponibles en stock.
            </div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto pr-1">
              {agotados.map(i => (
                <div key={i.sku_codigo} className="flex justify-between items-center bg-red-950/20 border border-red-900/40 p-2.5 rounded-lg text-xs">
                  <div className="font-bold text-red-300">
                    {i.descripcion_articulo}
                  </div>
                  <span className="text-[9px] font-bold text-red-400 font-mono border border-red-900/80 px-2 py-0.5 rounded bg-red-950">
                    AGOTADO - SOLICITAR COMPRA
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen General */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" /> Flujo Total Auditado
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Insumos Tipificados</span>
              <strong className="text-2xl text-white font-mono">{insumos.length}</strong>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Movimientos Log</span>
              <strong className="text-2xl text-blue-400 font-mono">{movimientos.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Movimientos */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            📊 Historial de Trazabilidad Dinámica
          </h2>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar por insumo, responsable, técnico, serie, agencia..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-950 text-white rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 animate-pulse text-xs">
            Cargando historial de movimientos del Economato...
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="p-12 text-center border border-slate-850 bg-slate-950/20 text-slate-500 italic text-xs rounded-xl">
            No se han registrado movimientos de insumos que coincidan con los criterios.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950">
            <table className="w-full text-[11px] text-slate-350 text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Insumo</th>
                  <th className="p-3">Tipo Mov.</th>
                  <th className="p-3 text-center">Cant.</th>
                  <th className="p-3 text-center">Stock Prev.</th>
                  <th className="p-3 text-center">Nuevo Stock</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Téc. Asignado</th>
                  <th className="p-3">Destino (Serie / Sede)</th>
                  <th className="p-3">Detalle / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {movimientosFiltrados.map((m) => {
                  let badgeColor = 'bg-slate-900 text-slate-400 border-slate-800';
                  if (m.tipo_movimiento === 'Ingreso') badgeColor = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50';
                  if (m.tipo_movimiento === 'Consumo') badgeColor = 'bg-red-950/40 text-red-400 border-red-900/50';
                  if (m.tipo_movimiento === 'Ajuste') badgeColor = 'bg-purple-950/40 text-purple-400 border-purple-900/50';
                  if (m.tipo_movimiento === 'Asignación Técnico') badgeColor = 'bg-blue-950/40 text-blue-400 border-blue-900/50';

                  return (
                    <tr key={m.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(m.fecha_movimiento).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="text-white font-bold block">{m.descripcion_articulo}</span>
                        <span className="text-[9px] font-mono text-slate-500">EAN: {m.ean_codigo}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-white">
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">{m.stock_anterior}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-200">{m.stock_nuevo}</td>
                      <td className="p-3 text-slate-400 font-mono">{m.usuario_responsable}</td>
                      <td className="p-3 text-slate-400">{m.tecnico_asignado || '-'}</td>
                      <td className="p-3">
                        {m.numero_serie_activo && (
                          <span className="text-[10px] font-mono text-blue-400 block">S/N: {m.numero_serie_activo}</span>
                        )}
                        {m.ubicacion_agencia && (
                          <span className="text-[9px] text-slate-400 block">{m.ubicacion_agencia}</span>
                        )}
                        {!m.numero_serie_activo && !m.ubicacion_agencia && <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-3 text-slate-500 italic max-w-[150px] truncate" title={m.observacion || ''}>
                        {m.observacion || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ajuste Stock */}
      {showAjusteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              ⚙️ Ajuste Físico de Inventario (Auditoría)
            </h3>
            <p className="text-xs text-slate-400">Regularice el stock físico de un insumo o repuesto en la CMDB. Toda variación quedará registrada en el Kardex.</p>
            
            <form onSubmit={handleAjustarStock} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Insumo a Ajustar</label>
                <select
                  value={ajustarSku}
                  onChange={(e) => {
                    setAjustarSku(e.target.value);
                    const selected = insumos.find(i => i.sku_codigo === e.target.value);
                    if (selected) setAjustarCantidad(selected.cantidad_stock);
                  }}
                  className="w-full text-xs bg-slate-950 text-white p-2.5 rounded border border-slate-800 focus:outline-none"
                  required
                >
                  <option value="">Seleccione el insumo...</option>
                  {insumos.map(i => (
                    <option key={i.sku_codigo} value={i.sku_codigo}>
                      {i.descripcion_articulo} (Stock actual: {i.cantidad_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nuevo Stock Real</label>
                <input
                  type="number"
                  min="0"
                  value={ajustarCantidad}
                  onChange={(e) => setAjustarCantidad(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 text-white p-2.5 rounded border border-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Motivo del Ajuste (Observación)</label>
                <textarea
                  placeholder="Ej: Mal conteo en inventario anual, error en registro anterior, etc."
                  value={ajustarObservacion}
                  onChange={(e) => setAjustarObservacion(e.target.value)}
                  className="w-full text-xs bg-slate-950 text-white p-2.5 rounded border border-slate-800 focus:outline-none h-20"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAjusteModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
                >
                  {submitting ? 'Ajustando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Técnico */}
      {showAsignarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              👤 Asignar Insumo/Repuesto a Técnico de Campo
            </h3>
            <p className="text-xs text-slate-400">Asigne un insumo (ej: Alcohol Isopropílico) a un técnico. El stock total se descontará y pasará a su custodia "En Ruta".</p>
            
            <form onSubmit={handleAsignarTecnico} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Insumo / Repuesto</label>
                <select
                  value={asignarEan}
                  onChange={(e) => setAsignarEan(e.target.value)}
                  className="w-full text-xs bg-slate-950 text-white p-2.5 rounded border border-slate-800 focus:outline-none"
                  required
                >
                  <option value="">Seleccione el insumo...</option>
                  {insumos.filter(i => i.cantidad_stock > 0).map(i => (
                    <option key={i.ean_codigo} value={i.ean_codigo}>
                      {i.descripcion_articulo} (Disponible: {i.cantidad_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Técnico Destinatario</label>
                <select
                  value={asignarTecnicoId}
                  onChange={(e) => setAsignarTecnicoId(e.target.value)}
                  className="w-full text-xs bg-slate-950 text-white p-2.5 rounded border border-slate-800 focus:outline-none"
                  required
                >
                  <option value="">Seleccione el técnico...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAsignarModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition"
                >
                  {submitting ? 'Asignando...' : 'Asignar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
