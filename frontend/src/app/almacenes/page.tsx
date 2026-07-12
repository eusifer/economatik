'use client';

import React, { useState } from 'react';
import { 
  HardDrive, 
  Search, 
  RefreshCw, 
  Layers, 
  Boxes, 
  AlertTriangle,
  Download,
  CheckCircle2
} from 'lucide-react';

interface ActivoItem {
  id: string;
  numero_serie: string;
  tipo_equipo: string;
  marca: string;
  modelo: string;
  ubicacion_inicial: string;
  ubicacion_agencia: string;
  factura_referencia: string | null;
  fecha_registro_sistema: string;
}

interface InsumoItem {
  sku_codigo: string;
  ean_codigo: string;
  descripcion_articulo: string;
  categoria: string;
  cantidad_stock: number;
  unidad_medida: string;
  factura_referencia: string | null;
}

export default function AlmacenesPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  
  // Almacén Seleccionado
  const [almacenSelected, setAlmacenSelected] = useState<'Almacen-TIC' | 'Economato-Equipos' | 'Economato-InsRep'>('Almacen-TIC');
  
  // Datos
  const [activos, setActivos] = useState<ActivoItem[]>([]);
  const [insumos, setInsumos] = useState<InsumoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);

  // Búsqueda
  const [filtro, setFiltro] = useState('');

  const consultarAlmacen = async () => {
    setLoading(true);
    setConsultado(true);
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
              listActivosCMDB {
                id
                numero_serie
                tipo_equipo
                marca
                modelo
                ubicacion_inicial
                ubicacion_agencia
                factura_referencia
                fecha_registro_sistema
              }
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                unidad_medida
                factura_referencia
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.data) {
        // Filtrar activos que corresponden al almacén y que siguen en el almacén (no asignados a agencias externas)
        const allActivos = data.data.listActivosCMDB || [];
        const filteredActivos = allActivos.filter((a: ActivoItem) => 
          a.ubicacion_inicial === almacenSelected && 
          (a.ubicacion_agencia === almacenSelected || a.ubicacion_agencia.toUpperCase().includes('ALMACEN'))
        );
        setActivos(filteredActivos);

        // Filtrar insumos (solo aplican a Economato-InsRep)
        const allInsumos = data.data.listInsumos || [];
        if (almacenSelected === 'Economato-InsRep') {
          setInsumos(allInsumos);
        } else {
          setInsumos([]);
        }
      }
    } catch (err) {
      console.error('Error al consultar almacén:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado reactivo en UI
  const filteredActivos = activos.filter(a => 
    a.numero_serie.toLowerCase().includes(filtro.toLowerCase()) ||
    a.marca.toLowerCase().includes(filtro.toLowerCase()) ||
    a.modelo.toLowerCase().includes(filtro.toLowerCase()) ||
    a.tipo_equipo.toLowerCase().includes(filtro.toLowerCase())
  );

  const filteredInsumos = insumos.filter(i => 
    i.descripcion_articulo.toLowerCase().includes(filtro.toLowerCase()) ||
    i.sku_codigo.toLowerCase().includes(filtro.toLowerCase()) ||
    i.ean_codigo.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/40">
            Inventario CMDB
          </span>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-blue-400" /> Stock por Almacenes
          </h1>
          <p className="text-xs text-slate-400 mt-1">Consulte el stock real de hardware e insumos depositados en los almacenes centrales de la CMAC Tacna.</p>
        </div>
      </div>

      {/* Selector de Almacén */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          ⚙️ Seleccione el Almacén a Consultar
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
            <label htmlFor="almacen-select" className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Almacén de Destino</label>
            <select
              id="almacen-select"
              value={almacenSelected}
              onChange={(e) => {
                setAlmacenSelected(e.target.value as any);
                setConsultado(false);
              }}
              className="w-full text-xs bg-slate-950 text-white p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="Almacen-TIC">Almacén TIC Central (Equipos de Red, Servidores, PCs a asignar)</option>
              <option value="Economato-Equipos">Almacén Economato — Equipos en Tránsito (Hardware de reserva)</option>
              <option value="Economato-InsRep">Almacén Economato — Insumos y Repuestos (Partes de alta rotación)</option>
            </select>
          </div>
          
          <button
            type="button"
            onClick={consultarAlmacen}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Consultar Almacén
          </button>
        </div>
      </div>

      {/* Resultados */}
      {consultado && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por marca, modelo, serie, SKU o descripción..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 text-white rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="text-xs text-slate-400">
              Items encontrados: <strong className="text-white">
                {almacenSelected === 'Economato-InsRep' ? filteredInsumos.length : filteredActivos.length}
              </strong>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 animate-pulse text-xs">
              Obteniendo estado del stock actual...
            </div>
          ) : (
            <>
              {almacenSelected === 'Economato-InsRep' ? (
                // Renderizado para Insumos / Repuestos
                filteredInsumos.length === 0 ? (
                  <div className="p-12 text-center border border-slate-850 bg-slate-950/20 text-slate-500 italic text-xs rounded-xl">
                    No se encontraron insumos o repuestos en este almacén.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredInsumos.map((item) => {
                      const isLowStock = item.cantidad_stock <= 3;
                      const isOut = item.cantidad_stock === 0;

                      return (
                        <div 
                          key={item.sku_codigo} 
                          className={`p-5 rounded-xl border bg-slate-950 transition flex flex-col justify-between space-y-4 hover:border-slate-800 ${
                            isOut 
                              ? 'border-red-950/60 bg-red-950/5' 
                              : isLowStock 
                                ? 'border-amber-950/60 bg-amber-950/5' 
                                : 'border-slate-850'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase font-mono tracking-wider ${
                                item.categoria === 'Insumo' 
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                                  : 'bg-blue-950/40 text-blue-400 border-blue-900/50'
                              }`}>
                                {item.categoria}
                              </span>
                              
                              {isOut ? (
                                <span className="text-[8px] font-bold text-red-400 uppercase bg-red-950/60 px-2 py-0.5 rounded border border-red-900 animate-pulse">
                                  SOLICITAR COMPRA
                                </span>
                              ) : isLowStock ? (
                                <span className="text-[8px] font-bold text-amber-400 uppercase bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900">
                                  STOCK BAJO
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                                  STOCK CORRECTO
                                </span>
                              )}
                            </div>

                            <h3 className="text-xs font-bold text-white tracking-wide uppercase line-clamp-2">
                              {item.descripcion_articulo}
                            </h3>
                          </div>

                          <div className="space-y-2 border-t border-slate-900 pt-3">
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold">SKU:</span> <br />
                                <span className="font-mono text-slate-300">{item.sku_codigo}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold">EAN / Serie:</span> <br />
                                <span className="font-mono text-slate-300">{item.ean_codigo}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-900">
                              <span className="text-slate-400">Cantidad en Almacén:</span>
                              <span className={`font-black text-sm font-mono ${
                                isOut ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-white'
                              }`}>
                                {item.cantidad_stock} {item.unidad_medida}(s)
                              </span>
                            </div>

                            {item.factura_referencia && (
                              <div className="text-[9px] text-slate-500 italic mt-1 truncate">
                                Factura ref: {item.factura_referencia}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                // Renderizado para Activos (Equipos Centrales / Tránsito)
                filteredActivos.length === 0 ? (
                  <div className="p-12 text-center border border-slate-850 bg-slate-950/20 text-slate-500 italic text-xs rounded-xl">
                    No se encontraron activos físicos en stock en este almacén.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950">
                    <table className="w-full text-[11px] text-slate-300 text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                          <th className="p-3">Tipo de Equipo</th>
                          <th className="p-3">Marca / Modelo</th>
                          <th className="p-3">Número de Serie</th>
                          <th className="p-3">Ubicación Inicial</th>
                          <th className="p-3">Factura de Referencia</th>
                          <th className="p-3">Fecha de Ingreso</th>
                          <th className="p-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredActivos.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-900/40 transition">
                            <td className="p-3 font-semibold text-blue-400">{a.tipo_equipo}</td>
                            <td className="p-3 text-white font-bold">{a.marca} {a.modelo}</td>
                            <td className="p-3 font-mono text-slate-200">{a.numero_serie}</td>
                            <td className="p-3 text-slate-400 font-mono text-[10px]">{a.ubicacion_inicial}</td>
                            <td className="p-3 text-slate-400 font-mono">{a.factura_referencia || 'N/A'}</td>
                            <td className="p-3 text-slate-500">
                              {new Date(a.fecha_registro_sistema).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 uppercase">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Disponible
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
