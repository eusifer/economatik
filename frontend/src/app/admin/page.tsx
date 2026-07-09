'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, RefreshCw, Cpu, Server, Laptop, Archive, TrendingUp, BarChart2, FileSpreadsheet, Plus, FileCode } from 'lucide-react';

export default function AdminPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  
  // Modos de Carga e Inventario
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');

  // Estados para Registro Manual
  const [regTipo, setRegTipo] = useState<'equipo' | 'insumo'>('equipo');
  const [regFactura, setRegFactura] = useState('');
  const [regSerieEan, setRegSerieEan] = useState('');
  const [regNombreDesc, setRegNombreDesc] = useState('');
  const [regMarcaCat, setRegMarcaCat] = useState('');
  const [regModeloUnidad, setRegModeloUnidad] = useState('');
  const [regCantidad, setRegCantidad] = useState(1);
  const [regIp, setRegIp] = useState('');
  const [regEstacion, setRegEstacion] = useState('');
  const [regUserRed, setRegUserRed] = useState('');
  const [regUserFinal, setRegUserFinal] = useState('');
  const [regAgencia, setRegAgencia] = useState('');

  // Estados para Adjunto de Factura
  const [regAdjuntoB64, setRegAdjuntoB64] = useState<string | null>(null);
  const [regAdjuntoMime, setRegAdjuntoMime] = useState<string | null>(null);
  const [regAdjuntoNombre, setRegAdjuntoNombre] = useState<string>('');

  // Estados para Informes
  const [informeNum, setInformeNum] = useState('');
  const [diagTecnico, setDiagTecnico] = useState('');
  const [sustLogistico, setSustLogistico] = useState('');
  const [serieActivoBaja, setSerieActivoBaja] = useState('');

  // Estados para Renovación
  const [serieViejo, setSerieViejo] = useState('');
  const [serieNuevo, setSerieNuevo] = useState('');

  // Estados para reportes del parque TIC y almacén
  const [totalCPUs, setTotalCPUs] = useState(0);
  const [totalLaptops, setTotalLaptops] = useState(0);
  const [totalScanners, setTotalScanners] = useState(0);
  const [totalInsumosStock, setTotalInsumosStock] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [recentActivos, setRecentActivos] = useState<any[]>([]);
  const [recentInsumos, setRecentInsumos] = useState<any[]>([]);

  // Estados para Kardex de Activos
  const [regFechaCompra, setRegFechaCompra] = useState('');
  const [serieKardexBusqueda, setSerieKardexBusqueda] = useState('');
  const [kardexMovimientos, setKardexMovimientos] = useState<any[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetStats {
              listActivosCMDB {
                numero_serie
                tipo_equipo
                marca
                modelo
                ubicacion_agencia
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                unidad_medida
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data) {
        const activos = data.data.listActivosCMDB || [];
        const insumos = data.data.listInsumos || [];

        let cpus = 0;
        let laptops = 0;
        let scanners = 0;

        activos.forEach((a: any) => {
          const tipo = (a.tipo_equipo || '').toLowerCase();
          if (tipo.includes('cpu') || tipo.includes('workstation') || tipo.includes('pc')) {
            cpus++;
          } else if (tipo.includes('laptop') || tipo.includes('portatil')) {
            laptops++;
          } else if (tipo.includes('scanner') || tipo.includes('escaner')) {
            scanners++;
          }
        });

        const totalStock = insumos.reduce((acc: number, i: any) => acc + (i.cantidad_stock || 0), 0);

        setTotalCPUs(cpus);
        setTotalLaptops(laptops);
        setTotalScanners(scanners);
        setTotalInsumosStock(totalStock);
        setRecentActivos(activos);
        setRecentInsumos(insumos);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFileAdjuntoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRegAdjuntoNombre(file.name);
    setRegAdjuntoMime(file.type);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        // Extraer la parte base64 pura
        const base64Data = dataUrl.split(',')[1];
        setRegAdjuntoB64(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  const descargarPlantillaCSV = () => {
    const csvContent = "tipo_registro,factura,serie_o_ean,nombre_o_descripcion,marca_o_categoria,modelo_o_unidad,cantidad,ip_asignada,nombre_estacion,usuario_red,usuario_final,ubicacion_agencia\n" +
                       "equipo,F001-0001,LEN-9988,PC,LENOVO,ThinkCentre M70q,,192.168.20.50,APT-01OP-50,jsmith,John Smith,San Martin\n" +
                       "insumo,F001-0002,EAN-1001,ROLLER MULTI PURPOSE HP MFP M426,Repuesto,Unidad,5,,,,,";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_carga_enocomatik.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          alert('El archivo CSV está vacío o solo contiene la cabecera.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const payload: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < headers.length) continue;

          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });

          // Mapear campos del CSV a la estructura unificada del backend
          if (row.tipo_registro === 'equipo') {
            payload.push({
              tipo_registro: 'equipo',
              factura_referencia: row.factura,
              numero_serie: row.serie_o_ean,
              tipo_equipo: row.nombre_o_descripcion,
              marca: row.marca_o_categoria,
              modelo: row.modelo_o_unidad,
              ip_asignada: row.ip_asignada || null,
              nombre_estacion: row.nombre_estacion,
              usuario_red_asignado: row.usuario_red || 'system',
              nombre_usuario_final: row.usuario_final || 'Por Asignar',
              ubicacion_agencia: row.ubicacion_agencia || 'Sede Central'
            });
          } else if (row.tipo_registro === 'insumo' || row.tipo_registro === 'repuesto') {
            payload.push({
              tipo_registro: row.tipo_registro,
              factura_referencia: row.factura,
              ean_codigo: row.serie_o_ean,
              descripcion_articulo: row.nombre_o_descripcion,
              categoria: row.marca_o_categoria === 'Insumo' ? 'Insumo' : 'Repuesto',
              unidad_medida: row.modelo_o_unidad || 'Unidad',
              cantidad_stock: Number(row.cantidad || 1)
            });
          }
        }

        const token = localStorage.getItem('token');
        const res = await fetch(`${backendUrl}/api/assets/bulk-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (res.status === 200) {
          alert(`Éxito: Se procesaron ${result.processed_count} elementos del CSV correctamente.`);
          cargarEstadisticas();
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (err: any) {
        alert(`Error al procesar el archivo CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Limpiar input
    e.target.value = '';
  };

  const guardarRegistroManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFactura || !regSerieEan || !regNombreDesc || !regMarcaCat) {
      alert('Por favor complete los campos obligatorios: Factura, Serie/EAN, Nombre/Descripción y Marca/Categoría.');
      return;
    }

    let payload: any = {};
    if (regTipo === 'equipo') {
      if (!regEstacion || !regAgencia) {
        alert('Por favor complete los campos obligatorios de equipo: Nombre de Estación y Agencia.');
        return;
      }
      payload = {
        tipo_registro: 'equipo',
        factura_referencia: regFactura,
        factura_adjunto_b64: regAdjuntoB64 || null,
        factura_adjunto_mime: regAdjuntoMime || null,
        numero_serie: regSerieEan,
        tipo_equipo: regNombreDesc,
        marca: regMarcaCat,
        modelo: regModeloUnidad,
        ip_asignada: regIp || null,
        nombre_estacion: regEstacion,
        usuario_red_asignado: regUserRed || 'system',
        nombre_usuario_final: regUserFinal || 'Por Asignar',
        ubicacion_agencia: regAgencia,
        fecha_compra: regFechaCompra || null
      };
    } else {
      payload = {
        tipo_registro: 'insumo',
        factura_referencia: regFactura,
        factura_adjunto_b64: regAdjuntoB64 || null,
        factura_adjunto_mime: regAdjuntoMime || null,
        ean_codigo: regSerieEan,
        descripcion_articulo: regNombreDesc,
        categoria: regMarcaCat === 'Insumo' ? 'Insumo' : 'Repuesto',
        unidad_medida: regModeloUnidad || 'Unidad',
        cantidad_stock: Number(regCantidad || 1)
      };
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/assets/bulk-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify([payload]) // Enviar como lote de un solo elemento
      });

      const result = await res.json();
      if (res.status === 200) {
        alert('Registro manual guardado y stock actualizado correctamente.');
        // Limpiar campos selectivos
        setRegSerieEan('');
        setRegNombreDesc('');
        setRegMarcaCat('');
        setRegModeloUnidad('');
        setRegCantidad(1);
        setRegIp('');
        setRegEstacion('');
        setRegUserRed('');
        setRegUserFinal('');
        setRegAgencia('');
        setRegFechaCompra('');
        setRegAdjuntoB64(null);
        setRegAdjuntoMime(null);
        setRegAdjuntoNombre('');
        cargarEstadisticas();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error al registrar: ${err.message}`);
    }
  const consultarKardexActivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serieKardexBusqueda.trim()) return;

    setLoadingKardex(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetKardex($serie: String!) {
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
          variables: { serie: serieKardexBusqueda }
        })
      });

      const data = await res.json();
      if (data.data) {
        setKardexMovimientos(data.data.getKardexActivo || []);
      } else {
        setKardexMovimientos([]);
      }
    } catch (err) {
      console.error(err);
      setKardexMovimientos([]);
    } finally {
      setLoadingKardex(false);
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

  const descargarExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debe iniciar una sesión simulada en el inicio para descargar el reporte.');
        return;
      }

      const res = await fetch(`${backendUrl}/api/reports/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status !== 200) {
        const errData = await res.json();
        alert(`Error: ${errData.message}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_productividad_mensual.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert('Error al descargar el reporte Excel.');
    }
  };

  const emitirInformeBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!informeNum || !diagTecnico || !sustLogistico || !serieActivoBaja) {
      alert('Todos los campos son obligatorios para INF-BAJA.');
      return;
    }

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
            mutation CrearBaja($num: String!, $diag: String!, $sust: String!, $serie: String!) {
              crearInformeBaja(
                numero_informe: $num
                diagnostico_tecnico: $diag
                sustento_logistico: $sust
                serie_activo: $serie
              )
            }
          `,
          variables: { num: informeNum, diag: diagTecnico, sust: sustLogistico, serie: serieActivoBaja }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Informe de Baja ${informeNum} emitido con éxito. La IP del activo ${serieActivoBaja} ha sido liberada.`);
        setInformeNum('');
        setDiagTecnico('');
        setSustLogistico('');
        setSerieActivoBaja('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const emitirInformeRenovacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!informeNum || !diagTecnico || !sustLogistico) {
      alert('Campos Número, Diagnóstico y Sustento son obligatorios para INF-RENOV.');
      return;
    }

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
            mutation CrearRenov($num: String!, $diag: String!, $sust: String!) {
              crearInformeRenovacion(
                numero_informe: $num
                diagnostico_tecnico: $diag
                sustento_logistico: $sust
              )
            }
          `,
          variables: { num: informeNum, diag: diagTecnico, sust: sustLogistico }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Informe de Renovación ${informeNum} emitido. Pendiente de aprobación patrimonial.`);
        setInformeNum('');
        setDiagTecnico('');
        setSustLogistico('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const procesarRenovacionCPU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serieViejo || !serieNuevo) {
      alert('Ambas series son requeridas.');
      return;
    }

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
            mutation RenovTech($viejo: String!, $nuevo: String!) {
              renovacionTecnologica(serieViejo: $viejo, serieNuevo: $nuevo)
            }
          `,
          variables: { viejo: serieViejo, nuevo: serieNuevo }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Renovación completada. CPU Nuevo (${serieNuevo}) heredó IP/Host del CPU Viejo (${serieViejo}). El CPU viejo fue desactivado.`);
        setSerieViejo('');
        setSerieNuevo('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Panel del Administrador Patrimonial</h1>
          <p className="text-sm text-slate-400 mt-1">Gestión avanzada de inventarios, reportes de auditoría y ciclos de renovación.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={descargarKardexConsolidado}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-650 hover:bg-blue-600 transition rounded-lg text-sm font-bold text-white shadow-lg shadow-blue-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Descargar Kardex Consolidado (Excel)
          </button>
          <button
            onClick={descargarExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 transition rounded-lg text-sm font-bold text-white shadow-lg shadow-green-500/20"
          >
            <Download className="w-4 h-4" /> Exportar Reporte Mensual (ExcelJS)
          </button>
        </div>
      </div>

      {/* Panel de Reportes e Indicadores */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" /> Reportes e Indicadores del Parque TIC & Economato
          </h2>
          {loadingStats && <span className="text-xs text-slate-500 animate-pulse">Actualizando indicadores...</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Total CPUs */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Computadoras / CPUs</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalCPUs}</p>
            <span className="text-[10px] text-slate-500">Registrados en la CMDB</span>
          </div>

          {/* Card 2: Total Laptops */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Laptops / Portátiles</span>
              <Laptop className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalLaptops}</p>
            <span className="text-[10px] text-slate-500">Soportadas en inventario</span>
          </div>

          {/* Card 3: Total Scanners */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Escáneres / Digitalizad.</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalScanners}</p>
            <span className="text-[10px] text-slate-500">Unidades de digitalización</span>
          </div>

          {/* Card 4: Total Economato Stock */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Artículos en Economato</span>
              <Archive className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold mt-2 text-white">{totalInsumosStock}</p>
            <span className="text-[10px] text-slate-500">Suma total de repuestos/insumos</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Carga e Ingreso de Inventarios (Izquierda) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('csv')}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === 'csv' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Carga por Lotes CSV
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 pb-3 text-sm font-semibold transition ${
                activeTab === 'manual' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registro Manual Individual
            </button>
          </div>

          {activeTab === 'csv' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" /> Carga Masiva de Facturas (.csv)
              </h3>
              <p className="text-xs text-slate-400">
                Seleccione un archivo delimitado por comas (.csv) correspondiente al lote de la Factura de Adquisición recibida. 
                El sistema actualizará el stock de repuestos e indexará nuevos equipos en la CMDB.
              </p>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
                <Upload className="w-8 h-8 text-slate-500" />
                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition text-slate-200">
                  Seleccionar Archivo CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 font-mono">plantilla_carga_enocomatik.csv</span>
                <button
                  onClick={descargarPlantillaCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-650 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar Formato
                </button>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={guardarRegistroManual} className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" /> Registro de Adquisición Manual
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {/* Tipo de Registro */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-tipo" className="text-xs text-slate-400 font-semibold">Tipo de Artículo *</label>
                  <select
                    id="reg-tipo"
                    value={regTipo}
                    onChange={(e) => setRegTipo(e.target.value as 'equipo' | 'insumo')}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="equipo">Equipo TIC</option>
                    <option value="insumo">Insumo/Repuesto</option>
                  </select>
                </div>

                {/* Factura Referencia */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-factura" className="text-xs text-slate-400 font-semibold">Factura de Compra *</label>
                  <input
                    id="reg-factura"
                    type="text"
                    placeholder="Ej. F001-0004523"
                    value={regFactura}
                    onChange={(e) => setRegFactura(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Fecha Compra */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-fechacompra" className="text-xs text-slate-400 font-semibold">Fecha Compra</label>
                  <input
                    id="reg-fechacompra"
                    type="date"
                    value={regFechaCompra}
                    onChange={(e) => setRegFechaCompra(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Serie o EAN */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-serie" className="text-xs text-slate-400 font-semibold">
                    {regTipo === 'equipo' ? 'Número de Serie *' : 'Código EAN / SKU *'}
                  </label>
                  <input
                    id="reg-serie"
                    type="text"
                    placeholder={regTipo === 'equipo' ? 'Serie única del hardware' : 'Código de barras de repuesto'}
                    value={regSerieEan}
                    onChange={(e) => setRegSerieEan(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Nombre o Descripción */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-nombre" className="text-xs text-slate-400 font-semibold">
                    {regTipo === 'equipo' ? 'Tipo de Equipo *' : 'Descripción de Artículo *'}
                  </label>
                  <input
                    id="reg-nombre"
                    type="text"
                    placeholder={regTipo === 'equipo' ? 'Ej. CPU, Impresora, Switch' : 'Ej. Aceite fusor, Roller HP'}
                    value={regNombreDesc}
                    onChange={(e) => setRegNombreDesc(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Marca o Categoría */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-marca" className="text-xs text-slate-400 font-semibold">
                    {regTipo === 'equipo' ? 'Marca *' : 'Categoría *'}
                  </label>
                  {regTipo === 'equipo' ? (
                    <input
                      id="reg-marca"
                      type="text"
                      placeholder="Ej. Lenovo, Epson"
                      value={regMarcaCat}
                      onChange={(e) => setRegMarcaCat(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <select
                      id="reg-marca"
                      value={regMarcaCat}
                      onChange={(e) => setRegMarcaCat(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Repuesto">Repuesto</option>
                      <option value="Insumo">Insumo</option>
                    </select>
                  )}
                </div>

                {/* Modelo o Unidad Medida */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-modelo" className="text-xs text-slate-400 font-semibold">
                    {regTipo === 'equipo' ? 'Modelo *' : 'Unidad de Medida *'}
                  </label>
                  <input
                    id="reg-modelo"
                    type="text"
                    placeholder={regTipo === 'equipo' ? 'Ej. ThinkCentre M70q' : 'Ej. Unidad, Litro, Caja'}
                    value={regModeloUnidad}
                    onChange={(e) => setRegModeloUnidad(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cargar Adjunto (Factura Imagen/PDF) */}
              <div className="flex flex-col gap-1.5 border-t border-slate-850 pt-3">
                <label className="text-xs text-slate-400 font-semibold">Factura Digital Adjunta (Opcional - Imagen o PDF)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition text-slate-200">
                    Subir PDF o Imagen
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileAdjuntoChange}
                      className="hidden"
                    />
                  </label>
                  {regAdjuntoNombre && (
                    <span className="text-[10px] text-slate-350 font-mono truncate max-w-[200px] bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-850">
                      📎 {regAdjuntoNombre}
                    </span>
                  )}
                </div>
              </div>

              {/* Campos específicos de Insumos: Cantidad */}
              {regTipo === 'insumo' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-cantidad" className="text-xs text-slate-400 font-semibold">Cantidad a Ingresar / Sumar al Stock *</label>
                  <input
                    id="reg-cantidad"
                    type="number"
                    min={1}
                    value={regCantidad}
                    onChange={(e) => setRegCantidad(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Campos específicos de Equipos */}
              {regTipo === 'equipo' && (
                <div className="space-y-3 bg-slate-950/30 p-3 rounded-lg border border-slate-850">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalles de Sede e Identificación en Red</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-ip" className="text-[10px] text-slate-400">Dirección IP Asignada</label>
                      <input
                        id="reg-ip"
                        type="text"
                        placeholder="Ej. 192.168.20.125"
                        value={regIp}
                        onChange={(e) => setRegIp(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-estacion" className="text-[10px] text-slate-400">Nombre Estación (Host) *</label>
                      <input
                        id="reg-estacion"
                        type="text"
                        placeholder="Ej. APT-OP-125"
                        value={regEstacion}
                        onChange={(e) => setRegEstacion(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-userred" className="text-[10px] text-slate-400">Usuario Red (Active Dir.)</label>
                      <input
                        id="reg-userred"
                        type="text"
                        placeholder="Ej. jvalencia"
                        value={regUserRed}
                        onChange={(e) => setRegUserRed(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="reg-userfinal" className="text-[10px] text-slate-400">Usuario Final (Persona)</label>
                      <input
                        id="reg-userfinal"
                        type="text"
                        placeholder="Ej. Juan Valencia"
                        value={regUserFinal}
                        onChange={(e) => setRegUserFinal(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="reg-agencia" className="text-[10px] text-slate-400">Ubicación Agencia / Sede *</label>
                    <input
                      id="reg-agencia"
                      type="text"
                      placeholder="Ej. Sede Central, Agencia San Martin"
                      value={regAgencia}
                      onChange={(e) => setRegAgencia(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-650 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition shadow-md shadow-blue-500/10"
              >
                <Save className="w-4 h-4" /> Registrar en Inventario
              </button>
            </form>
          )}
        </div>

        {/* Renovación de CPU (Derecha) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" /> Renovación Tecnológica (Reuso CPU)
          </h2>
          <p className="text-xs text-slate-400">El nuevo CPU hereda las credenciales de red (IP/Host) del equipo viejo. El equipo viejo limpia sus propiedades y pasa a estado temporal "En Almacén".</p>

          <form onSubmit={procesarRenovacionCPU} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="viejo-cpu" className="text-sm font-semibold text-slate-300">Serie del CPU Viejo (A retirar)</label>
              <input
                id="viejo-cpu"
                type="text"
                placeholder="ej. CPU-5542"
                value={serieViejo}
                onChange={(e) => setSerieViejo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="nuevo-cpu" className="text-sm font-semibold text-slate-300">Serie del CPU Nuevo (A instalar)</label>
              <input
                id="nuevo-cpu"
                type="text"
                placeholder="ej. CPU-9988"
                value={serieNuevo}
                onChange={(e) => setSerieNuevo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 transition rounded-lg text-sm font-bold text-white"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" /> Aplicar Transición de Red (IP/Host)
            </button>
          </form>
        </div>
      </div>

      {/* Emisión de Informes Técnicos */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" /> Emisión de Informes Técnicos de Activos
        </h2>
        
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Datos Generales */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="num-informe" className="text-sm font-semibold text-slate-300">Número de Informe *</label>
              <input
                id="num-informe"
                type="text"
                placeholder="ej. INF-BAJA-2026-001 o INF-RENOV-2026-002"
                value={informeNum}
                onChange={(e) => setInformeNum(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="diag-tec" className="text-sm font-semibold text-slate-300">Diagnóstico Técnico del Equipo *</label>
              <textarea
                id="diag-tec"
                rows={3}
                placeholder="Describa el estado físico, depreciación y vida útil restante del bien..."
                value={diagTecnico}
                onChange={(e) => setDiagTecnico(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="sust-log" className="text-sm font-semibold text-slate-300">Sustento Logístico *</label>
              <textarea
                id="sust-log"
                rows={3}
                placeholder="Describa el sustento logístico y el destino final de las piezas de recambio..."
                value={sustLogistico}
                onChange={(e) => setSustLogistico(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Acciones de Emisión */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Opción para Baja */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-red-400">Módulo INF-BAJA (Definitivo)</h3>
                <p className="text-xs text-slate-500 mt-1">Este informe da de baja total al hardware y **libera su IP/Host de red de manera instantánea**.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="baja-serie" className="text-sm font-semibold text-slate-300">Serie del Activo a Dar de Baja</label>
                <input
                  id="baja-serie"
                  type="text"
                  placeholder="ej. KOD-3021"
                  value={serieActivoBaja}
                  onChange={(e) => setSerieActivoBaja(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="button"
                onClick={emitirInformeBaja}
                className="w-full py-2 bg-red-750 hover:bg-red-700 transition rounded-lg text-xs font-bold text-white"
              >
                Emitir INF-BAJA & Liberar IP
              </button>
            </div>

            {/* Opción para Renovación */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 space-y-2">
              <h3 className="text-sm font-bold text-blue-400">Módulo INF-RENOV (Reutilización Ligera)</h3>
              <p className="text-xs text-slate-500">Este informe registra la re-asignación. Requiere aprobación administrativa antes de habilitarse de nuevo.</p>
              
              <button
                type="button"
                onClick={emitirInformeRenovacion}
                className="w-full py-2 bg-blue-750 hover:bg-blue-700 transition rounded-lg text-xs font-bold text-white mt-2"
              >
                Emitir INF-RENOV para Aprobación
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Módulo de Consulta de Facturas y Equipos Adquiridos */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Registro y Visualización de Facturas de Compra
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consulte las facturas e imágenes/PDFs de compra asociados a los activos en la CMDB y a los repuestos del economato central.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Equipos con Factura */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipos en Parque TIC (CMDB)</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-3">Serie</th>
                    <th className="p-3">Equipo</th>
                    <th className="p-3">Factura</th>
                    <th className="p-3">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivos.filter(a => a.factura_referencia).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-500 italic">No hay facturas de equipos registradas.</td>
                    </tr>
                  ) : (
                    recentActivos.filter(a => a.factura_referencia).map((a: any) => (
                      <tr key={a.numero_serie} className="border-b border-slate-850 hover:bg-slate-900/40 transition">
                        <td className="p-3 font-mono font-bold text-slate-350">{a.numero_serie}</td>
                        <td className="p-3">
                          <div className="text-slate-200 font-medium">{a.tipo_equipo}</div>
                          <div className="text-[10px] text-slate-450">{a.marca} - {a.modelo}</div>
                        </td>
                        <td className="p-3 text-slate-300 font-mono">{a.factura_referencia}</td>
                        <td className="p-3">
                          {a.factura_adjunto_b64 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const byteCharacters = atob(a.factura_adjunto_b64);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], { type: a.factura_adjunto_mime || 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              }}
                              className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-900/40 text-[10px] font-bold text-blue-400 rounded-lg transition"
                            >
                              Ver Adjunto
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Sin archivo</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insumos con Factura */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Insumos y Repuestos (Economato)</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-3">EAN</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Factura</th>
                    <th className="p-3">Stock / Doc</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInsumos.filter(i => i.factura_referencia).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-500 italic">No hay facturas de insumos registradas.</td>
                    </tr>
                  ) : (
                    recentInsumos.filter(i => i.factura_referencia).map((i: any) => (
                      <tr key={i.ean_codigo} className="border-b border-slate-850 hover:bg-slate-900/40 transition">
                        <td className="p-3 font-mono font-bold text-slate-350">{i.ean_codigo}</td>
                        <td className="p-3 text-slate-200 font-medium">{i.descripcion_articulo}</td>
                        <td className="p-3 text-slate-300 font-mono">{i.factura_referencia}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-350 font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-slate-850 text-[10px]">{i.cantidad_stock} {i.unidad_medida}</span>
                            {i.factura_adjunto_b64 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const byteCharacters = atob(i.factura_adjunto_b64);
                                  const byteNumbers = new Array(byteCharacters.length);
                                  for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                  }
                                  const byteArray = new Uint8Array(byteNumbers);
                                  const blob = new Blob([byteArray], { type: i.factura_adjunto_mime || 'application/pdf' });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                }}
                                className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-900/40 text-[10px] font-bold text-blue-400 rounded-lg transition"
                              >
                                Ver Adjunto
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">Sin archivo</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Módulo de Kardex Logístico de Activos TIC */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" /> Kardex Logístico e Historial de Movimientos (Trazabilidad)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consulte la línea de tiempo completa, asignaciones, transferencias de agencias y bajas de cualquier activo TIC mediante su número de serie.
          </p>
        </div>

        <form onSubmit={consultarKardexActivo} className="flex gap-3 max-w-md">
          <input
            type="text"
            placeholder="Ingrese Número de Serie (Ej. HP-8877)"
            value={serieKardexBusqueda}
            onChange={(e) => setSerieKardexBusqueda(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
          />
          <button
            type="submit"
            disabled={loadingKardex}
            className="px-4 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5"
          >
            {loadingKardex ? 'Buscando...' : 'Consultar Kardex'}
          </button>
        </form>

        {kardexMovimientos.length > 0 ? (
          <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6 py-2">
            {kardexMovimientos.map((mov) => (
              <div key={mov.id} className="relative">
                {/* Indicador / Viñeta de la Línea de Tiempo */}
                <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-slate-950 ${
                  mov.tipo_movimiento === 'Ingreso' ? 'border-emerald-500 text-emerald-500' :
                  mov.tipo_movimiento === 'Transferencia' ? 'border-blue-500 text-blue-500' :
                  mov.tipo_movimiento === 'Baja' ? 'border-red-500 text-red-500' :
                  'border-purple-500 text-purple-500'
                }`} />

                {/* Contenido del Hito */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      mov.tipo_movimiento === 'Ingreso' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60' :
                      mov.tipo_movimiento === 'Transferencia' ? 'bg-blue-950/60 text-blue-400 border border-blue-900/60' :
                      mov.tipo_movimiento === 'Baja' ? 'bg-red-950/60 text-red-400 border border-red-900/60' :
                      'bg-purple-950/60 text-purple-400 border border-purple-900/60'
                    }`}>
                      {mov.tipo_movimiento.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {new Date(Number(mov.fecha_movimiento) ? Number(mov.fecha_movimiento) : mov.fecha_movimiento).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium">
                    {mov.motivo_detalle}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-900 text-[10px] text-slate-400">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Agencia / Sede</span>
                      <span className="font-medium text-slate-350">
                        {mov.agencia_origen ? `${mov.agencia_origen} ➔ ` : ''}{mov.agencia_destino}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Responsable</span>
                      <span className="font-mono text-slate-350 font-bold">{mov.usuario_responsable}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-semibold">Sustento / Factura</span>
                      <span className="font-mono text-slate-350">{mov.factura_referencia || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          serieKardexBusqueda && !loadingKardex && (
            <p className="text-xs text-slate-500 italic pl-2">No se encontraron movimientos registrados en el Kardex para la serie ingresada.</p>
          )
        )}
      </section>
    </div>
  );
}
