'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Save } from 'lucide-react';

export default function TriajePage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [serieBusqueda, setSerieBusqueda] = useState('');
  const [registroContingencia, setRegistroContingencia] = useState(false);
  const [esCritico, setEsCritico] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estados del Formulario
  const [canalOrigen, setCanalOrigen] = useState('Plataforma');
  const [resumen, setResumen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('Media');
  const [agenciaSede, setAgenciaSede] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [usuarioFinal, setUsuarioFinal] = useState('');
  const [datosContingenciaTexto, setDatosContingenciaTexto] = useState('');

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
      // 1. Llamar a GraphQL searchActivo
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
        setAgenciaSede(activo.ubicacion_agencia);
        
        // Semáforo Rojo Crítico
        setEsCritico(data.data.checkHistorialActivo);
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
      setAgenciaSede('');
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
        alert(`Ticket creado con éxito! Código: ${ticketCreated.key} | Estado: ${ticketCreated.status}`);
        // Reset form
        setResumen('');
        setDescripcion('');
        setSerieBusqueda('');
        setDatosContingenciaTexto('');
        setEsCritico(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar el ticket.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 bg-slate-900/60 p-8 rounded-2xl border border-slate-800 backdrop-blur-md">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Triaje Inbound de Incidencias</h1>
        <p className="text-sm text-slate-400 mt-1">Registrar ticket de soporte técnico y consultar hoja de vida del equipo.</p>
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

      {/* Alerta Semáforo Crítico */}
      {esCritico && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 animate-pulse-critical"
        >
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <div className="text-sm font-bold">🔴 ROJO CRÍTICO</div>
            <div className="text-xs text-red-400">Este equipo acumula 3 o más atenciones técnicas previas en PostgreSQL. Evalué reemplazo.</div>
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
            <option value="Plataforma">Plataforma</option>
            <option value="Llamada">Llamada</option>
          </select>
        </div>

        {/* Búsqueda de Serie (Normal) */}
        {!registroContingencia && (
          <div className="flex flex-col gap-2 relative">
            <label htmlFor="serie" className="text-sm font-semibold text-slate-300">Número de Serie o IP del Activo</label>
            <div className="relative">
              <input
                id="serie"
                type="text"
                placeholder="Digitar 3+ caracteres (ej. KOD-3021)..."
                value={serieBusqueda}
                onChange={(e) => setSerieBusqueda(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
              />
              {cargando && (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3.5" />
              )}
            </div>
          </div>
        )}

        {/* Datos Autocompletados o de Contingencia */}
        <div className="space-y-4 border-t border-slate-800/60 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ficha de Identificación del Equipo</h3>

          {/* Tipo de Equipo */}
          <div className="flex flex-col gap-2">
            <label htmlFor="tipo" className="text-sm font-semibold text-slate-300">Tipo de Equipo</label>
            <input
              id="tipo"
              type="text"
              readOnly={!registroContingencia}
              aria-readonly={!registroContingencia}
              placeholder={registroContingencia ? 'Ingresar tipo de CPU/Escaner manualmente' : 'Autocompletado...'}
              value={tipoEquipo}
              onChange={(e) => setTipoEquipo(e.target.value)}
              className={`bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 ${
                !registroContingencia ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Marca / Modelo */}
          <div className="flex flex-col gap-2">
            <label htmlFor="marca" className="text-sm font-semibold text-slate-300">Marca - Modelo</label>
            <input
              id="marca"
              type="text"
              readOnly={!registroContingencia}
              aria-readonly={!registroContingencia}
              placeholder={registroContingencia ? 'Ingresar marca/modelo manualmente' : 'Autocompletado...'}
              value={marcaModelo}
              onChange={(e) => setMarcaModelo(e.target.value)}
              className={`bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 ${
                !registroContingencia ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Usuario Final */}
          <div className="flex flex-col gap-2">
            <label htmlFor="usuario" className="text-sm font-semibold text-slate-300">Usuario Responsable</label>
            <input
              id="usuario"
              type="text"
              readOnly={!registroContingencia}
              aria-readonly={!registroContingencia}
              placeholder={registroContingencia ? 'Ingresar responsable del bien' : 'Autocompletado...'}
              value={usuarioFinal}
              onChange={(e) => setUsuarioFinal(e.target.value)}
              className={`bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 ${
                !registroContingencia ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Agencia Sede */}
          <div className="flex flex-col gap-2">
            <label htmlFor="sede" className="text-sm font-semibold text-slate-300">Agencia Sede *</label>
            <input
              id="sede"
              type="text"
              readOnly={!registroContingencia}
              aria-readonly={!registroContingencia}
              placeholder={registroContingencia ? 'Ingresar sede física obligatoria' : 'Autocompletado...'}
              value={agenciaSede}
              onChange={(e) => setAgenciaSede(e.target.value)}
              className={`bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 ${
                !registroContingencia ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Inputs del Ticket */}
        <div className="space-y-4 border-t border-slate-800/60 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalles de la Incidencia</h3>

          {/* Resumen */}
          <div className="flex flex-col gap-2">
            <label htmlFor="resumen" className="text-sm font-semibold text-slate-300">Resumen Breve *</label>
            <input
              id="resumen"
              type="text"
              placeholder="Ej. Rodillo de arrastre del escáner desgastado"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Síntoma / Descripción */}
          <div className="flex flex-col gap-2">
            <label htmlFor="descripcion" className="text-sm font-semibold text-slate-300">Diagnóstico / Síntoma de Falla *</label>
            <textarea
              id="descripcion"
              rows={4}
              placeholder="Describa el comportamiento anómalo del hardware..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
          <Save className="w-4 h-4" /> Guardar Ticket de Soporte
        </button>
      </form>
    </div>
  );
}
