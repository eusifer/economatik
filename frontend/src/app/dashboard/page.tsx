'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Layers, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Server, 
  Printer, 
  HelpCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export default function DashboardPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'auditoria'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditResults, setAuditResults] = useState<{
    ipConflicts: any[];
    orphanedTransit: any[];
    missingSeries: any[];
    prolongedWorkshop: any[];
    okCount: number;
  }>({
    ipConflicts: [],
    orphanedTransit: [],
    missingSeries: [],
    prolongedWorkshop: [],
    okCount: 0
  });

  useEffect(() => {
    cargarActivos();
  }, []);

  const cargarActivos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              listActivosCMDB {
                id
                numero_serie
                tipo_equipo
                marca
                modelo
                ip_asignada
                nombre_estacion
                ubicacion_agencia
                estado_asignacion
                fecha_registro_sistema
                id_interno
                acta_entrega {
                  estado
                  destinatario_nombre
                  destinatario_cargo
                }
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listActivosCMDB) {
        const list = data.data.listActivosCMDB;
        setActivos(list);
        ejecutarAuditoria(list);
      }
    } catch (err) {
      console.error('Error al cargar activos en dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarAuditoria = (list: any[]) => {
    // 1. IPs Duplicadas
    const ipMap = new Map<string, any[]>();
    list.forEach(a => {
      if (a.ip_asignada && a.ip_asignada.trim() !== '') {
        const ip = a.ip_asignada.trim();
        if (!ipMap.has(ip)) {
          ipMap.set(ip, []);
        }
        ipMap.get(ip)!.push(a);
      }
    });
    const ipConflicts: any[] = [];
    ipMap.forEach((assets, ip) => {
      if (assets.length > 1) {
        ipConflicts.push({ ip, assets });
      }
    });

    // 2. Tránsito Huérfano (En Tránsito pero sin destinatario registrado)
    const orphanedTransit = list.filter(a => 
      (a.estado_asignacion === 'En Tránsito' || a.estado_asignacion === 'En Tránsito a Taller') &&
      (!a.acta_entrega || !a.acta_entrega.destinatario_nombre) &&
      a.destino_final !== 'Taller'
    );

    // 3. Identificadores faltantes / vacíos o temporales genéricos
    const missingSeries = list.filter(a => 
      !a.numero_serie || 
      a.numero_serie.trim() === '' || 
      a.numero_serie.toLowerCase().includes('temporal') ||
      a.numero_serie.toLowerCase().includes('xxxx')
    );

    // 4. Equipos en soporte/taller prolongado (más de 30 días en Almacen-TIC con estado Pendiente de Asignación)
    const prolongedWorkshop = list.filter(a => {
      if (a.ubicacion_agencia === 'Almacen-TIC' && a.estado_asignacion === 'Pendiente de Asignación') {
        const fechaReg = new Date(Number(a.fecha_registro_sistema) || a.fecha_registro_sistema);
        const dias = (Date.now() - fechaReg.getTime()) / (1000 * 60 * 60 * 24);
        return dias > 30;
      }
      return false;
    });

    let okCount = list.length - (ipConflicts.length + orphanedTransit.length + missingSeries.length + prolongedWorkshop.length);
    if (okCount < 0) okCount = 0;

    setAuditResults({
      ipConflicts,
      orphanedTransit,
      missingSeries,
      prolongedWorkshop,
      okCount
    });
  };

  // Agrupamiento de stock por agencia
  const obtenerAgrupadoPorAgencia = () => {
    const agenciasMap: Record<string, Record<string, { count: number; marca: string; modelo: string; tipo: string }[]>> = {};

    activos.forEach(a => {
      const agencia = a.ubicacion_agencia || 'Sin Ubicación';
      const key = `${a.tipo_equipo}-${a.marca}-${a.modelo}`.toUpperCase();

      if (!agenciasMap[agencia]) {
        agenciasMap[agencia] = {};
      }

      if (!agenciasMap[agencia][key]) {
        agenciasMap[agencia][key] = [];
      }

      const existing = agenciasMap[agencia][key];
      const match = existing.find(x => x.marca === a.marca && x.modelo === a.modelo && x.tipo === a.tipo_equipo);
      if (match) {
        match.count += 1;
      } else {
        existing.push({
          count: 1,
          marca: a.marca,
          modelo: a.modelo,
          tipo: a.tipo_equipo
        });
      }
    });

    return agenciasMap;
  };

  const agenciasAgrupadas = obtenerAgrupadoPorAgencia();
  const nombresAgencias = Object.keys(agenciasAgrupadas).sort();

  // Filtrado de agencias por búsqueda
  const agenciasFiltradas = nombresAgencias.filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-400" /> Monitoreo y Auditoría de Stock CMDB
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Análisis consolidado de hardware por sedes de la Caja Tacna e identificación automatizada de inconsistencias ITIL.
          </p>
        </div>
        <button
          onClick={cargarActivos}
          className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refrescar Análisis
        </button>
      </div>

      {/* Tarjetas Resumen KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sedes con Activos</div>
          <div className="text-3xl font-bold text-white mt-1.5">{nombresAgencias.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Ubicaciones activas en CMDB</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Equipos Inventariados</div>
          <div className="text-3xl font-bold text-blue-400 mt-1.5">{activos.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Hardware físico registrado</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inconsistencias Críticas</div>
          <div className="text-3xl font-bold text-red-500 mt-1.5">
            {auditResults.ipConflicts.length + auditResults.orphanedTransit.length + auditResults.missingSeries.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Requieren atención / regularización</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activos en Estado Saludable</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1.5">{auditResults.okCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Libre de observaciones</div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="border-b border-slate-850 flex gap-4">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 text-sm font-bold border-b-2 transition focus:outline-none ${
            activeTab === 'stock'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          📦 Consolidado de Stock por Agencia
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-3 text-sm font-bold border-b-2 transition focus:outline-none flex items-center gap-1.5 ${
            activeTab === 'auditoria'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Auditoría de Inconsistencias CMDB
          {(auditResults.ipConflicts.length + auditResults.orphanedTransit.length + auditResults.missingSeries.length) > 0 && (
            <span className="bg-red-950 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-900/30">
              {auditResults.ipConflicts.length + auditResults.orphanedTransit.length + auditResults.missingSeries.length}
            </span>
          )}
        </button>
      </div>

      {/* Panel 1: Consolidad de Stock por Sede */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Barra de Búsqueda */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar agencia (ej: San Martin, Cayma)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 animate-pulse text-xs">Cargando métricas de sedes...</div>
          ) : agenciasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs border border-slate-850 rounded-2xl bg-slate-900/10">
              No se encontraron sedes coincidentes con la búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agenciasFiltradas.map((agencia) => {
                const groups = agenciasAgrupadas[agencia];
                const itemsList = Object.values(groups).flat();
                const totalSede = itemsList.reduce((acc, curr) => acc + curr.count, 0);

                return (
                  <div 
                    key={agencia} 
                    className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 hover:border-slate-750 transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Cabecera Tarjeta */}
                      <div className="flex justify-between items-start border-b border-slate-850 pb-2">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">{agencia}</h3>
                          <p className="text-[10px] text-slate-500">Jurisdicción de TI</p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-bold text-blue-400">
                          {totalSede} Items
                        </span>
                      </div>

                      {/* Lista de Hardware agrupado */}
                      <div className="divide-y divide-slate-850/40 space-y-2.5 pt-1">
                        {itemsList.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs pt-2">
                            <div className="flex items-center gap-2">
                              {/* Icono por tipo */}
                              {item.tipo.toUpperCase() === 'CPU' || item.tipo.toUpperCase() === 'LAPTOP' ? (
                                <Cpu className="w-4 h-4 text-blue-400" />
                              ) : item.tipo.toUpperCase() === 'IMPRESORA' ? (
                                <Printer className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Server className="w-4 h-4 text-purple-400" />
                              )}
                              <div>
                                <span className="font-bold text-slate-350">{item.tipo}</span>
                                <span className="text-[10px] text-slate-500 block">{item.marca} - {item.modelo}</span>
                              </div>
                            </div>
                            <span className="font-bold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-850/60 font-mono">
                              Qty: {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Panel 2: Auditoría de Inconsistencias */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 leading-relaxed space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Reglas de Consistencia y Auditoría de Contraloría
            </p>
            <p>
              Este motor escanea en tiempo real el inventario dinámico de MongoDB. Identifica anomalías en direccionamiento de red, equipos en tránsito huérfanos de asignatario o series temporales inválidas que podrían derivar en observaciones administrativas.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 animate-pulse text-xs">Ejecutando escaneo general...</div>
          ) : (
            <div className="space-y-6">
              {/* Conflicto 1: IPs Duplicadas */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> 🔴 Conflictos de Direccionamiento IP (Duplicadas)
                </h3>
                {auditResults.ipConflicts.length === 0 ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Excelente. No se encontraron conflictos de IPs duplicadas en la red.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {auditResults.ipConflicts.map((c, idx) => (
                      <div key={idx} className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-xs space-y-2">
                        <div className="font-bold text-red-400 font-mono">Conflicto en IP: {c.ip}</div>
                        <p className="text-[10px] text-slate-400">Esta dirección de red está asignada simultáneamente a los siguientes equipos:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {c.assets.map((a: any) => (
                            <div key={a.id} className="bg-slate-950 p-2 rounded border border-slate-850 font-mono text-[10px] text-slate-300">
                              <span className="font-bold text-white">{a.tipo_equipo} {a.marca}</span> ({a.numero_serie}) <br />
                              <span className="text-slate-500">Sede:</span> {a.ubicacion_agencia}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conflicto 2: Equipos en Tránsito Huérfanos */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> 🟡 Equipos en Tránsito Huérfanos
                </h3>
                {auditResults.orphanedTransit.length === 0 ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Todo en orden. No hay tránsitos a sedes sin actas asociadas o destinatarios.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditResults.orphanedTransit.map((a, idx) => (
                      <div key={idx} className="p-3 bg-amber-950/10 border border-amber-900/20 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-200">{a.tipo_equipo} {a.marca} {a.modelo}</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Serie: {a.numero_serie} | Estado: {a.estado_asignacion}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-bold border border-red-900/30">
                          Sin Receptor Asignado
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conflicto 3: Series temporales o inválidas */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> 🟠 Series Temporales o Inválidas
                </h3>
                {auditResults.missingSeries.length === 0 ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Excelente. Todas las series cumplen con la nomenclatura oficial.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditResults.missingSeries.map((a, idx) => (
                      <div key={idx} className="p-3 bg-orange-950/15 border border-orange-900/20 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-200">{a.tipo_equipo} {a.marca} {a.modelo}</div>
                          <p className="text-[10px] text-red-400 font-mono mt-0.5">Serie sospechosa: {a.numero_serie || 'VACÍA'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px]">
                          Requiere Regularizar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerta 4: Soporte Técnico Prolongado */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-400" /> 🔵 Equipos en Soporte Técnico Prolongado (&gt;30 días)
                </h3>
                {auditResults.prolongedWorkshop.length === 0 ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" /> Todo al día. Ningún equipo lleva más de 30 días continuos en taller/soporte.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditResults.prolongedWorkshop.map((a, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-200">{a.tipo_equipo} {a.marca} {a.modelo}</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Serie: {a.numero_serie} | Ubicación: {a.ubicacion_agencia}</p>
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold bg-purple-950/20 px-2 py-0.5 rounded border border-purple-900/25">
                          En Taller
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
