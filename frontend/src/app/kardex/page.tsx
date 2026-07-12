'use client';

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  RefreshCw,
  Cpu,
  Layers,
  FileCheck,
  User,
  MapPin,
  ClipboardList,
  ArrowRight
} from 'lucide-react';

interface Movimiento {
  id: string;
  numero_serie: string;
  fecha_movimiento: string;
  tipo_movimiento: 'Ingreso' | 'Transferencia' | 'Baja' | 'Renovación';
  agencia_origen?: string | null;
  agencia_destino: string;
  usuario_responsable: string;
  factura_referencia?: string | null;
  motivo_detalle: string;
}

interface ActivoDetalle {
  id: string;
  numero_serie: string;
  tipo_equipo: string;
  marca: string;
  modelo: string;
  ip_asignada?: string | null;
  nombre_estacion: string;
  usuario_red_asignado: string;
  nombre_usuario_final: string;
  fecha_registro_sistema: string;
  ubicacion_agencia: string;
  estado_asignacion: string;
  ubicacion_inicial: string;
  factura_referencia?: string | null;
  factura_adjunto_b64?: string | null;
  factura_adjunto_mime?: string | null;
  acta_entrega?: {
    estado: string;
    destinatario_nombre?: string | null;
  } | null;
}

export default function KardexPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const [serieBusqueda, setSerieBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [activo, setActivo] = useState<ActivoDetalle | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [searched, setSearched] = useState(false);

  const consultarKardex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serieBusqueda.trim()) return;

    setLoading(true);
    setSearched(true);
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
            query GetKardexDetail($serie: String!) {
              searchActivo(query: $serie) {
                id
                numero_serie
                tipo_equipo
                marca
                modelo
                ip_asignada
                nombre_estacion
                usuario_red_asignado
                nombre_usuario_final
                fecha_registro_sistema
                ubicacion_agencia
                estado_asignacion
                ubicacion_inicial
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
                acta_entrega {
                  estado
                  destinatario_nombre
                }
              }
              getKardexActivo(serie: $serie) {
                id
                numero_serie
                fecha_movimiento
                tipo_movimiento
                agencia_origen
                agencia_destino
                usuario_responsable
                factura_referencia
                motivo_detalle
              }
            }
          `,
          variables: { serie: serieBusqueda.trim() }
        })
      });

      const data = await res.json();
      if (data.data) {
        setActivo(data.data.searchActivo || null);
        setMovimientos(data.data.getKardexActivo || []);
      } else {
        setActivo(null);
        setMovimientos([]);
      }
    } catch (err) {
      console.error(err);
      setActivo(null);
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  const descargarKardexConsolidado = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debe iniciar una sesión simulada en el inicio para descargar el reporte.');
        return;
      }

      const res = await fetch(`${backendUrl}/api/reports/kardex`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "kardex_consolidado_activos.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err: any) {
      alert(`Error de descarga: ${err.message}`);
    }
  };

  const descargarPdfFactura = (b64: string, mime: string, filename: string) => {
    try {
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'factura.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al descargar factura: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-8 h-8 text-blue-400" /> Kardex Logístico y Trazabilidad de Activos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Consulte la línea de tiempo completa, comprobantes, asignaciones y traslados de cualquier hardware en la CMDB.
          </p>
        </div>
        <div>
          <button
            onClick={descargarKardexConsolidado}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 transition flex items-center gap-1.5 shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Descargar Kardex Consolidado (Excel)
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <form onSubmit={consultarKardex} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <div className="relative flex-1">
            <input
              type="text"
              required
              placeholder="Ingrese Número de Serie (Ej. HP-8877 o Lenovo-Monitor)"
              value={serieBusqueda}
              onChange={(e) => setSerieBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Buscando...
              </>
            ) : (
              'Consultar Kardex'
            )}
          </button>
        </form>
      </div>

      {/* Resultados */}
      {searched && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Detalles del Activo (Col 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" /> Información Técnica Actual
              </h2>

              {!activo ? (
                <div className="p-6 border border-slate-850 rounded-xl bg-slate-950/20 text-center text-xs text-slate-500 italic">
                  El activo no está registrado en la base de datos de inventario. Consulte por su serie en caliente.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ficha */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">{activo.tipo_equipo}</span>
                      <h3 className="text-sm font-bold text-white">{activo.marca} - {activo.modelo}</h3>
                    </div>

                    <div className="divide-y divide-slate-850 text-xs text-slate-400 pt-2">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-semibold">Número de Serie:</span>
                        <span className="font-mono text-white font-bold">{activo.numero_serie}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-semibold">Host / Estación:</span>
                        <span className="font-mono text-slate-200">{activo.nombre_estacion}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-semibold">Dirección IP:</span>
                        <span className="font-mono text-slate-200">{activo.ip_asignada || 'Dinámica / Sin IP'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-semibold">Ubicación / Agencia:</span>
                        <span className="text-white font-bold">{activo.ubicacion_agencia}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-semibold">Estado Operativo:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          activo.estado_asignacion === 'Asignado' ? 'bg-emerald-950 text-emerald-400' :
                          activo.estado_asignacion === 'En Tránsito' ? 'bg-amber-950 text-amber-400 animate-pulse' :
                          activo.estado_asignacion === 'En Tránsito a Taller' ? 'bg-rose-950 text-rose-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {activo.estado_asignacion}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Factura Adjunta */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" /> Datos de Adquisición
                    </h4>
                    {activo.factura_referencia ? (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-400">
                          <span className="text-slate-500 font-semibold">Factura Ref:</span>{' '}
                          <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{activo.factura_referencia}</span>
                        </div>
                        {activo.factura_adjunto_b64 ? (
                          <button
                            type="button"
                            onClick={() => descargarPdfFactura(activo.factura_adjunto_b64!, activo.factura_adjunto_mime || 'application/pdf', `factura_${activo.factura_referencia}.pdf`)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/40 text-blue-400 rounded-lg border border-blue-900/30 text-xs font-bold transition"
                          >
                            <Download className="w-3.5 h-3.5" /> Descargar Factura PDF Original
                          </button>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">No se adjuntó archivo digital en la compra.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Sin datos de factura comercial asociados.</p>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Línea de Tiempo (Col 7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" /> Línea de Tiempo de Movimientos
              </h2>

              {movimientos.length === 0 ? (
                <div className="p-8 text-center border border-slate-850 rounded-xl bg-slate-950/20 text-slate-500 italic text-xs">
                  No se encontraron trazas o movimientos para la serie consultada en el Kardex.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6 py-2">
                  {movimientos.map((mov) => {
                    const esIngreso = mov.tipo_movimiento === 'Ingreso';
                    const esTraslado = mov.tipo_movimiento === 'Transferencia';
                    const esRenovacion = mov.tipo_movimiento === 'Renovación';
                    const esBaja = mov.tipo_movimiento === 'Baja';

                    return (
                      <div key={mov.id} className="relative">
                        {/* Viñeta de la Línea de Tiempo */}
                        <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-slate-950 ${
                          esIngreso ? 'border-emerald-500 text-emerald-500' :
                          esTraslado ? 'border-blue-500 text-blue-500' :
                          esBaja ? 'border-red-500 text-red-500' :
                          'border-purple-500 text-purple-500'
                        }`} />

                        {/* Contenido */}
                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3 hover:border-slate-800 transition">
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              esIngreso ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                              esTraslado ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
                              esBaja ? 'bg-red-950 text-red-400 border border-red-900/30' :
                              'bg-purple-950 text-purple-400 border border-purple-900/30'
                            }`}>
                              {mov.tipo_movimiento.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">
                              {new Date(isNaN(Number(mov.fecha_movimiento)) ? mov.fecha_movimiento : Number(mov.fecha_movimiento)).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 font-medium">
                            {mov.motivo_detalle}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">Destino</span>
                                <span className="font-semibold text-slate-350">
                                  {mov.agencia_origen ? `${mov.agencia_origen} ➔ ` : ''}{mov.agencia_destino}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">Responsable</span>
                                <span className="font-mono text-slate-350 font-bold">{mov.usuario_responsable}</span>
                              </div>
                            </div>
                          </div>

                          {/* Acciones del Movimiento (Ver Comprobante / Acta) */}
                          <div className="pt-2 border-t border-slate-900 flex justify-end">
                            {esIngreso && activo?.factura_adjunto_b64 ? (
                              <button
                                type="button"
                                onClick={() => descargarPdfFactura(activo.factura_adjunto_b64!, activo.factura_adjunto_mime || 'application/pdf', `factura_${mov.factura_referencia || 'compra'}.pdf`)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded border border-slate-800 text-[10px] font-bold transition"
                              >
                                <Download className="w-3 h-3" /> Ver Comprobante Factura
                              </button>
                            ) : (esTraslado || esRenovacion) ? (
                              <button
                                type="button"
                                onClick={() => window.open(`/acta?serie=${mov.numero_serie}`, '_blank')}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded border border-slate-800 text-[10px] font-bold transition"
                              >
                                <ArrowRight className="w-3 h-3" /> Ver Acta / Cargo (PDF)
                              </button>
                            ) : mov.factura_referencia ? (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Documento Ref: <span className="text-slate-300 font-bold">{mov.factura_referencia}</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-650 italic">Sin comprobante adicional</span>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
