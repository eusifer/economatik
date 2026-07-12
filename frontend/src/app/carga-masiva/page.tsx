'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Database,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

type TemplateType = 'cpu' | 'impresora' | 'economato';

interface PreviewRow {
  index: number;
  data: any;
  isValid: boolean;
  errorMsg?: string;
}

export default function CargaMasivaPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('cpu');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [payloadData, setPayloadData] = useState<any[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [progreso, setProgreso] = useState<number | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.rol === 'administrador') {
          setIsAdmin(true);
        } else {
          window.location.href = '/dashboard';
        }
      } catch (e) {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
    setCheckingAdmin(false);
  }, []);

  // Generadores de Plantillas
  const descargarPlantillaCPU = () => {
    const data = [
      {
        SERIE: "DEMO-CPU-9988",
        HOST: "APT-01OP-50",
        EQUIPO: "CPU",
        MARCA: "HP",
        MODELO: "ProDesk 600 G6",
        IP: "192.168.20.50",
        USUARIO: "jsmith",
        AGENCIA: "OFICINA PRINCIPAL"
      },
      {
        SERIE: "DEMO-LAP-1122",
        HOST: "APT-01OP-LAP51",
        EQUIPO: "LAPTOP",
        MARCA: "LENOVO",
        MODELO: "ThinkPad L14",
        IP: "192.168.20.51",
        USUARIO: "amendoza",
        AGENCIA: "AGENCIA SAN MARTÍN"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DB_CPU");
    XLSX.writeFile(wb, "DB_CPU.xlsx");
  };

  const descargarPlantillaImpresoras = () => {
    const data = [
      {
        SERIE: "DEMO-PRN-5544",
        TIPO: "IMPRESORA",
        MARCA: "LEXMARK",
        MODELO: "MS621",
        IP: "192.168.20.90",
        AGENCIA: "OFICINA PRINCIPAL",
        "UBICACIÓN / AREA /PISO": "SOPORTE TI - PISO 2"
      },
      {
        SERIE: "DEMO-PRN-7788",
        TIPO: "IMPRESORA MULTIFUNCIONAL",
        MARCA: "HP",
        MODELO: "LaserJet M426",
        IP: "192.168.30.95",
        AGENCIA: "AGENCIA JULIACA",
        "UBICACIÓN / AREA /PISO": "PLATAFORMA ATENCIÓN"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DB_IMPRESORAS");
    XLSX.writeFile(wb, "DB_IMPRESORAS.xlsx");
  };

  const descargarPlantillaEconomato = () => {
    const data = [
      {
        CODIGO: "EAN-1001",
        DESCRIPCION: "ROLLER MULTI PURPOSE HP MFP M426",
        CANTIDAD: 12,
        FECHA_REGISTRO: "2026-07-12",
        USUARIO_REGISTRO: "admin"
      },
      {
        CODIGO: "",
        DESCRIPCION: "ALCOHOL ISOPROPILICO 1 LITRO",
        CANTIDAD: 25,
        FECHA_REGISTRO: "2026-07-12",
        USUARIO_REGISTRO: "admin"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DB_ECONOMATO");
    XLSX.writeFile(wb, "plantilla_carga_economato.xlsx");
  };

  // Procesamiento y Validación Local
  const procesarArchivo = (buffer: ArrayBuffer, name: string) => {
    try {
      setFileName(name);
      setUploadStatus(null);
      
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('El archivo seleccionado está vacío.');
      }

      const tempPreview: PreviewRow[] = [];
      const tempPayload: any[] = [];

      rows.forEach((row, idx) => {
        let isValid = true;
        let errorMsg = '';
        const mappedItem: any = {};

        // Validaciones condicionales segun plantilla
        if (selectedTemplate === 'cpu') {
          const serie = String(row['SERIE'] || '').trim().toUpperCase();
          const host = String(row['HOST'] || '').trim().toUpperCase();
          
          if (!serie) {
            isValid = false;
            errorMsg = 'Falta columna SERIE (Obligatorio)';
          } else if (!host) {
            isValid = false;
            errorMsg = 'Falta columna HOST (Obligatorio para CPUs)';
          }

          mappedItem.tipo_registro = 'equipo';
          mappedItem.factura_referencia = 'FACTURA-HISTORICA-CPU';
          mappedItem.numero_serie = serie;
          mappedItem.tipo_equipo = String(row['EQUIPO'] || 'CPU').trim().toUpperCase();
          mappedItem.marca = String(row['MARCA'] || 'HP').trim().toUpperCase();
          mappedItem.modelo = String(row['MODELO'] || 'DESKTOP').trim().toUpperCase();
          mappedItem.ip_asignada = row['IP'] ? String(row['IP']).trim() : null;
          mappedItem.nombre_estacion = host;
          mappedItem.usuario_red_asignado = String(row['USUARIO'] || 'system').trim().toLowerCase();
          mappedItem.nombre_usuario_final = String(row['USUARIO'] || 'Uso Común').trim();
          mappedItem.ubicacion_agencia = String(row['AGENCIA'] || 'OFICINA PRINCIPAL').trim().toUpperCase();

        } else if (selectedTemplate === 'impresora') {
          const serie = String(row['SERIE'] || '').trim().toUpperCase();
          
          if (!serie) {
            isValid = false;
            errorMsg = 'Falta columna SERIE (Obligatorio)';
          }

          mappedItem.tipo_registro = 'equipo';
          mappedItem.factura_referencia = 'FACTURA-HISTORICA-PRN';
          mappedItem.numero_serie = serie;
          mappedItem.tipo_equipo = String(row['TIPO'] || 'IMPRESORA').trim().toUpperCase();
          mappedItem.marca = String(row['MARCA'] || 'HP').trim().toUpperCase();
          mappedItem.modelo = String(row['MODELO'] || 'Laser').trim().toUpperCase();
          mappedItem.ip_asignada = row['IP'] ? String(row['IP']).trim() : null;
          mappedItem.nombre_estacion = `PRN-${serie}`;
          mappedItem.usuario_red_asignado = 'system';
          mappedItem.nombre_usuario_final = 'Uso Común';
          mappedItem.ubicacion_agencia = String(row['AGENCIA'] || 'OFICINA PRINCIPAL').trim().toUpperCase();
          mappedItem.informacion_adicional = String(row['UBICACIÓN / AREA /PISO'] || '').trim();

        } else {
          // Economato / Insumos y Repuestos
          const codigo = String(row['CODIGO'] || '').trim();
          const descripcion = String(row['DESCRIPCION'] || '').trim();
          const cantidadStr = String(row['CANTIDAD'] || '').trim();
          const fecha = String(row['FECHA_REGISTRO'] || '').trim() || new Date().toISOString().substring(0, 10);
          const usuario = String(row['USUARIO_REGISTRO'] || 'admin').trim();

          if (!descripcion) {
            isValid = false;
            errorMsg = 'Falta columna DESCRIPCION (Obligatorio)';
          } else if (!cantidadStr || isNaN(Number(cantidadStr))) {
            isValid = false;
            errorMsg = 'Falta o es inválida la columna CANTIDAD (Obligatorio numérico)';
          }

          mappedItem.tipo_registro = 'economato';
          mappedItem.codigo = codigo || null;
          mappedItem.descripcion = descripcion;
          mappedItem.cantidad = Number(cantidadStr || 0);
          mappedItem.fecha_registro = fecha;
          mappedItem.usuario_registro = usuario;
        }

        tempPreview.push({
          index: idx + 1,
          data: row,
          isValid,
          errorMsg
        });

        if (isValid) {
          tempPayload.push(mappedItem);
        }
      });

      setPreviewRows(tempPreview);
      setPayloadData(tempPayload);

    } catch (err: any) {
      alert(`Error al estructurar archivo: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result;
      if (buffer instanceof ArrayBuffer) {
        procesarArchivo(buffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const buffer = evt.target?.result;
        if (buffer instanceof ArrayBuffer) {
          procesarArchivo(buffer, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Confirmar y Enviar al Backend
  const ejecutarCargaMasiva = async () => {
    if (payloadData.length === 0) {
      alert('No hay registros válidos para cargar.');
      return;
    }

    setSubiendo(true);
    setUploadStatus(null);
    setProgreso(0);

    const batchSize = 20;
    let totalProcesados = 0;
    const token = localStorage.getItem('token');

    try {
      for (let i = 0; i < payloadData.length; i += batchSize) {
        const chunk = payloadData.slice(i, i + batchSize);
        
        const res = await fetch(`${backendUrl}/api/assets/bulk-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(chunk)
        });

        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          let errorMsg = `Error en el lote ${Math.floor(i / batchSize) + 1} (${res.status}).`;
          if (contentType.includes('application/json')) {
            const errData = await res.json();
            errorMsg = errData.message || errorMsg;
          } else {
            errorMsg += ' Verifique la conexión al backend.';
          }
          throw new Error(errorMsg);
        }

        if (!contentType.includes('application/json')) {
          throw new Error('El servidor no retornó una respuesta JSON válida.');
        }

        const result = await res.json();
        totalProcesados += result.processed_count || chunk.length;

        // Calcular porcentaje de progreso
        const percent = Math.min(Math.round(((i + chunk.length) / payloadData.length) * 100), 100);
        setProgreso(percent);
      }

      setUploadStatus({
        success: true,
        msg: `Carga Masiva completada con éxito: Se procesaron ${totalProcesados} registros de manera segura.`
      });
      setPreviewRows([]);
      setPayloadData([]);
      setFileName('');
    } catch (err: any) {
      setUploadStatus({
        success: false,
        msg: `Error durante la carga: ${err.message}`
      });
    } finally {
      setSubiendo(false);
      setProgreso(null);
    }
  };

  const limpiarCarga = () => {
    setPreviewRows([]);
    setPayloadData([]);
    setFileName('');
    setUploadStatus(null);
  };

  if (checkingAdmin) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 animate-pulse">
        Verificando nivel de autorización...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Database className="w-8 h-8 text-blue-400" /> Carga Masiva de Inventario (Excel / CSV)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pueble y regularice el parque informático de CPUs, Impresoras o Economato en lote usando formatos de plantillas oficiales de la Caja Tacna.
        </p>
      </div>

      {/* Selectores de Formatos */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Template 1: CPUs */}
        <div 
          onClick={() => { setSelectedTemplate('cpu'); limpiarCarga(); }}
          className={`p-6 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-48 ${
            selectedTemplate === 'cpu' 
              ? 'bg-blue-950/20 border-blue-500 shadow-lg shadow-blue-500/10' 
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Computadores y Laptops</span>
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white">Formato DB_CPU.xlsx</h3>
            <p className="text-xs text-slate-400">Estructura para PCs, laptops y servidores asignados o por asignar.</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); descargarPlantillaCPU(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-650 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition mt-4 w-fit"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla
          </button>
        </div>

        {/* Template 2: Impresoras */}
        <div 
          onClick={() => { setSelectedTemplate('impresora'); limpiarCarga(); }}
          className={`p-6 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-48 ${
            selectedTemplate === 'impresora' 
              ? 'bg-blue-950/20 border-blue-500 shadow-lg shadow-blue-500/10' 
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Impresoras Corporativas</span>
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-white">Formato DB_IMPRESORAS.xlsx</h3>
            <p className="text-xs text-slate-400">Estructura dedicada para impresoras locales o de red por agencia.</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); descargarPlantillaImpresoras(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-650 hover:bg-purple-600 rounded-lg text-xs font-bold text-white transition mt-4 w-fit"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla
          </button>
        </div>

        {/* Template 3: Economato */}
        <div 
          onClick={() => { setSelectedTemplate('economato'); limpiarCarga(); }}
          className={`p-6 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-48 ${
            selectedTemplate === 'economato' 
              ? 'bg-blue-950/20 border-blue-500 shadow-lg shadow-blue-500/10' 
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Economato y Repuestos</span>
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white">Formato DB_ECONOMATO.xlsx</h3>
            <p className="text-xs text-slate-400">Exclusivo para la carga de insumos/repuestos con código, descripción y cantidad.</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); descargarPlantillaEconomato(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-650 hover:bg-amber-600 rounded-lg text-xs font-bold text-white transition mt-4 w-fit"
          >
            <Download className="w-3.5 h-3.5" /> Descargar Plantilla
          </button>
        </div>

      </section>

      {/* Caja de Carga */}
      <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" /> Carga del Archivo (Formato: {selectedTemplate.toUpperCase()})
        </h3>
        
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition ${
            dragActive 
              ? 'border-blue-500 bg-blue-950/10' 
              : 'border-slate-800 bg-slate-950/40 hover:border-slate-750'
          }`}
        >
          <Upload className="w-10 h-10 text-slate-500" />
          <div className="text-center space-y-1">
            <p className="text-xs text-white font-semibold">Arrastre y suelte su archivo aquí</p>
            <p className="text-[11px] text-slate-500">Soporta formatos de Excel (.xlsx, .xls) y CSV (.csv)</p>
          </div>
          
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition text-slate-200 border border-slate-700">
            Buscar Archivo local
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-blue-400">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>{fileName}</span>
            </div>
          )}
        </div>
      </section>

      {/* Resultados de la Transmisión (Success / Error Alert) */}
      {uploadStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          uploadStatus.success 
            ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400' 
            : 'bg-red-950/20 border-red-900/60 text-red-400'
        }`}>
          {uploadStatus.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <div>
            <p className="font-bold">{uploadStatus.success ? 'Proceso Exitoso' : 'Error en la Carga'}</p>
            <p className="mt-1 opacity-90">{uploadStatus.msg}</p>
          </div>
        </div>
      )}

      {/* Sección de Vista Previa y Carga */}
      {previewRows.length > 0 && (
        <section className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Vista Previa e Inspección de Datos</h3>
              <p className="text-xs text-slate-400">
                Se detectaron {previewRows.length} registros. Se han validado las reglas del negocio de ITIL y la CMDB de la Caja Tacna.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={limpiarCarga}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg text-xs font-bold transition border border-slate-750"
              >
                Cancelar Carga
              </button>
              
              <button
                onClick={ejecutarCargaMasiva}
                disabled={subiendo || payloadData.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/10"
              >
                {subiendo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo...
                  </>
                ) : (
                  <>
                    Confirmar e Importar {payloadData.length} Activos <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {progreso !== null && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-855 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-blue-400 animate-pulse">Procesando lotes en base de datos...</span>
                <span className="text-slate-300 font-mono">{progreso}% completado</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          )}

          {/* Tabla de Vista Previa */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-96 overflow-y-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-900/50 text-slate-400 text-[10px] uppercase font-bold">
                  <th className="p-3 w-16">Fila</th>
                  <th className="p-3 w-28">Estado</th>
                  <th className="p-3 w-40">Identificador (Serie / EAN)</th>
                  <th className="p-3">Detalles Detectados</th>
                  <th className="p-3">Agencia Destino</th>
                  <th className="p-3 text-right">Detalle Validación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {previewRows.slice(0, 15).map((row, index) => {
                  const serie = selectedTemplate === 'cpu' ? row.data['SERIE'] 
                              : selectedTemplate === 'impresora' ? row.data['SERIE'] 
                              : row.data['CODIGO'] || '(Autogenerado)';
                  
                  const host = selectedTemplate === 'cpu' ? row.data['HOST'] 
                             : selectedTemplate === 'impresora' ? `PRN-${serie}`
                             : `Cant: ${row.data['CANTIDAD'] || 1} | Reg: ${row.data['FECHA_REGISTRO'] || ''}`;

                  const desc = selectedTemplate === 'cpu' ? row.data['EQUIPO'] || 'CPU'
                             : selectedTemplate === 'impresora' ? row.data['TIPO'] || 'IMPRESORA'
                             : row.data['DESCRIPCION'] || 'N/A';

                  const agencia = selectedTemplate === 'cpu' ? row.data['AGENCIA'] 
                                : selectedTemplate === 'impresora' ? row.data['AGENCIA'] 
                                : `Por: ${row.data['USUARIO_REGISTRO'] || 'admin'}`;

                  return (
                    <tr 
                      key={index} 
                      className={`transition ${row.isValid ? 'hover:bg-slate-900/30' : 'bg-red-950/10 hover:bg-red-950/20'}`}
                    >
                      <td className="p-3 font-mono text-slate-500 font-bold">{row.index}</td>
                      <td className="p-3">
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-900/30">VÁLIDO</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 text-[10px] font-bold border border-red-900/30">RECHAZADO</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-white">{serie || 'VACÍO'}</td>
                      <td className="p-3 text-slate-300">
                        <span className="font-bold text-blue-400">{desc}</span> | Estación: <span className="font-mono text-slate-400">{host}</span>
                      </td>
                      <td className="p-3 text-slate-350 font-bold">{agencia}</td>
                      <td className="p-3 text-right">
                        {row.isValid ? (
                          <span className="text-slate-500">Listo para CMDB</span>
                        ) : (
                          <span className="text-red-400 font-bold">{row.errorMsg}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {previewRows.length > 15 && (
              <div className="p-3 text-center text-slate-500 border-t border-slate-850 text-[10px] bg-slate-900/20 uppercase tracking-wider font-semibold">
                Mostrando los primeros 15 registros de {previewRows.length} totales.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
