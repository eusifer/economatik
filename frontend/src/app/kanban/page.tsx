'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, UserCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface Ticket {
  id: string;
  key: string;
  canal_origen: string;
  resumen: string;
  sintoma_descripcion: string;
  status: string;
  prioridad: string;
  tecnico_id: string | null;
  tecnico_username: string | null;
  agencia_id: string;
  serie_activo: string | null;
}

export default function KanbanPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(false);
  const [criticosMap, setCriticosMap] = useState<Record<string, boolean>>({});

  // Columnas en el orden reglamentario
  const columnas = [
    { id: 'To Do', title: 'To Do', color: 'border-t-slate-500 bg-slate-900/30' },
    { id: 'In Progress', title: 'In Progress', color: 'border-t-blue-500 bg-blue-950/10' },
    { id: 'En Tránsito a Taller', title: 'En Tránsito a Taller', color: 'border-t-orange-500 bg-amber-950/10' },
    { id: 'Done', title: 'Done', color: 'border-t-green-500 bg-green-950/10' }
  ];

  useEffect(() => {
    cargarTickets();
  }, []);

  const cargarTickets = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetTickets {
              listTickets {
                id
                key
                canal_origen
                resumen
                sintoma_descripcion
                status
                prioridad
                tecnico_id
                tecnico_username
                agencia_id
                serie_activo
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.data && data.data.listTickets) {
        const ticketList = data.data.listTickets;
        setTickets(ticketList);
        // Validar semáforo rojo para cada activo en serie
        ticketList.forEach((t: Ticket) => {
          if (t.serie_activo) {
            evaluarCritico(t.serie_activo);
          }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const evaluarCritico = async (serie: string) => {
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query CheckCritico($serie: String!) {
              checkHistorialActivo(serie: $serie)
            }
          `,
          variables: { serie }
        })
      });
      const data = await res.json();
      if (data.data) {
        setCriticosMap(prev => ({
          ...prev,
          [serie]: data.data.checkHistorialActivo
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const moverEstado = async (ticketId: string, nuevoEstado: string) => {
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
            mutation UpdateStatus($id: ID!, $status: String!) {
              updateTicketStatus(ticketId: $id, status: $status) {
                id
                status
              }
            }
          `,
          variables: { id: ticketId, status: nuevoEstado }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        // Actualizar estado localmente
        setTickets(prev =>
          prev.map(t => (t.id === ticketId ? { ...t, status: nuevoEstado } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const asignarTecnico = async (ticketId: string) => {
    const tecnicoId = prompt('Ingrese el ID del técnico (ej. tecnico-uuid-2222 para tecnico1):');
    if (!tecnicoId) return;

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
            mutation AssignTech($tId: ID!, $techId: ID!) {
              asignarTecnicoTicket(ticketId: $tId, tecnicoId: $techId) {
                id
                tecnico_username
              }
            }
          `,
          variables: { tId: ticketId, techId: tecnicoId }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert('Técnico asignado con éxito.');
        cargarTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tablero Kanban Logístico</h1>
          <p className="text-sm text-slate-400 mt-1">Seguimiento e interactividad del flujo de atención técnica.</p>
        </div>
        <button
          onClick={cargarTickets}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition rounded-lg text-sm border border-slate-700"
        >
          Refrescar Tablero
        </button>
      </div>

      {cargando && <div className="text-blue-400 text-sm">Cargando tickets...</div>}

      {/* Grid Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {columnas.map((col) => {
          const ticketsFiltrados = tickets.filter(t => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-2xl border-t-4 border-slate-850 p-4 space-y-4 min-h-[500px] flex flex-col ${col.color}`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h2 className="font-bold text-slate-200 text-sm tracking-wider uppercase">{col.title}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {ticketsFiltrados.length}
                </span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto">
                {ticketsFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-600">Sin tickets en esta etapa</div>
                ) : (
                  ticketsFiltrados.map((ticket) => {
                    const isCritico = ticket.serie_activo ? criticosMap[ticket.serie_activo] : false;

                    return (
                      <div
                        key={ticket.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition"
                      >
                        {/* Indicador Semáforo Rojo */}
                        {isCritico && (
                          <div 
                            role="alert" 
                            aria-live="assertive"
                            className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-950 text-red-400 px-2 py-0.5 rounded-full border border-red-900 animate-pulse-critical"
                          >
                            <AlertOctagon className="w-3 h-3 text-red-500" /> 🔴 ROJO CRÍTICO (3+ FALLAS)
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono font-bold text-blue-400">{ticket.key}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ticket.prioridad === 'Alta' ? 'bg-red-950 text-red-400' :
                            ticket.prioridad === 'Media' ? 'bg-amber-950 text-amber-400' : 'bg-slate-950 text-slate-400'
                          }`}>
                            {ticket.prioridad}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-white leading-tight">{ticket.resumen}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ticket.sintoma_descripcion}</p>
                        </div>

                        {/* Metadata */}
                        <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/50 p-2 rounded-lg">
                          <div><span className="text-slate-500">Sede:</span> {ticket.agencia_id}</div>
                          {ticket.serie_activo && (
                            <div><span className="text-slate-500">Serie:</span> {ticket.serie_activo}</div>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span>{ticket.tecnico_username ? `Técnico: ${ticket.tecnico_username}` : 'Sin Técnico'}</span>
                          </div>
                        </div>

                        {/* Botones de Operación (Accesibles para Teclado) */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                          {!ticket.tecnico_id && (
                            <button
                              onClick={() => asignarTecnico(ticket.id)}
                              className="text-left text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition focus:outline-none"
                            >
                              + Asignar Técnico
                            </button>
                          )}

                          <div className="flex items-center justify-between">
                            <label htmlFor={`mover-${ticket.id}`} className="sr-only">Mover Estado</label>
                            <select
                              id={`mover-${ticket.id}`}
                              value={ticket.status}
                              onChange={(e) => moverEstado(ticket.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:ring-1 focus:ring-blue-500"
                            >
                              <option disabled>Mover a...</option>
                              {columnas.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>

                            {ticket.status === 'Done' && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
