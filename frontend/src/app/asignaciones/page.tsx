'use client';

import React, { useEffect, useState } from 'react';
import { FileText, UserCheck, CheckCircle2, Search, Filter, Printer, HelpCircle, Truck, ArrowLeftRight, CheckSquare, Edit2 } from 'lucide-react';

const AGENCIAS_CMACTACNA = [
  "OFICINA PRINCIPAL",
  "AGENCIA CIUDAD NUEVA",
  "AGENCIA ALTO DE LA ALIANZA",
  "AGENCIA CORONEL MENDOZA",
  "AGENCIA GREGORIO ALBARRACIN",
  "AGENCIA BUSTAMANTE Y RIVERO",
  "AGENCIA PUERTO MALDONADO",
  "AGENCIA MARCAVALLE",
  "AGENCIA CUSCO CENTRAL",
  "AGENCIA LAZO",
  "AGENCIA SAN MARTIN",
  "AGENCIA LEON VELARDE",
  "AGENCIA CAYMA",
  "AGENCIA HUEPETUHE",
  "AGENCIA ILAVE",
  "AGENCIA MAZUKO",
  "AGENCIA LA NEGRITA",
  "AGENCIA ATE",
  "AGENCIA EL PEDREGAL",
  "AGENCIA HIGUERETA",
  "AGENCIA SAN JUAN",
  "AGENCIA JULIACA",
  "AGENCIA ILO",
  "AGENCIA PUNO CENTRAL",
  "AGENCIA ICA CENTRAL",
  "AGENCIA LA VICTORIA",
  "AGENCIA DESAGUADERO",
  "AGENCIA MOQUEGUA CENTRAL",
  "AGENCIA IBERIA",
  "AGENCIA CERRO COLORADO",
  "AGENCIA TUPAC AMARU"
];

