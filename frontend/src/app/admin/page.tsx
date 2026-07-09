'use client';

import React, { useState } from 'react';
import { Upload, FileText, Download, RefreshCw, Cpu } from 'lucide-react';

export default function AdminPage() {
  // Estado para la carga masiva
  const [jsonActivos, setJsonActivos] = useState(`[
  {
    "numero_serie": "KOD-3021",
    "tipo_equipo": "Scanner Kodak i2900",
    "marca": "Kodak",
    "modelo": "i2900",
    "ip_asignada": "10.200.12.44",
    "nombre_estacion": "Ventanilla-03",
    "usuario_red_asignado": "lrodriguez",
    "nombre_usuario_final": "Luis Rodriguez",
    "ubicacion_agencia": "Sede Cusco"
  },
  {
    "numero_serie": "CPU-5542",
    "tipo_equipo": "Workstation Dell 7090",
    "marca": "Dell",
    "modelo": "Optiplex 7090",
    "ip_asignada": "10.200.12.80",
    "nombre_estacion": "MesaPartes-01",
    "usuario_red_asignado": "mperez",
    "nombre_usuario_final": "Maria Perez",
    "ubicacion_agencia": "Sede Tacna"
  }
]`);

  // Estados para Informes
  const [informeNum, setInformeNum] = useState('');
  const [diagTecnico, setDiagTecnico] = useState('');
  const [sustLogistico, setSustLogistico] = useState('');
  const [serieActivoBaja, setSerieActivoBaja] = useState('');

  // Estados para Renovación
  const [serieViejo, setSerieViejo] = useState('');
  const [serieNuevo, setSerieNuevo] = useState('');

  const ejecutarCargaMasiva = async () => {
    try {
      const data = JSON.parse(jsonActivos);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/assets/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (res.status === 200) {
        alert(`Éxito: ${result.message} - ${result.processed_count} activos indexados en la CMDB.`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Error en formato JSON: ${err.message}`);
    }
  };

  const descargarExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debe iniciar una sesión simulada en el inicio para descargar el reporte.');
        return;
      }

      const res = await fetch('http://localhost:4000/api/reports/download', {
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
      const res = await fetch('http://localhost:4000/graphql', {
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
      const res = await fetch('http://localhost:4000/graphql', {
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
      const res = await fetch('http://localhost:4000/graphql', {
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Carga Masiva (Izquierda) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" /> Carga Masiva de Facturas / Adquisiciones
          </h2>
          <p className="text-xs text-slate-400">Pegue un payload de activos en formato JSON para simular el procesamiento de facturas de hardware a la CMDB.</p>
          
          <textarea
            rows={10}
            value={jsonActivos}
            onChange={(e) => setJsonActivos(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={ejecutarCargaMasiva}
            className="w-full py-2.5 bg-blue-650 hover:bg-blue-600 transition rounded-lg text-sm font-bold text-white"
          >
            Procesar e Ingresar a CMDB
          </button>
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
