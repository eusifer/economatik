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
                tipo_equipo
              }
              listInsumos {
                cantidad_stock
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
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    } finally {
      setLoadingStats(false);
    }
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
        numero_serie: regSerieEan,
        tipo_equipo: regNombreDesc,
        marca: regMarcaCat,
        modelo: regModeloUnidad,
        ip_asignada: regIp || null,
        nombre_estacion: regEstacion,
        usuario_red_asignado: regUserRed || 'system',
        nombre_usuario_final: regUserFinal || 'Por Asignar',
        ubicacion_agencia: regAgencia
      };
    } else {
      payload = {
        tipo_registro: 'insumo',
        factura_referencia: regFactura,
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
        cargarEstadisticas();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error al registrar: ${err.message}`);
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
        <button
          onClick={descargarExcel}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 transition rounded-lg text-sm font-bold text-white shadow-lg shadow-green-500/20"
        >
          <Download className="w-4 h-4" /> Exportar Reporte Mensual (ExcelJS)
        </button>
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

              <div className="grid grid-cols-2 gap-3">
                {/* Tipo de Registro */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-tipo" className="text-xs text-slate-400 font-semibold">Tipo de Artículo *</label>
                  <select
                    id="reg-tipo"
                    value={regTipo}
                    onChange={(e) => setRegTipo(e.target.value as 'equipo' | 'insumo')}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="equipo">Equipo TIC (CPU/Sw/Biométrico)</option>
                    <option value="insumo">Insumo/Repuesto (Almacén)</option>
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
    </div>
  );
}
