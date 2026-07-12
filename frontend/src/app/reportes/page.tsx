'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  BarChart3, 
  HelpCircle,
  FileText,
  Activity,
  CheckCircle,
  Download,
  AlertTriangle,
  Building
} from 'lucide-react';

export default function ReportesPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [tickets, setTickets] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState(false);

  // Métricas calculadas
  const [mttr, setMttr] = useState<string>('0h');
  const [fcrRate, setFcrRate] = useState<string>('0%');
  const [slaCompliance, setSlaCompliance] = useState<string>('100%');
  const [ticketsPorEstado, setTicketsPorEstado] = useState<Record<string, number>>({});
  const [ticketsPorPrioridad, setTicketsPorPrioridad] = useState<Record<string, number>>({});
  const [activosPorUbicacion, setActivosPorUbicacion] = useState<Record<string, number>>({});

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
              listTickets {
                id
                key
                prioridad
                status
                fecha_creacion
                fecha_resolucion
                agencia_id
              }
              listActivosCMDB {
                id
                estado_asignacion
                ubicacion_agencia
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.data) {
        const ticketList = data.data.listTickets || [];
        const activosList = data.data.listActivosCMDB || [];
        setTickets(ticketList);
        setActivos(activosList);
        calcularMetricasITIL(ticketList, activosList);
      }
    } catch (err) {
      console.error('Error al cargar datos en reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricasITIL = (ticketList: any[], activosList: any[]) => {
    // 1. MTTR (Mean Time to Resolution)
    let totalTime = 0;
    let resolvedCount = 0;

    ticketList.forEach(t => {
      if (t.fecha_resolucion && t.fecha_creacion) {
        const start = new Date(Number(t.fecha_creacion) || t.fecha_creacion);
        const end = new Date(Number(t.fecha_resolucion) || t.fecha_resolucion);
        const diff = end.getTime() - start.getTime(); // milisegundos
        if (diff > 0) {
          totalTime += diff;
          resolvedCount++;
        }
      }
    });

    if (resolvedCount > 0) {
      const avgMs = totalTime / resolvedCount;
      const hours = Math.round(avgMs / (1000 * 60 * 60));
      setMttr(`${hours}h`);
    } else {
      setMttr('N/A');
    }

    // 2. FCR Rate (First Contact Resolution)
    // Supongamos que incidencias de prioridad "Baja" o resueltas en contingencia representan FCR
    // En este contexto, calcularemos tickets resueltos directamente sin derivar a taller.
    const resolvedDirectly = ticketList.filter(t => t.status === 'Done').length;
    const fcr = ticketList.length > 0 ? Math.round((resolvedDirectly / ticketList.length) * 100) : 0;
    setFcrRate(`${fcr}%`);

    // 3. SLA Compliance (SLA objetivo de 48h para tickets que no sean de taller)
    let metSla = 0;
    let totalEligible = 0;
    ticketList.forEach(t => {
      if (t.fecha_resolucion && t.fecha_creacion) {
        const start = new Date(Number(t.fecha_creacion) || t.fecha_creacion);
        const end = new Date(Number(t.fecha_resolucion) || t.fecha_resolucion);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalEligible++;
        if (diffHours <= 48) {
          metSla++;
        }
      }
    });
    const sla = totalEligible > 0 ? Math.round((metSla / totalEligible) * 100) : 100;
    setSlaCompliance(`${sla}%`);

    // 4. Agrupamiento por Estado
    const estados: Record<string, number> = {};
    ticketList.forEach(t => {
      estados[t.status] = (estados[t.status] || 0) + 1;
    });
    setTicketsPorEstado(estados);

    // 5. Agrupamiento por Prioridad
    const prioridades: Record<string, number> = {};
    ticketList.forEach(t => {
      prioridades[t.prioridad] = (prioridades[t.prioridad] || 0) + 1;
    });
    setTicketsPorPrioridad(prioridades);

    // 6. Agrupamiento de Activos por Ubicación
    const ubicaciones: Record<string, number> = {};
    activosList.forEach(a => {
      const loc = a.ubicacion_agencia || 'Sin Ubicación';
      ubicaciones[loc] = (ubicaciones[loc] || 0) + 1;
    });
    setActivosPorUbicacion(ubicaciones);
  };

  const handleDescargarExcel = async () => {
    setDescargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/reports/download`, {
        method: 'GET',
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (res.status === 401) {
        alert('Sesión no válida o privilegios insuficientes.');
        return;
      }

      if (!res.ok) {
        throw new Error('No se pudo generar el archivo de reporte en el servidor.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productividad_itil_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al descargar el archivo: ${err.message}`);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-blue-400" /> Reportes de Gestión e Incidencias ITIL
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Métricas clave de acuerdos de niveles de servicio (SLA), incidentes y rendimiento de la Mesa de Ayuda de Caja Tacna.
          </p>
        </div>
      </div>

      {/* SLA Gauges & Métricas ITIL */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MTTR */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiempo Promedio de Solución</span>
            <h3 className="text-2xl font-bold text-white">MTTR de Incidentes</h3>
            <p className="text-xs text-slate-400">Target corporativo: &lt; 24h</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-850 h-20 w-20">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-lg font-extrabold text-cyan-400 mt-1">{loading ? '...' : mttr}</span>
          </div>
        </div>

        {/* FCR Rate */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasa de Resolución Directa</span>
            <h3 className="text-2xl font-bold text-white">First Contact Resolution</h3>
            <p className="text-xs text-slate-400">Target corporativo: &gt; 80%</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-850 h-20 w-20">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-extrabold text-emerald-400 mt-1">{loading ? '...' : fcrRate}</span>
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cumplimiento del Acuerdo SLA</span>
            <h3 className="text-2xl font-bold text-white">Disponibilidad SLA</h3>
            <p className="text-xs text-slate-400">Límite regulatorio: 95.0%</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-850 h-20 w-20">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-lg font-extrabold text-blue-400 mt-1">{loading ? '...' : slaCompliance}</span>
          </div>
        </div>
      </section>

      {/* Grid de Reportes Detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reporte 1: Estado de Incidentes */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Estados de Solicitudes
          </h2>
          <p className="text-xs text-slate-400">Total de tickets y estados logísticos de la Mesa de Ayuda.</p>
          
          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse">Cargando métricas...</div>
          ) : (
            <div className="space-y-3">
              {['To Do', 'In Progress', 'En Tránsito a Taller', 'Done'].map(status => {
                const count = ticketsPorEstado[status] || 0;
                const total = tickets.length || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={status} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{status}</span>
                      <span className="font-mono text-slate-400 font-bold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          status === 'Done' ? 'bg-green-500' :
                          status === 'In Progress' ? 'bg-blue-500' :
                          status === 'En Tránsito a Taller' ? 'bg-amber-500' : 'bg-slate-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reporte 2: Volumen de Incidentes por Prioridad */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" /> Criticidad / Prioridad
          </h2>
          <p className="text-xs text-slate-400">Distribución de incidentes según criticidad registrada.</p>

          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse">Cargando métricas...</div>
          ) : (
            <div className="space-y-3">
              {['Alta', 'Media', 'Baja'].map(prio => {
                const count = ticketsPorPrioridad[prio] || 0;
                const total = tickets.length || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={prio} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        prio === 'Alta' ? 'bg-red-500' :
                        prio === 'Media' ? 'bg-amber-500' : 'bg-slate-400'
                      }`} />
                      <span className="font-bold text-slate-200">{prio}</span>
                    </div>
                    <span className="font-mono text-slate-400 font-bold">{count} Tickets</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reporte 3: Descarga de Documentos Excel */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" /> Exportar Datos ITIL S.A.
            </h2>
            <p className="text-xs text-slate-400">
              Descarga la hoja de cálculo unificada en formato Excel `.xlsx` formateada según los estándares de Contraloría del sector público peruano.
            </p>
            <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] text-slate-500 space-y-1">
              <p>✔ Cuentas de Nombre y Apellidos formateadas en mayúsculas.</p>
              <p>✔ Cabeceras celestes institucionales según manual de marca.</p>
              <p>✔ Resúmenes de fallas y claves de incidentes en cascada.</p>
            </div>
          </div>

          <button
            onClick={handleDescargarExcel}
            disabled={descargando || loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-650 text-white transition shadow-lg shadow-blue-600/10"
          >
            {descargando ? 'Generando Excel...' : (
              <>
                <FileSpreadsheet className="w-4 h-4" /> Descargar Excel de Productividad
              </>
            )}
          </button>
        </div>

      </div>

      {/* Auditoría Rápida de SLA por Sedes */}
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-400" /> Distribución de Equipamiento en Sedes
        </h2>
        <p className="text-xs text-slate-400">Cantidad total de dispositivos declarados y custodiados en cada agencia de la Caja Tacna.</p>

        {loading ? (
          <div className="text-xs text-slate-500 animate-pulse">Analizando ubicaciones...</div>
        ) : Object.keys(activosPorUbicacion).length === 0 ? (
          <p className="text-xs text-slate-500 italic">No hay registros de equipamiento.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(activosPorUbicacion).map(([loc, count]) => (
              <div key={loc} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-350 truncate pr-2 max-w-[120px]">{loc}</span>
                <span className="font-mono text-blue-400 font-bold">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
