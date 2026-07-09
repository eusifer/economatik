'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Save, PhoneCall, UserCheck, History, Settings } from 'lucide-react';

export default function TriajePage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [serieBusqueda, setSerieBusqueda] = useState('');
  const [registroContingencia, setRegistroContingencia] = useState(false);
  const [esCritico, setEsCritico] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados del Formulario
  const [canalOrigen, setCanalOrigen] = useState('Llamada'); // Default Llamada para Mesa de Ayuda
  const [resumen, setResumen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [agenciaSede, setAgenciaSede] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [usuarioFinal, setUsuarioFinal] = useState('');
  const [datosContingenciaTexto, setDatosContingenciaTexto] = useState('');

  // Nuevos estados para robustecer triaje (Reconciliación y FCR)
  const [usuarioReporta, setUsuarioReporta] = useState('');
  const [cantidadIntervenciones, setCantidadIntervenciones] = useState(0);
  const [tratamiento, setTratamiento] = useState('Derivar'); // 'Derivar' -> To Do, 'FCR' -> Done
  const [historialTickets, setHistorialTickets] = useState<any[]>([]);

  // Efecto para buscar activo dinámicamente cuando escribe 3+ caracteres
  useEffect(() => {
    if (serieBusqueda.length >= 3 && !registroContingencia) {
      const delayDebounce = setTimeout(() => {
        ejecutarBusquedaActivo(serieBusqueda);
      }, 400); // Debounce de 400ms
      return () => clearTimeout(delayDebounce);
    } else {
      limpiarCamposAutocompletados();
      setEsCritico(false);
    }
  }, [serieBusqueda, registroContingencia]);

  const ejecutarBusquedaActivo = async (serie: string) => {
    setCargando(true);
    try {
      // Llamar a GraphQL searchActivo y obtener historial/llamadas en un solo request
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query SearchActivo($q: String!) {
              searchActivo(query: $q) {
                numero_serie
                tipo_equipo
                marca
                modelo
                nombre_usuario_final
                ubicacion_agencia
              }
              checkHistorialActivo(serie: $q)
              countTicketsActivo(serie: $q)
              getHistorialActivo(serie: $q) {
                key
                resumen
                sintoma_descripcion
                status
                tecnico_username
                fecha_creacion
                fecha_resolucion
              }
            }
          `,
          variables: { q: serie }
        })
      });

      const data = await res.json();
      if (data.data && data.data.searchActivo) {
        const activo = data.data.searchActivo;
        setTipoEquipo(activo.tipo_equipo);
        setMarcaModelo(`${activo.marca} - ${activo.modelo}`);
        setUsuarioFinal(activo.nombre_usuario_final);
        
        // Inicializar por defecto el usuario que reporta con el dueño del equipo
        setUsuarioReporta(activo.nombre_usuario_final);
        setAgenciaSede(activo.ubicacion_agencia);
        
        // Historial e intervenciones
        setEsCritico(data.data.checkHistorialActivo);
        setCantidadIntervenciones(data.data.countTicketsActivo || 0);
        setHistorialTickets(data.data.getHistorialActivo || []);
      } else {
        limpiarCamposAutocompletados();
        setEsCritico(false);
      }
    } catch (error) {
      console.error('Error al consultar activo:', error);
    } finally {
      setCargando(false);
    }
  };

  const limpiarCamposAutocompletados = () => {
    if (!registroContingencia) {
      setTipoEquipo('');
      setMarcaModelo('');
      setUsuarioFinal('');
      setUsuarioReporta('');
      setAgenciaSede('');
      setCantidadIntervenciones(0);
      setHistorialTickets([]);
    }
  };

  const guardarTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumen || !descripcion || !agenciaSede) {
      alert('Por favor complete los campos obligatorios: Resumen, Descripción y Sede/Agencia.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Mapear tratamiento a estado de ticket
      const ticketStatus = tratamiento === 'FCR' ? 'Done' : 'To Do';

      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation CreateTicket(
              $canal: String!
              $resumen: String!
              $sintoma: String!
              $prioridad: String!
              $agencia: String!
              $serie: String
              $usuarioReporta: String
              $status: String
              $contingencia: Boolean!
              $contingenciaTexto: String
            ) {
              createTicket(
                canal_origen: $canal
                resumen: $resumen
                sintoma_descripcion: $sintoma
                prioridad: $prioridad
                agencia_id: $agencia
                serie_activo: $serie
                usuario_reporta: $usuarioReporta
                status: $status
                registro_manual_contingencia: $contingencia
                datos_contingencia_texto: $contingenciaTexto
              ) {
                id
                key
                status
              }
            }
          `,
          variables: {
            canal: canalOrigen,
            resumen,
            sintoma: descripcion,
            prioridad,
            agencia: agenciaSede,
            serie: registroContingencia ? null : serieBusqueda,
            usuarioReporta: usuarioReporta || null,
            status: ticketStatus,
            contingencia: registroContingencia,
            contingenciaTexto: registroContingencia ? datosContingenciaTexto : null
          }
        })
      });

      const result = await res.json();
      if (result.errors) {
        alert(`Error: ${result.errors[0].message}`);
      } else {
        const ticketCreated = result.data.createTicket;
        alert(`Incidencia registrada con éxito!\nCódigo: ${ticketCreated.key}\nEstado: ${ticketCreated.status === 'Done' ? 'RESUELTO EN LÍNEA (FCR)' : 'DERIVADO A KANBAN (TO DO)'}`);
        
        // Recargar datos y estadísticas
        if (serieBusqueda) {
          ejecutarBusquedaActivo(serieBusqueda);
        }

        // Reset form
        setResumen('');
        setDescripcion('');
        setDatosContingenciaTexto('');
        setEsCritico(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar el ticket.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 bg-slate-900/60 p-8 rounded-2xl border border-slate-800 backdrop-blur-md">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-blue-400" /> Mesa de Ayuda / Triaje
          </h1>
          <p className="text-sm text-slate-400 mt-1">Registrar ticket de soporte técnico y consultar hoja de vida del equipo.</p>
        </div>
      </div>

      {/* Switch Contingencia */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
        <div>
          <label htmlFor="contingencia-switch" className="text-sm font-semibold text-slate-200">Modo de Contingencia</label>
          <p className="text-xs text-slate-500 mt-0.5">Libera inputs bloqueados en caso de falla de red.</p>
        </div>
        <button
          id="contingencia-switch"
          onClick={() => {
            setRegistroContingencia(!registroContingencia);
            setEsCritico(false);
            limpiarCamposAutocompletados();
          }}
          aria-checked={registroContingencia}
          role="switch"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-blue-500 ${
            registroContingencia ? 'bg-red-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              registroContingencia ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Alerta Semáforo Crítico / Conteo de Historial */}
      {!registroContingencia && cantidadIntervenciones > 0 && (
        <div 
          role="alert" 
          aria-live="assertive"
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            esCritico 
              ? 'bg-red-950/40 border-red-800/40 text-red-200 animate-pulse-critical' 
              : 'bg-amber-950/20 border-amber-800/30 text-amber-200'
          }`}
        >
          {esCritico ? (
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
          ) : (
            <History className="w-6 h-6 text-amber-500 shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold uppercase tracking-wide">
              {esCritico ? '🔴 ROJO CRÍTICO' : '⚠️ HISTORIAL DE LLAMADAS'}
            </div>
            <div className="text-xs mt-0.5">
              Este equipo registra <span className="font-bold underline">{cantidadIntervenciones}</span> intervenciones previas en PostgreSQL. 
              {esCritico && ' Se aconseja iniciar trámite para baja definitiva (INF-BAJA).'}
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={guardarTicket} className="space-y-6">
        
        {/* Canal Origen */}
        <div className="flex flex-col gap-2">
          <label htmlFor="canal" className="text-sm font-semibold text-slate-300">Canal de Origen *</label>
          <select
            id="canal"
            value={canalOrigen}
            onChange={(e) => setCanalOrigen(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="Llamada">Atención Telefónica (Llamada)</option>
            <option value="Correo">Correo Electrónico</option>
            <option value="Plataforma">Portal de Autoservicio</option>
          </select>
        </div>

        {/* Búsqueda de Serie o IP (Normal) */}
        {!registroContingencia && (
          <div className="flex flex-col gap-2 relative">
            <label htmlFor="serie" className="text-sm font-semibold text-slate-300">Número de Serie o Dirección IP del Equipo</label>
            <div className="relative">
              <input
                id="serie"
                type="text"
                placeholder="ej. YLT1ABWL o 192.168.20.29..."
                value={serieBusqueda}
                onChange={(e) => setSerieBusqueda(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
              {cargando && (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3.5" />
              )}
            </div>
            <p className="text-[10px] text-slate-500">El sistema buscará en la CMDB y precargará marca, modelo y usuario.</p>
          </div>
        )}

        {/* Datos Autocompletados de CMDB */}
        <div className="space-y-4 border-t border-slate-800/60 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identificación de Activo (CMDB)</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipo de Equipo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tipo" className="text-xs text-slate-400 font-semibold">Tipo de Activo</label>
              <input
                id="tipo"
                type="text"
                readOnly={!registroContingencia}
                value={tipoEquipo}
                placeholder="Autodetectado"
                onChange={(e) => setTipoEquipo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white opacity-70"
              />
            </div>

            {/* Marca / Modelo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="marca" className="text-xs text-slate-400 font-semibold">Marca y Modelo</label>
              <input
                id="marca"
                type="text"
                readOnly={!registroContingencia}
                value={marcaModelo}
                placeholder="Autodetectado"
                onChange={(e) => setMarcaModelo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white opacity-70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Usuario Responsable en Actas */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario" className="text-xs text-slate-400 font-semibold">Usuario en Inventario (CMDB)</label>
              <input
                id="usuario"
                type="text"
                readOnly={!registroContingencia}
                value={usuarioFinal}
                placeholder="Autodetectado"
                onChange={(e) => setUsuarioFinal(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white opacity-70"
              />
            </div>

            {/* Agencia Sede */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sede" className="text-xs text-slate-400 font-semibold">Agencia o Sede *</label>
              <input
                id="sede"
                type="text"
                readOnly={!registroContingencia}
                value={agenciaSede}
                placeholder={registroContingencia ? 'Ingresar sede física' : 'Autodetectado'}
                onChange={(e) => setAgenciaSede(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white opacity-70"
              />
            </div>
          </div>
        </div>

        {/* Historial Detallado de Incidentes de este Activo */}
        {!registroContingencia && historialTickets.length > 0 && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" /> Historial de Atenciones del Equipo
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="p-3">Ticket</th>
                    <th className="p-3">Resumen / Síntoma</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Atendió</th>
                    <th className="p-3">Fechas</th>
                  </tr>
                </thead>
                <tbody>
                  {historialTickets.map((t: any) => (
                    <tr key={t.key} className="border-b border-slate-850 hover:bg-slate-900/40 transition">
                      <td className="p-3 font-mono font-bold text-blue-400">{t.key}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{t.resumen}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.sintoma_descripcion}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          t.status === 'Done' ? 'bg-green-950/30 text-green-400 border border-green-900/30' :
                          t.status === 'In Progress' ? 'bg-blue-950/30 text-blue-400 border border-blue-900/30' :
                          t.status === 'En Tránsito a Taller' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30' :
                          'bg-slate-950/30 text-slate-400 border border-slate-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-medium">{t.tecnico_username || 'Sin Asignar'}</td>
                      <td className="p-3 text-[10px] text-slate-400 space-y-0.5 whitespace-nowrap">
                        <div>📅 <span className="font-semibold">Ape:</span> {t.fecha_creacion.substring(0, 10)}</div>
                        {t.fecha_resolucion && (
                          <div className="text-green-400">✅ <span className="font-semibold">Res:</span> {t.fecha_resolucion.substring(0, 10)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inputs del Ticket */}
        <div className="space-y-4 border-t border-slate-800/60 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tratamiento e Información del Reportante</h3>

          {/* Usuario que Reporta (En Vivo) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="usuario_reporta" className="text-sm font-semibold text-slate-300">Usuario que Llama / Reporta *</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                id="usuario_reporta"
                type="text"
                placeholder="Nombre de la persona que se comunica"
                value={usuarioReporta}
                onChange={(e) => setUsuarioReporta(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[10px] text-slate-500">Obligatorio. Se registra en la base de datos para la medición mensual de incidentes.</p>
          </div>

          {/* Resumen */}
          <div className="flex flex-col gap-2">
            <label htmlFor="resumen" className="text-sm font-semibold text-slate-300">Asunto / Falla Reportada *</label>
            <input
              id="resumen"
              type="text"
              placeholder="Ej. Pantalla azul al iniciar o Pinpad no lee tarjetas"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Síntoma / Descripción */}
          <div className="flex flex-col gap-2">
            <label htmlFor="descripcion" className="text-sm font-semibold text-slate-300">Detalles del Incidente *</label>
            <textarea
              id="descripcion"
              rows={3}
              placeholder="Describa el comportamiento anómalo reportado o la solución aplicada en línea..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Prioridad */}
            <div className="flex flex-col gap-2">
              <label htmlFor="prioridad" className="text-sm font-semibold text-slate-300">Prioridad *</label>
              <select
                id="prioridad"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>

            {/* Selector de Tratamiento de Incidente */}
            <div className="flex flex-col gap-2">
              <label htmlFor="tratamiento" className="text-sm font-semibold text-slate-300">Tratamiento / Destino *</label>
              <select
                id="tratamiento"
                value={tratamiento}
                onChange={(e) => setTratamiento(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Derivar">Derivar a Técnico (Kanban - To Do)</option>
                <option value="FCR">Solución en Línea (FCR - Done)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Campos Cifrados en modo Contingencia */}
        {registroContingencia && (
          <div className="space-y-4 border-t border-slate-800/60 pt-4">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Cifrado de Contingencia (AES-256)</h3>
            <div className="flex flex-col gap-2">
              <label htmlFor="contingencia-datos" className="text-sm font-semibold text-slate-300">Datos Sensibles a Encriptar *</label>
              <textarea
                id="contingencia-datos"
                rows={3}
                placeholder="Ingrese nombres, documentos o números de serie provisionales que serán encriptados en reposo..."
                value={datosContingenciaTexto}
                onChange={(e) => setDatosContingenciaTexto(e.target.value)}
                className="bg-slate-950 border border-red-900/60 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}

        {/* Botón Guardar */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/25"
        >
          <Save className="w-4 h-4" /> Registrar Incidencia
        </button>
      </form>
    </div>
  );
}
