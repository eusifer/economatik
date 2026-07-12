'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, UserCheck, AlertOctagon, CheckCircle2, RefreshCw, FileText, User } from 'lucide-react';

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

  // Estados del modal de reemplazo tecnológico
  const [modalReemplazoAbierto, setModalReemplazoAbierto] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);
  const [activosDisponibles, setActivosDisponibles] = useState<any[]>([]);
  const [activoNuevoSeleccionado, setActivoNuevoSeleccionado] = useState('');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [destinatarioCargo, setDestinatarioCargo] = useState('');
  const [jefeInmediatoNombre, setJefeInmediatoNombre] = useState('');
  const [procesandoReemplazo, setProcesandoReemplazo] = useState(false);

  // Estados para Registro en Caliente
  const [registroCaliente, setRegistroCaliente] = useState(false);
  const [calienteTipo, setCalienteTipo] = useState('Monitor');
  const [calienteMarca, setCalienteMarca] = useState('');
  const [calienteModelo, setCalienteModelo] = useState('');
  const [calienteSerie, setCalienteSerie] = useState('');

  // Estados del modal de asignación de técnico
  const [modalTecnicoAbierto, setModalTecnicoAbierto] = useState(false);
  const [ticketParaAsignarTech, setTicketParaAsignarTech] = useState<Ticket | null>(null);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoSeleccionadoId, setTecnicoSeleccionadoId] = useState('');
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);

  // Estados del modal de solucionar y devolver a usuario
  const [modalSolucionarDevolverAbierto, setModalSolucionarDevolverAbierto] = useState(false);
  const [ticketParaSolucionar, setTicketParaSolucionar] = useState<Ticket | null>(null);
  const [devSedeDestino, setDevSedeDestino] = useState('');
  const [devDestinatarioNombre, setDevDestinatarioNombre] = useState('');
  const [devDestinatarioCargo, setDevDestinatarioCargo] = useState('');
  const [devJefeInmediatoNombre, setDevJefeInmediatoNombre] = useState('');
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

  // Columnas en el orden reglamentario
  const columnas = [
    { id: 'To Do', title: 'To Do', color: 'border-t-slate-500 bg-slate-900/30' },
    { id: 'In Progress', title: 'In Progress', color: 'border-t-blue-500 bg-blue-950/10' },
    { id: 'En Tránsito a Taller', title: 'En Tránsito a Taller', color: 'border-t-orange-500 bg-amber-950/10' },
    { id: 'Done', title: 'Done', color: 'border-t-green-500 bg-green-950/10' }
  ];

  useEffect(() => {
    cargarTickets();
    cargarTecnicos();
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
    const ticket = tickets.find(t => t.id === ticketId);
    if (nuevoEstado === 'Done' && ticket && ticket.serie_activo) {
      const contieneReemplazo = 
        ticket.resumen.toLowerCase().includes('reemplazo') || 
        ticket.sintoma_descripcion.toLowerCase().includes('reemplazo');
        
      if (contieneReemplazo) {
        abrirReemplazoFlow(ticket);
        return;
      }
    }

    await ejecutarCambioEstado(ticketId, nuevoEstado);
  };

  const ejecutarCambioEstado = async (ticketId: string, nuevoEstado: string) => {
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
        setTickets(prev =>
          prev.map(t => (t.id === ticketId ? { ...t, status: nuevoEstado } : t))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const abrirReemplazoFlow = async (ticket: Ticket) => {
    setTicketSeleccionado(ticket);
    setActivoNuevoSeleccionado('');
    setDestinatarioNombre('');
    setDestinatarioCargo('');
    setJefeInmediatoNombre('');
    
    setRegistroCaliente(false);
    setCalienteTipo('Monitor');
    setCalienteMarca('');
    setCalienteModelo('');
    setCalienteSerie('');

    setModalReemplazoAbierto(true);
    await cargarActivosDisponibles();
  };

  const cargarActivosDisponibles = async () => {
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              listActivosCMDB {
                numero_serie
                tipo_equipo
                marca
                modelo
                estado_asignacion
                ubicacion_agencia
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listActivosCMDB) {
        const disponibles = data.data.listActivosCMDB.filter((a: any) => 
          (a.ubicacion_agencia === 'Economato-Equipos' || a.ubicacion_agencia === 'Almacen-TIC') &&
          a.estado_asignacion === 'Pendiente de Asignación'
        );
        setActivosDisponibles(disponibles);
      }
    } catch (err) {
      console.error('Error al cargar activos para reemplazo:', err);
    }
  };

  const ejecutarReemplazoYDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSeleccionado || !destinatarioNombre || !destinatarioCargo || !jefeInmediatoNombre) {
      alert('Por favor complete todos los campos.');
      return;
    }

    if (!registroCaliente && !activoNuevoSeleccionado) {
      alert('Por favor seleccione un equipo de reemplazo.');
      return;
    }

    if (registroCaliente && (!calienteMarca || !calienteModelo || !calienteSerie)) {
      alert('Por favor complete todos los datos del equipo a registrar en caliente.');
      return;
    }

    setProcesandoReemplazo(true);
    try {
      const token = localStorage.getItem('token');
      let nuevoActivoSerie = activoNuevoSeleccionado;

      // 0. Si es registro en caliente, dar de alta primero en la CMDB
      if (registroCaliente) {
        const resCaliente = await fetch(`${backendUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            query: `
              mutation RegistrarHot($tipo: String!, $marca: String!, $modelo: String!, $serie: String!) {
                registrarIngresoActivo(
                  ubicacion_inicial: "Almacen-TIC"
                  tipo_equipo: $tipo
                  marca: $marca
                  modelo: $modelo
                  numero_serie: $serie
                  informacion_adicional: "Ingresado en caliente durante reemplazo."
                ) {
                  numero_serie
                }
              }
            `,
            variables: {
              tipo: calienteTipo,
              marca: calienteMarca,
              modelo: calienteModelo,
              serie: calienteSerie
            }
          })
        });
        const dataCaliente = await resCaliente.json();
        if (dataCaliente.errors) {
          throw new Error(`Registro en caliente fallido: ${dataCaliente.errors[0].message}`);
        }
        nuevoActivoSerie = dataCaliente.data.registrarIngresoActivo.numero_serie;
      }

      // 1. Ejecutar renovación tecnológica en backend (herencia de IP/Host)
      const resRenov = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation Renovacion($viejo: String!, $nuevo: String!) {
              renovacionTecnologica(serieViejo: $viejo, serieNuevo: $nuevo)
            }
          `,
          variables: {
            viejo: ticketSeleccionado.serie_activo,
            nuevo: nuevoActivoSerie
          }
        })
      });
      const dataRenov = await resRenov.json();
      if (dataRenov.errors) {
        throw new Error(dataRenov.errors[0].message);
      }

      // 2. Ejecutar asignación con acta de entrega
      const resAsig = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation Asignar(
              $serie: String!
              $destino: String!
              $nombre: String!
              $cargo: String!
              $jefe: String!
            ) {
              asignarActivoAgencia(
                numeroSerie: $serie
                destinoFinal: $destino
                destinatarioNombre: $nombre
                destinatarioCargo: $cargo
                jefeInmediatoNombre: $jefe
              )
            }
          `,
          variables: {
            serie: nuevoActivoSerie,
            destino: ticketSeleccionado.agencia_id,
            nombre: destinatarioNombre,
            cargo: destinatarioCargo,
            jefe: jefeInmediatoNombre
          }
        })
      });
      const dataAsig = await resAsig.json();
      if (dataAsig.errors) {
        throw new Error(dataAsig.errors[0].message);
      }

      // 3. Mover a Done
      await ejecutarCambioEstado(ticketSeleccionado.id, 'Done');
      
      alert('Reemplazo tecnológico y asignación de equipo nuevo registrados con éxito en la CMDB.');
      setModalReemplazoAbierto(false);

      // Abrir acta en nueva pestaña
      window.open(`/acta?serie=${nuevoActivoSerie}`, '_blank');
    } catch (err: any) {
      alert(`Error al registrar reemplazo: ${err.message}`);
    } finally {
      setProcesandoReemplazo(false);
    }
  };

  const cargarTecnicos = async () => {
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
              listTecnicos {
                id
                username
                nombre_completo
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listTecnicos) {
        setTecnicos(data.data.listTecnicos);
      }
    } catch (err) {
      console.error('Error al cargar técnicos:', err);
    }
  };

  const abrirModalAsignarTecnico = (ticket: Ticket) => {
    setTicketParaAsignarTech(ticket);
    setTecnicoSeleccionadoId(ticket.tecnico_id || '');
    setModalTecnicoAbierto(true);
  };

  const ejecutarAsignacionTecnico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketParaAsignarTech || !tecnicoSeleccionadoId) {
      alert('Por favor seleccione un técnico.');
      return;
    }

    setGuardandoTecnico(true);
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
          variables: { tId: ticketParaAsignarTech.id, techId: tecnicoSeleccionadoId }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert('Técnico asignado con éxito.');
        setModalTecnicoAbierto(false);
        cargarTickets();
      }
    } catch (err: any) {
      alert(`Error al asignar técnico: ${err.message}`);
    } finally {
      setGuardandoTecnico(false);
    }
  };

  const confirmarLlegadaTallerKanban = async (ticket: Ticket) => {
    if (!ticket.serie_activo) return;
    if (!window.confirm(`¿Confirma la llegada física del activo ${ticket.serie_activo} al taller de soporte técnico?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      // 1. Confirmar la recepción del traslado
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation ConfirmarLlegadaTaller($serie: String!) {
              confirmarRecepcionTraslado(numeroSerie: $serie)
            }
          `,
          variables: { serie: ticket.serie_activo }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
        return;
      }

      // 2. Mover el ticket a "In Progress" para su diagnóstico/reparación
      await ejecutarCambioEstado(ticket.id, 'In Progress');
      alert('Llegada a taller confirmada. El activo de la CMDB se reubicó en Almacen-TIC como Pendiente de Asignación y el ticket se movió a In Progress.');
      cargarTickets();
    } catch (err: any) {
      alert(`Error al confirmar llegada a taller: ${err.message}`);
    }
  };

  const abrirModalSolucionarDevolver = (ticket: Ticket) => {
    setTicketParaSolucionar(ticket);
    setDevSedeDestino(ticket.agencia_id || '');
    setDevDestinatarioNombre('');
    setDevDestinatarioCargo('');
    setDevJefeInmediatoNombre('');
    setModalSolucionarDevolverAbierto(true);
  };

  const ejecutarSolucionarDevolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketParaSolucionar || !ticketParaSolucionar.serie_activo || !devSedeDestino || !devDestinatarioNombre || !devDestinatarioCargo || !devJefeInmediatoNombre) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    setProcesandoDevolucion(true);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Asignar el equipo reparado a la agencia (genera Kardex y Acta)
      const resAsig = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation AsignarDevolucion(
              $serie: String!
              $destino: String!
              $nombre: String!
              $cargo: String!
              $jefe: String!
            ) {
              asignarActivoAgencia(
                numeroSerie: $serie
                destinoFinal: $destino
                destinatarioNombre: $nombre
                destinatarioCargo: $cargo
                jefeInmediatoNombre: $jefe
              )
            }
          `,
          variables: {
            serie: ticketParaSolucionar.serie_activo,
            destino: devSedeDestino,
            nombre: devDestinatarioNombre,
            cargo: devDestinatarioCargo,
            jefe: devJefeInmediatoNombre
          }
        })
      });
      const dataAsig = await resAsig.json();
      if (dataAsig.errors) {
        throw new Error(dataAsig.errors[0].message);
      }

      // 2. Mover ticket a Done
      await ejecutarCambioEstado(ticketParaSolucionar.id, 'Done');
      alert('Ticket solucionado y equipo reasignado a sede con éxito.');
      setModalSolucionarDevolverAbierto(false);
      cargarTickets();

      // Abrir acta en nueva pestaña
      window.open(`/acta?serie=${ticketParaSolucionar.serie_activo}`, '_blank');
    } catch (err: any) {
      alert(`Error al solucionar y devolver: ${err.message}`);
    } finally {
      setProcesandoDevolucion(false);
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
                          {ticket.serie_activo && ticket.status !== 'Done' && (
                            <button
                              onClick={() => abrirReemplazoFlow(ticket)}
                              className="w-full mt-2 text-center py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-900/40 text-blue-400 text-[10px] font-bold rounded transition"
                            >
                              🔄 Registrar Cambio de Equipo
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                          {!ticket.tecnico_id && (
                            <button
                              onClick={() => abrirModalAsignarTecnico(ticket)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-650 hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition animate-pulse"
                            >
                              Asignar Técnico
                            </button>
                          )}

                          {ticket.status === 'En Tránsito a Taller' && ticket.serie_activo && (
                            <button
                              onClick={() => confirmarLlegadaTallerKanban(ticket)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-amber-650 hover:bg-amber-600 rounded-lg text-xs font-bold text-white transition"
                            >
                              📥 Confirmar Llegada Taller
                            </button>
                          )}

                          {ticket.status === 'In Progress' && ticket.serie_activo && (
                            <button
                              onClick={() => abrirModalSolucionarDevolver(ticket)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 rounded-lg text-xs font-bold text-white transition"
                            >
                              🚀 Solucionar y Devolver
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

      {/* Modal de Reemplazo Tecnológico */}
      {modalReemplazoAbierto && ticketSeleccionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" /> Flujo de Reemplazo Tecnológico
              </h2>
              <button 
                onClick={() => setModalReemplazoAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1">
              <p><span className="font-bold text-slate-300">Ticket:</span> {ticketSeleccionado.key} - {ticketSeleccionado.resumen}</p>
              <p><span className="font-bold text-slate-300">Sede afectada:</span> {ticketSeleccionado.agencia_id}</p>
              <p><span className="font-bold text-slate-300">Equipo a retirar (malo):</span> {ticketSeleccionado.serie_activo}</p>
            </div>

            <form onSubmit={ejecutarReemplazoYDone} className="space-y-4 text-left text-xs">
              <div className="flex flex-col gap-2 border border-slate-800 p-3 rounded-lg bg-slate-950/20">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {registroCaliente ? '📝 Registro en Caliente de Equipo' : '📦 Equipo de Reemplazo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRegistroCaliente(!registroCaliente)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline transition"
                  >
                    {registroCaliente ? 'Seleccionar de inventario' : '¿No está en la lista? Registrar en caliente'}
                  </button>
                </div>

                {!registroCaliente ? (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <select
                      required={!registroCaliente}
                      value={activoNuevoSeleccionado}
                      onChange={(e) => setActivoNuevoSeleccionado(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 w-full"
                    >
                      <option value="">Seleccione un hardware del Economato/Almacén...</option>
                      {activosDisponibles.map(a => (
                        <option key={a.numero_serie} value={a.numero_serie}>
                          {a.tipo_equipo} {a.marca} {a.modelo} (Serie: {a.numero_serie} - {a.ubicacion_agencia})
                        </option>
                      ))}
                    </select>
                    {activosDisponibles.length === 0 && (
                      <p className="text-amber-500 text-[10px] mt-0.5">⚠️ No hay equipos disponibles en Almacen-TIC o Economato.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold">Tipo de Equipo *</label>
                        <select
                          value={calienteTipo}
                          onChange={(e) => setCalienteTipo(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white w-full"
                        >
                          <option value="Monitor">Monitor</option>
                          <option value="CPU">CPU</option>
                          <option value="LAPTOP">LAPTOP</option>
                          <option value="IMPRESORA">IMPRESORA</option>
                          <option value="Teclado">Teclado</option>
                          <option value="Mouse">Mouse</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold">Marca *</label>
                        <input
                          type="text"
                          required={registroCaliente}
                          placeholder="ej. Lenovo"
                          value={calienteMarca}
                          onChange={(e) => setCalienteMarca(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold">Modelo *</label>
                        <input
                          type="text"
                          required={registroCaliente}
                          placeholder="ej. V24"
                          value={calienteModelo}
                          onChange={(e) => setCalienteModelo(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold">Número de Serie *</label>
                        <input
                          type="text"
                          required={registroCaliente}
                          placeholder="ej. cmmmmm"
                          value={calienteSerie}
                          onChange={(e) => setCalienteSerie(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Destinatario (Receptor) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del empleado que usará el equipo"
                  value={destinatarioNombre}
                  onChange={(e) => setDestinatarioNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cargo del Destinatario *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Analista TI"
                    value={destinatarioCargo}
                    onChange={(e) => setDestinatarioCargo(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Jefe Inmediato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del jefe"
                    value={jefeInmediatoNombre}
                    onChange={(e) => setJefeInmediatoNombre(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalReemplazoAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    procesandoReemplazo || 
                    (!registroCaliente && !activoNuevoSeleccionado) ||
                    (registroCaliente && (!calienteMarca || !calienteModelo || !calienteSerie))
                  }
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  {procesandoReemplazo ? 'Procesando...' : (
                    <>
                      <FileText className="w-3.5 h-3.5" /> Confirmar & Generar Acta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Asignación de Técnico */}
      {modalTecnicoAbierto && ticketParaAsignarTech && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> Asignar Técnico de Soporte
              </h2>
              <button 
                onClick={() => setModalTecnicoAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-xs text-slate-400">
              <span className="font-bold text-slate-300">Ticket:</span> {ticketParaAsignarTech.key} <br />
              <span className="font-bold text-slate-300">Resumen:</span> {ticketParaAsignarTech.resumen}
            </div>

            <form onSubmit={ejecutarAsignacionTecnico} className="space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Técnico Encargado *</label>
                <select
                  required
                  value={tecnicoSeleccionadoId}
                  onChange={(e) => setTecnicoSeleccionadoId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 w-full"
                >
                  <option value="">Seleccione un técnico...</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo} ({t.username})
                    </option>
                  ))}
                </select>
                {tecnicos.length === 0 && (
                  <p className="text-red-400 text-[10px] mt-1">⚠️ No hay técnicos disponibles en el sistema.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalTecnicoAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTecnico || !tecnicoSeleccionadoId}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition"
                >
                  {guardandoTecnico ? 'Asignando...' : 'Asignar Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Solucionar y Devolver a Sede */}
      {modalSolucionarDevolverAbierto && ticketParaSolucionar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Solucionar y Devolver Equipo a Sede
              </h2>
              <button 
                onClick={() => setModalSolucionarDevolverAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1">
              <p><span className="font-bold text-slate-300">Ticket:</span> {ticketParaSolucionar.key} - {ticketParaSolucionar.resumen}</p>
              <p><span className="font-bold text-slate-300">Equipo reparado (Serie):</span> {ticketParaSolucionar.serie_activo}</p>
            </div>

            <form onSubmit={ejecutarSolucionarDevolver} className="space-y-4 text-left text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Agencia Sede de Devolución *</label>
                <input
                  type="text"
                  required
                  list="cmac-agencias-kanban"
                  placeholder="ej. AGENCIA CAYMA"
                  value={devSedeDestino}
                  onChange={(e) => setDevSedeDestino(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="cmac-agencias-kanban">
                  <option value="OFICINA PRINCIPAL" />
                  <option value="AGENCIA CIUDAD NUEVA" />
                  <option value="AGENCIA ALTO DE LA ALIANZA" />
                  <option value="AGENCIA CORONEL MENDOZA" />
                  <option value="AGENCIA GREGORIO ALBARRACIN" />
                  <option value="AGENCIA BUSTAMANTE Y RIVERO" />
                  <option value="AGENCIA PUERTO MALDONADO" />
                  <option value="AGENCIA MARCAVALLE" />
                  <option value="AGENCIA CUSCO CENTRAL" />
                  <option value="AGENCIA LAZO" />
                  <option value="AGENCIA SAN MARTIN" />
                  <option value="AGENCIA LEON VELARDE" />
                  <option value="AGENCIA CAYMA" />
                  <option value="AGENCIA HUEPETUHE" />
                  <option value="AGENCIA ILAVE" />
                  <option value="AGENCIA MAZUKO" />
                  <option value="AGENCIA LA NEGRITA" />
                  <option value="AGENCIA ATE" />
                  <option value="AGENCIA EL PEDREGAL" />
                  <option value="AGENCIA HIGUERETA" />
                  <option value="AGENCIA SAN JUAN" />
                  <option value="AGENCIA JULIACA" />
                  <option value="AGENCIA ILO" />
                  <option value="AGENCIA PUNO CENTRAL" />
                  <option value="AGENCIA ICA CENTRAL" />
                  <option value="AGENCIA LA VICTORIA" />
                  <option value="AGENCIA DESAGUADERO" />
                  <option value="AGENCIA MOQUEGUA CENTRAL" />
                  <option value="AGENCIA IBERIA" />
                  <option value="AGENCIA CERRO COLORADO" />
                  <option value="AGENCIA TUPAC AMARU" />
                </datalist>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Destinatario (Receptor) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del empleado que recibe el equipo"
                  value={devDestinatarioNombre}
                  onChange={(e) => setDevDestinatarioNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cargo del Destinatario *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Recibidor Pagador"
                    value={devDestinatarioCargo}
                    onChange={(e) => setDevDestinatarioCargo(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Jefe Inmediato *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del jefe"
                    value={devJefeInmediatoNombre}
                    onChange={(e) => setDevJefeInmediatoNombre(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalSolucionarDevolverAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoDevolucion}
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  {procesandoDevolucion ? 'Procesando...' : (
                    <>
                      <FileText className="w-3.5 h-3.5" /> Devolver & Generar Acta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