export default function AsignacionesPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolUsuario, setRolUsuario] = useState<string>('invitado');

  // Filtros y búsquedas
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Estados del modal de asignación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState<any>(null);
  
  // Campos del formulario modal
  const [destinoFinal, setDestinoFinal] = useState('');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [destinatarioCargo, setDestinatarioCargo] = useState('');
  const [jefeInmediatoNombre, setJefeInmediatoNombre] = useState('');
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  // Estados del modal de traslado
  const [modalTrasladoAbierto, setModalTrasladoAbierto] = useState(false);
  const [activoATrasladar, setActivoATrasladar] = useState<any>(null);
  const [trasladoTipo, setTrasladoTipo] = useState<'Agencia' | 'Taller'>('Agencia');
  const [trasladoDestino, setTrasladoDestino] = useState('');
  const [trasladoDestinatarioNombre, setTrasladoDestinatarioNombre] = useState('');
  const [trasladoDestinatarioCargo, setTrasladoDestinatarioCargo] = useState('');
  const [trasladoJefeInmediatoNombre, setTrasladoJefeInmediatoNombre] = useState('');
  const [procesandoTraslado, setProcesandoTraslado] = useState(false);

  // Estados del modal de edición de activos
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [activoAEditar, setActivoAEditar] = useState<any>(null);
  const [editTipoEquipo, setEditTipoEquipo] = useState('');
  const [editMarca, setEditMarca] = useState('');
  const [editModelo, setEditModelo] = useState('');
  const [editNumeroSerie, setEditNumeroSerie] = useState('');
  const [editIpAsignada, setEditIpAsignada] = useState('');
  const [editInformacionAdicional, setEditInformacionAdicional] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  useEffect(() => {
    // Validar rol desde localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setRolUsuario(parsed.rol || 'invitado');
      } catch {
        setRolUsuario('invitado');
      }
    }
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
                ubicacion_agencia
                estado_asignacion
                ubicacion_inicial
                destino_final
                id_interno
                informacion_adicional
                acta_entrega {
                  estado
                  destinatario_nombre
                  destinatario_cargo
                  jefe_inmediato_nombre
                  agencia_destino
                  fecha_generacion
                }
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listActivosCMDB) {
        setActivos(data.data.listActivosCMDB);
      }
    } catch (err) {
      console.error('Error al cargar activos:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAsignacion = (activo: any) => {
    setActivoSeleccionado(activo);
    setDestinoFinal('');
    setDestinatarioNombre('');
    setDestinatarioCargo('');
    setJefeInmediatoNombre('');
    setModalAbierto(true);
  };

  const ejecutarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinoFinal || !destinatarioNombre || !destinatarioCargo || !jefeInmediatoNombre) {
      alert('Por favor complete todos los datos requeridos para la asignación y acta.');
      return;
    }

    setGuardandoAsignacion(true);
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
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
            serie: activoSeleccionado.numero_serie,
            destino: destinoFinal,
            nombre: destinatarioNombre,
            cargo: destinatarioCargo,
            jefe: jefeInmediatoNombre
          }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else if (data.data && data.data.asignarActivoAgencia) {
        alert('Asignación registrada exitosamente. Acta de Entrega generada en estado Pendiente de Firma.');
        setModalAbierto(false);
        cargarActivos();
        
        // Abrir ventana de impresión de acta automáticamente
        window.open(`/acta?serie=${activoSeleccionado.numero_serie}`, '_blank');
      }
    } catch (err: any) {
      alert(`Error al guardar asignación: ${err.message}`);
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const abrirModalEditar = (activo: any) => {
    setActivoAEditar(activo);
    setEditTipoEquipo(activo.tipo_equipo || '');
    setEditMarca(activo.marca || '');
    setEditModelo(activo.modelo || '');
    setEditNumeroSerie(activo.numero_serie || '');
    setEditIpAsignada(activo.ip_asignada || '');
    setEditInformacionAdicional(activo.informacion_adicional || '');
    setModalEditarAbierto(true);
  };

  const ejecutarEditarActivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoAEditar || !editTipoEquipo || !editMarca || !editModelo || !editNumeroSerie) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    setGuardandoEdicion(true);
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
            mutation UpdateActivo(
              $id: ID!
              $tipo: String!
              $marca: String!
              $modelo: String!
              $serie: String!
              $ip: String
              $info: String
            ) {
              updateActivo(
                id: $id
                tipo_equipo: $tipo
                marca: $marca
                modelo: $modelo
                numero_serie: $serie
                ip_asignada: $ip
                informacion_adicional: $info
              )
            }
          `,
          variables: {
            id: activoAEditar.id,
            tipo: editTipoEquipo,
            marca: editMarca,
            modelo: editModelo,
            serie: editNumeroSerie,
            ip: editIpAsignada || null,
            info: editInformacionAdicional || null
          }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error al actualizar activo: ${data.errors[0].message}`);
      } else {
        alert('Activo actualizado exitosamente en la CMDB.');
        setModalEditarAbierto(false);
        cargarActivos();
      }
    } catch (err: any) {
      alert(`Error de red al actualizar: ${err.message}`);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const abrirModalTraslado = (activo: any) => {
    setActivoATrasladar(activo);
    setTrasladoTipo('Agencia');
    setTrasladoDestino('');
    setTrasladoDestinatarioNombre('');
    setTrasladoDestinatarioCargo('');
    setTrasladoJefeInmediatoNombre('');
    setModalTrasladoAbierto(true);
  };

  const ejecutarTraslado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trasladoTipo === 'Agencia' && (!trasladoDestino || !trasladoDestinatarioNombre || !trasladoDestinatarioCargo || !trasladoJefeInmediatoNombre)) {
      alert('Por favor complete todos los datos requeridos para el traslado a agencia.');
      return;
    }

    setProcesandoTraslado(true);
    try {
      const queryStr = trasladoTipo === 'Taller' 
        ? `
          mutation TrasladarTaller($serie: String!) {
            trasladarActivoTaller(numeroSerie: $serie)
          }
        `
        : `
          mutation TrasladarAgencia(
            $serie: String!
            $destino: String!
            $nombre: String!
            $cargo: String!
            $jefe: String!
          ) {
            trasladarActivoAgencia(
              numeroSerie: $serie
              destinoFinal: $destino
              destinatarioNombre: $nombre
              destinatarioCargo: $cargo
              jefeInmediatoNombre: $jefe
            )
          }
        `;
      
      const vars = trasladoTipo === 'Taller'
        ? { serie: activoATrasladar.numero_serie }
        : {
            serie: activoATrasladar.numero_serie,
            destino: trasladoDestino,
            nombre: trasladoDestinatarioNombre,
            cargo: trasladoDestinatarioCargo,
            jefe: trasladoJefeInmediatoNombre
          };

      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ query: queryStr, variables: vars })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        alert(trasladoTipo === 'Taller' 
          ? 'Traslado a taller iniciado correctamente. El equipo está En Tránsito.' 
          : 'Traslado a nueva agencia registrado. El equipo está En Tránsito.'
        );
        setModalTrasladoAbierto(false);
        cargarActivos();
      }
    } catch (err: any) {
      alert(`Error al registrar traslado: ${err.message}`);
    } finally {
      setProcesandoTraslado(false);
    }
  };

  const ejecutarConfirmarRecepcion = async (serie: string) => {
    if (!window.confirm('¿Confirma que el equipo ha llegado físicamente a su destino y se ha verificado su recepción?')) {
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          query: `
            mutation ConfirmarLlegada($serie: String!) {
              confirmarRecepcionTraslado(numeroSerie: $serie)
            }
          `,
          variables: { serie }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        alert('Recepción confirmada con éxito. El inventario real del equipo ha sido actualizado en la CMDB.');
        cargarActivos();
      }
    } catch (err: any) {
      alert(`Error al confirmar la llegada: ${err.message}`);
    }
  };

  const marcarActaDevuelta = async (serie: string) => {
    if (!window.confirm('¿Confirma que ha recibido física o digitalmente el acta firmada por el destinatario y su jefe?')) {
      return;
    }
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          query: `
            mutation MarcarFirmada($serie: String!) {
              marcarActaFirmada(numeroSerie: $serie)
            }
          `,
          variables: { serie }
        })
      });
      const data = await res.json();
      if (data.errors) {
        alert(`Error: ${data.errors[0].message}`);
      } else {
        alert('El estado del acta ha sido actualizado a "Firmado y Devuelto" en la CMDB.');
        cargarActivos();
      }
    } catch (err: any) {
      alert(`Error al actualizar estado del acta: ${err.message}`);
    }
  };

  const verActa = (serie: string) => {
    window.open(`/acta?serie=${serie}`, '_blank');
  };

  // Filtrar la lista
  const activosFiltrados = activos.filter(a => {
    const cumpleBusqueda = 
      a.numero_serie.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.id_interno && a.id_interno.toLowerCase().includes(busqueda.toLowerCase())) ||
      a.marca.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.modelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tipo_equipo.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleEstado = 
      filtroEstado === 'Todos' ||
      a.estado_asignacion === filtroEstado;

    return cumpleBusqueda && cumpleEstado;
  });

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-blue-400" /> Control de Asignaciones y Actas
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gestione el destino final de los activos TIC del almacén y la firma de actas de cargo.</p>
        </div>
      </div>

      {/* Alerta de Invitado (Solo Lectura) */}
      {rolUsuario === 'invitado' && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-850 text-amber-400 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ Modo consulta: Privilegios de Invitado (Solo Lectura). No puede modificar ni asignar hardware.</span>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por serie, modelo o marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Asignado">Asignado</option>
            <option value="Pendiente de Asignación">Pendiente de Asignación</option>
            <option value="En Tránsito">En Tránsito a Sede</option>
            <option value="En Tránsito a Taller">En Tránsito a Taller</option>
          </select>
        </div>

        <div className="text-right flex items-center justify-end text-xs text-slate-400">
          Resultados: <span className="text-white font-bold ml-1">{activosFiltrados.length} equipos</span>
        </div>
      </div>

      {/* Tabla de Activos */}
      <div className="bg-slate-900/20 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-4">Equipo / Detalles</th>
              <th className="p-4">Identificador</th>
              <th className="p-4">Origen / Ubicación</th>
              <th className="p-4">Destino Final</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-center">Acta de Cargo</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 bg-slate-900/10">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 animate-pulse">Cargando inventario de asignaciones...</td>
              </tr>
            ) : activosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No se encontraron activos para los filtros seleccionados.</td>
              </tr>
            ) : (
              activosFiltrados.map((activo) => {
                const esAsignado = activo.estado_asignacion === 'Asignado';
                const acta = activo.acta_entrega;

                return (
                  <tr key={activo.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{activo.tipo_equipo}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">{activo.marca} - {activo.modelo}</div>
                    </td>
                    <td className="p-4 font-mono">
                      <div className="text-white font-bold">{activo.numero_serie}</div>
                      {activo.id_interno && activo.id_interno !== activo.numero_serie && (
                        <div className="text-blue-400 text-[10px] mt-0.5">ID: {activo.id_interno}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {activo.ubicacion_inicial || 'Almacen-TIC'}
                      </span>
                    </td>
                    <td className="p-4">
                      {activo.destino_final ? (
                        <div className="text-slate-200 font-semibold">{activo.destino_final}</div>
                      ) : (
                        <div className="text-slate-500 italic">No asignado aún</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                        activo.estado_asignacion === 'Asignado'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                          : (activo.estado_asignacion === 'En Tránsito' || activo.estado_asignacion === 'En Tránsito a Taller')
                            ? 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                            : 'bg-slate-900/40 text-slate-400 border-slate-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activo.estado_asignacion === 'Asignado' ? 'bg-emerald-400' :
                          (activo.estado_asignacion === 'En Tránsito' || activo.estado_asignacion === 'En Tránsito a Taller') ? 'bg-amber-400 animate-pulse' :
                          'bg-slate-400'
                        }`} />
                        {activo.estado_asignacion}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {acta && acta.estado !== 'No Aplica' ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          acta.estado === 'Firmado y Devuelto'
                            ? 'bg-blue-950/40 text-blue-400 border-blue-900/40'
                            : 'bg-yellow-950/20 text-yellow-500 border-yellow-900/30'
                        }`}>
                          {acta.estado}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[10px]">No aplica</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(activo)}
                          disabled={rolUsuario === 'invitado'}
                          className="p-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg transition border border-slate-750"
                          title="Editar Datos Básicos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {activo.estado_asignacion === 'Asignado' ? (
                          <>
                            <button
                              onClick={() => verActa(activo.numero_serie)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                              title="Imprimir/Ver Acta"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {acta && acta.estado === 'Pendiente de Firma' && (
                              <button
                                onClick={() => marcarActaDevuelta(activo.numero_serie)}
                                disabled={rolUsuario === 'invitado'}
                                className="px-2.5 py-1.5 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-850 disabled:text-slate-650 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Firmada
                              </button>
                            )}
                            <button
                              onClick={() => abrirModalTraslado(activo)}
                              disabled={rolUsuario === 'invitado'}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-850 disabled:text-slate-650 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                              title="Trasladar Equipo"
                            >
                              <Truck className="w-3 h-3" /> Trasladar
                            </button>
                          </>
                        ) : (activo.estado_asignacion === 'En Tránsito' || activo.estado_asignacion === 'En Tránsito a Taller') ? (
                          <>
                            {acta && acta.estado !== 'No Aplica' && (
                              <button
                                onClick={() => verActa(activo.numero_serie)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                title="Imprimir/Ver Acta Pendiente"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => ejecutarConfirmarRecepcion(activo.numero_serie)}
                              disabled={rolUsuario === 'invitado'}
                              className="px-2.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-850 disabled:text-slate-650 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                              title="Confirmar Recepción/Llegada"
                            >
                              <CheckSquare className="w-3 h-3" /> Confirmar Llegada
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => abrirModalAsignacion(activo)}
                            disabled={rolUsuario === 'invitado'}
                            className="px-2.5 py-1.5 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-850 disabled:text-slate-650 text-white rounded-lg text-[10px] font-bold transition"
                          >
                            Asignar Equipo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Asignación */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Formulario de Asignación y Acta
              </h2>
              <button 
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Equipo a asignar:</span> {activoSeleccionado?.tipo_equipo} ({activoSeleccionado?.marca} - {activoSeleccionado?.modelo}) <br />
              <span className="font-bold text-slate-300">Serie/ID:</span> {activoSeleccionado?.numero_serie}
            </div>

            <form onSubmit={ejecutarAsignacion} className="space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Agencia / Sede Destino *</label>
                <input
                  type="text"
                  required
                  list="cmac-agencias"
                  placeholder="ej. AGENCIA CIUDAD NUEVA"
                  value={destinoFinal}
                  onChange={(e) => setDestinoFinal(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Destinatario (Receptor) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre completo del empleado"
                  value={destinatarioNombre}
                  onChange={(e) => setDestinatarioNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cargo del Destinatario *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Cajero de Ventanilla 02"
                  value={destinatarioCargo}
                  onChange={(e) => setDestinatarioCargo(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Jefe Inmediato (V°B°) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del jefe autorizador"
                  value={jefeInmediatoNombre}
                  onChange={(e) => setJefeInmediatoNombre(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAsignacion}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                >
                  {guardandoAsignacion ? 'Procesando...' : 'Confirmar & Ver Acta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Traslado */}
      {modalTrasladoAbierto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" /> Trasladar Equipo Informático
              </h2>
              <button 
                onClick={() => setModalTrasladoAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Equipo a trasladar:</span> {activoATrasladar?.tipo_equipo} ({activoATrasladar?.marca} - {activoATrasladar?.modelo}) <br />
              <span className="font-bold text-slate-300">Serie/ID:</span> {activoATrasladar?.numero_serie} <br />
              <span className="font-bold text-slate-300">Ubicación actual:</span> {activoATrasladar?.ubicacion_agencia}
            </div>

            {/* Select de tipo de traslado */}
            <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-lg border border-slate-850 text-xs">
              <span className="text-slate-400 font-semibold pl-2">Tipo de Rumbo:</span>
              <label className="flex items-center gap-1.5 text-white font-bold cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTraslado" 
                  checked={trasladoTipo === 'Agencia'} 
                  onChange={() => setTrasladoTipo('Agencia')}
                  className="accent-blue-500" 
                />
                Nueva Sede
              </label>
              <label className="flex items-center gap-1.5 text-white font-bold cursor-pointer">
                <input 
                  type="radio" 
                  name="tipoTraslado" 
                  checked={trasladoTipo === 'Taller'} 
                  onChange={() => setTrasladoTipo('Taller')}
                  className="accent-blue-500" 
                />
                Derivar a Taller
              </label>
            </div>

            <form onSubmit={ejecutarTraslado} className="space-y-4 text-left">
              {trasladoTipo === 'Agencia' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Agencia Sede Destino *</label>
                    <input
                      type="text"
                      required
                      list="cmac-agencias"
                      placeholder="ej. AGENCIA CAYMA"
                      value={trasladoDestino}
                      onChange={(e) => setTrasladoDestino(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Nuevo Receptor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre completo del empleado"
                      value={trasladoDestinatarioNombre}
                      onChange={(e) => setTrasladoDestinatarioNombre(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cargo del Nuevo Receptor *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Administrador de Agencia"
                      value={trasladoDestinatarioCargo}
                      onChange={(e) => setTrasladoDestinatarioCargo(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nombre del Jefe Inmediato (V°B°) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre del jefe autorizador"
                      value={trasladoJefeInmediatoNombre}
                      onChange={(e) => setTrasladoJefeInmediatoNombre(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" /> Confirmación de Envío a Soporte
                  </p>
                  <p>
                    El equipo cambiará su estado de asignación a <strong className="text-white">"En Tránsito a Taller"</strong>.
                  </p>
                  <p>
                    Su ubicación física no variará en la CMDB hasta que se confirme la llegada en el almacén de soporte técnico, registrando la baja de cargo del receptor anterior de forma automática.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalTrasladoAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoTraslado}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  {procesandoTraslado ? 'Procesando...' : (trasladoTipo === 'Taller' ? 'Derivar a Taller' : 'Iniciar Traslado')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edición de Datos de Activo */}
      {modalEditarAbierto && activoAEditar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" /> Editar Datos Básicos de Activo
              </h2>
              <button 
                onClick={() => setModalEditarAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={ejecutarEditarActivo} className="space-y-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tipo de Activo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. CPU"
                    value={editTipoEquipo}
                    onChange={(e) => setEditTipoEquipo(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Lenovo"
                    value={editMarca}
                    onChange={(e) => setEditMarca(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. ThinkCentre M70q"
                    value={editModelo}
                    onChange={(e) => setEditModelo(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Número de Serie *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. S12345XYZ"
                    value={editNumeroSerie}
                    onChange={(e) => setEditNumeroSerie(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">IP Asignada (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. 192.168.45.12"
                  value={editIpAsignada}
                  onChange={(e) => setEditIpAsignada(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Información Adicional</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el estado, lote o justificación de cambios..."
                  value={editInformacionAdicional}
                  onChange={(e) => setEditInformacionAdicional(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-[10px] text-slate-500 space-y-1">
                <p>⚠️ Nota: Modificar el Número de Serie actualizará las referencias del activo en todos los tickets registrados y en su historial de movimientos del Kardex para mantener la integridad.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalEditarAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="px-4 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <datalist id="cmac-agencias">
        {AGENCIAS_CMACTACNA.map(ag => (
          <option key={ag} value={ag} />
        ))}
      </datalist>
    </div>
  );
}
