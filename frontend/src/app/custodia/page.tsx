'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShieldAlert, 
  Play, 
  CheckCircle, 
  Clock, 
  ShoppingCart, 
  Check, 
  Trash2, 
  FileText, 
  ChevronRight, 
  RefreshCw, 
  X,
  RotateCcw
} from 'lucide-react';

const AGENCIAS_CMACTACNA = [
  'AGENCIA PRINCIPAL TACNA',
  'AGENCIA SAN MARTÍN',
  'AGENCIA ALTO DE LA ALIANZA',
  'AGENCIA LEGUÍA',
  'AGENCIA POCOLLAY',
  'AGENCIA MOQUEGUA',
  'AGENCIA ILO',
  'AGENCIA AREQUIPA',
  'AGENCIA CAYMA',
  'AGENCIA MIRAFLORES',
  'AGENCIA PUNO',
  'AGENCIA JULIACA',
  'AGENCIA CUSCO',
  'AGENCIA TALLER CENTRAL',
  'OFICINAS ADMINISTRATIVAS - TACNA'
];

interface CustodiaItem {
  id: string;
  tecnico_id: string;
  tecnico_username: string | null;
  ean_codigo: string;
  descripcion_articulo: string | null;
  estado: string;
  fecha_retiro: string;
  fecha_cierre_comision: string | null;
  fecha_regularizacion: string | null;
  comision_activa: boolean;
  numero_serie_activo?: string | null;
  ubicacion_detalle?: string | null;
}

export default function CustodiaPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [custodia, setCustodia] = useState<CustodiaItem[]>([]);
  const [tecnicoId, setTecnicoId] = useState('');
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Catálogo de Economato
  const [insumosEconomato, setInsumosEconomato] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<Record<string, number>>({});

  // Modal para consumir repuesto
  const [modalConsumirAbierto, setModalConsumirAbierto] = useState(false);
  const [eanAConsumir, setEanAConsumir] = useState('');
  const [serieMaquinaUso, setSerieMaquinaUso] = useState('');
  const [sedeUso, setSedeUso] = useState('');
  const [guardandoUso, setGuardandoUso] = useState(false);

  // Estados para alta rápida (en caliente) en el modal de consumo
  const [registroCaliente, setRegistroCaliente] = useState(false);
  const [calienteTipo, setCalienteTipo] = useState('IMPRESORA');
  const [calienteMarca, setCalienteMarca] = useState('');
  const [calienteModelo, setCalienteModelo] = useState('');

  // Reporte de uso
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [reporteComision, setReporteComision] = useState<any[]>([]);

  // Campos para abrir comisión (se mantienen como fallback)
  const [inputEans, setInputEans] = useState('');
  const [abriendoComision, setAbriendoComision] = useState(false);
  const [filtroDescripcion, setFiltroDescripcion] = useState('');

  const cargarInsumos = async () => {
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                unidad_medida
              }
            }
          `
        })
      });
      const data = await res.json();
      if (data.data && data.data.listInsumos) {
        setInsumosEconomato(data.data.listInsumos);
      }
    } catch (err) {
      console.error('Error al cargar insumos:', err);
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
        const list = data.data.listTecnicos;
        setTecnicos(list);
        
        // Asignar el primer técnico si no se cargó uno de la sesión
        const userStr = localStorage.getItem('user');
        let currentUserId = '';
        if (userStr) {
          const parsed = JSON.parse(userStr);
          if (parsed.rol === 'tecnico') {
            currentUserId = parsed.id;
          }
        }
        
        if (!currentUserId && list.length > 0) {
          setTecnicoId(list[0].id);
        } else if (currentUserId) {
          setTecnicoId(currentUserId);
        }
      }
    } catch (err) {
      console.error('Error al cargar técnicos:', err);
    }
  };

  useEffect(() => {
    cargarTecnicos();
    cargarInsumos();
  }, []);

  useEffect(() => {
    if (tecnicoId) {
      cargarCustodiaYTension();
    }
  }, [tecnicoId]);

  const cargarCustodiaYTension = async () => {
    setCargando(true);
    try {
      await cargarInsumos();
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetCustodia($tId: String!) {
              listCustodia(tecnicoId: $tId) {
                id
                tecnico_id
                tecnico_username
                ean_codigo
                descripcion_articulo
                estado
                fecha_retiro
                fecha_cierre_comision
                fecha_regularizacion
                comision_activa
                numero_serie_activo
                ubicacion_detalle
              }
              checkAgingLogistico(tecnicoId: $tId)
            }
          `,
          variables: { tId: tecnicoId }
        })
      });

      const data = await res.json();
      if (data.data) {
        setCustodia(data.data.listCustodia);
        setIsBlocked(data.data.checkAgingLogistico);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const agregarAlCarrito = (ean: string, maxStock: number) => {
    if (isBlocked) {
      alert('Se encuentra bloqueado por Aging Logístico. Regularice sus pendientes.');
      return;
    }
    const qtyActual = carrito[ean] || 0;
    if (qtyActual >= maxStock) {
      alert('No hay más stock disponible de este insumo en el Economato.');
      return;
    }
    setCarrito({ ...carrito, [ean]: qtyActual + 1 });
  };

  const quitarDelCarrito = (ean: string) => {
    const qtyActual = carrito[ean] || 0;
    if (qtyActual <= 1) {
      const nuevo = { ...carrito };
      delete nuevo[ean];
      setCarrito(nuevo);
    } else {
      setCarrito({ ...carrito, [ean]: qtyActual - 1 });
    }
  };

  const vaciarCarrito = () => {
    setCarrito({});
  };

  const registrarComisionCarrito = async () => {
    if (!tecnicoId) {
      alert('Debe especificar el ID del técnico.');
      return;
    }
    const keys = Object.keys(carrito);
    if (keys.length === 0) {
      alert('Su carrito está vacío. Agregue insumos de la lista.');
      return;
    }

    setAbriendoComision(true);
    // Expandir carrito a lista plana de EANs
    const eansArray: string[] = [];
    keys.forEach(ean => {
      const qty = carrito[ean];
      for (let i = 0; i < qty; i++) {
        eansArray.push(ean);
      }
    });

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
            mutation OpenComision($tId: ID!, $eans: [String!]!) {
              abrirComisionViaje(tecnicoId: $tId, eanCodigos: $eans) {
                id
                ean_codigo
                estado
              }
            }
          `,
          variables: { tId: tecnicoId, eans: eansArray }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(`Error al abrir comisión: ${data.errors[0].message}`);
      } else {
        alert('Comisión de viaje iniciada correctamente. Repuestos agregados a su posesión "En Ruta".');
        setCarrito({});
        setMostrarReporte(false); // Ocultar reporte de la anterior comisión si hubiese
        cargarCustodiaYTension();
      }
    } catch (err: any) {
      alert(`Error al registrar salida: ${err.message}`);
    } finally {
      setAbriendoComision(false);
    }
  };

  const abrirModalConsumir = (ean: string) => {
    setEanAConsumir(ean);
    setSerieMaquinaUso('');
    setSedeUso('');
    setRegistroCaliente(false);
    setCalienteTipo('IMPRESORA');
    setCalienteMarca('');
    setCalienteModelo('');
    setModalConsumirAbierto(true);
  };

  const ejecutarConsumirItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoId || !eanAConsumir || !serieMaquinaUso || !sedeUso) {
      alert('Por favor complete todos los campos.');
      return;
    }

    setGuardandoUso(true);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Si es registro en caliente, dar de alta primero el activo en la CMDB
      if (registroCaliente) {
        if (!calienteMarca || !calienteModelo || !calienteTipo) {
          alert('Complete los datos obligatorios del equipo a registrar en caliente.');
          setGuardandoUso(false);
          return;
        }

        const altaRes = await fetch(`${backendUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            query: `
              mutation AltaCaliente(
                $tipo: String!
                $marca: String!
                $modelo: String!
                $serie: String!
                $ubicacion: String!
              ) {
                registrarIngresoActivo(
                  tipo_equipo: $tipo
                  marca: $marca
                  modelo: $modelo
                  numero_serie: $serie
                  ubicacion_inicial: $ubicacion
                ) {
                  id
                  numero_serie
                }
              }
            `,
            variables: {
              tipo: calienteTipo,
              marca: calienteMarca,
              modelo: calienteModelo,
              serie: serieMaquinaUso,
              ubicacion: sedeUso // Se da de alta directamente en la sede donde se usa
            }
          })
        });

        const altaData = await altaRes.json();
        if (altaData.errors) {
          throw new Error(`Error al dar de alta el equipo en caliente: ${altaData.errors[0].message}`);
        }
      }

      // 2. Ejecutar la regularización/consumo del repuesto
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          query: `
            mutation Regularize(
              $tId: ID!
              $ean: String!
              $estado: String!
              $serie: String
              $sede: String
            ) {
              regularizarCustodia(
                tecnicoId: $tId
                eanCodigo: $ean
                estado: $estado
                numeroSerieActivo: $serie
                ubicacionDetalle: $sede
              )
            }
          `,
          variables: { 
            tId: tecnicoId, 
            ean: eanAConsumir, 
            estado: 'Consumido',
            serie: serieMaquinaUso,
            sede: sedeUso
          }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(`Error de validación: ${data.errors[0].message}`);
      } else {
        alert('Uso del repuesto registrado con éxito. Descuento validado en CMDB e ingreso asentado en Kardex.');
        setModalConsumirAbierto(false);
        cargarCustodiaYTension();
      }
    } catch (err: any) {
      alert(`Error al registrar descarga: ${err.message}`);
    } finally {
      setGuardandoUso(false);
    }
  };

  const ejecutarDevolverItem = async (ean: string) => {
    if (!confirm('¿Está seguro de devolver este insumo al stock de Economato?')) {
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
            mutation Regularize($tId: ID!, $ean: String!, $estado: String!) {
              regularizarCustodia(tecnicoId: $tId, eanCodigo: $ean, estado: $estado)
            }
          `,
          variables: { tId: tecnicoId, ean, estado: 'Devuelto' }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Insumo devuelto al almacén central.`);
        cargarCustodiaYTension();
      }
    } catch (err: any) {
      alert(`Error al devolver: ${err.message}`);
    }
  };

  const finalizarComision = async () => {
    if (!tecnicoId) return;

    if (!confirm('¿Está seguro de cerrar la comisión? Se sincerará el stock y se emitirá el reporte de uso.')) {
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
            mutation CloseComision($tId: ID!) {
              cerrarComisionViaje(tecnicoId: $tId)
            }
          `,
          variables: { tId: tecnicoId }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert('Comisión cerrada con éxito. El conteo regresivo de 48h ha comenzado.');
        
        // Generar datos para el Reporte de Uso de esta comisión cerrada
        const consumidos = custodia.filter(item => item.comision_activa && item.estado === 'Consumido');
        setReporteComision(consumidos);
        setMostrarReporte(true);

        cargarCustodiaYTension();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Clock className="w-8 h-8 text-blue-400" /> Economato - Registro de uso
        </h1>
        <p className="text-sm text-slate-400 mt-1">Gestión de repuestos, comisiones de viaje y regularización de uso en equipos de la Caja Tacna.</p>
      </div>

      {/* Consultor de Técnico */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label htmlFor="consulta-tech-id" className="text-xs font-semibold text-slate-350">Seleccionar Técnico de Campo</label>
            <select
              id="consulta-tech-id"
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 w-64"
            >
              {tecnicos.length === 0 && (
                <option value="">Cargando técnicos...</option>
              )}
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre_completo || t.username} ({t.username})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={cargarCustodiaYTension}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-white rounded-lg transition border border-slate-750"
          >
            Consultar Custodia
          </button>
        </div>

        {mostrarReporte && (
          <button
            onClick={() => setMostrarReporte(false)}
            className="px-4 py-2 bg-emerald-950 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/20 text-xs font-bold rounded-lg transition"
          >
            Ver Reporte Emitido
          </button>
        )}
      </div>

      {/* Alerta de Bloqueo de Middleware */}
      {isBlocked && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200"
        >
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <div className="text-sm font-bold">BLOQUEADO POR AGING LOGÍSTICO VENCIDO</div>
            <div className="text-xs text-red-400 mt-1">
              Han transcurrido más de 48 horas desde la finalización de su última comisión de viaje sin regularizar el stock.
              El middleware ha inhabilitado temporalmente su cuenta para realizar nuevos retiros del Economato hasta que declare el destino de sus repuestos "En Ruta".
            </div>
          </div>
        </div>
      )}

      {/* Grid de 3 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna 1: Stock del Economato */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" /> Stock del Economato
          </h2>
          <p className="text-[11px] text-slate-500">Repuestos e insumos disponibles en el almacén logístico central.</p>
          
          {insumosEconomato.length > 0 && (
            <input 
              type="text" 
              placeholder="Buscar por descripción, EAN o SKU..."
              value={filtroDescripcion}
              onChange={(e) => setFiltroDescripcion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition font-medium"
            />
          )}
          
          {insumosEconomato.length === 0 ? (
            <div className="text-slate-500 text-xs text-center py-6">Consultando stock...</div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {insumosEconomato
                .filter(insumo => 
                  (insumo.descripcion_articulo || '').toLowerCase().includes(filtroDescripcion.toLowerCase()) ||
                  (insumo.ean_codigo || '').toLowerCase().includes(filtroDescripcion.toLowerCase()) ||
                  (insumo.sku_codigo || '').toLowerCase().includes(filtroDescripcion.toLowerCase())
                )
                .map(insumo => {
                  const qtyEnCarrito = carrito[insumo.ean_codigo] || 0;
                  return (
                    <div key={insumo.ean_codigo} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                      <div className="space-y-0.5 max-w-[70%]">
                        <span className="font-bold text-slate-200 block truncate">{insumo.descripcion_articulo}</span>
                        <span className="font-mono text-[10px] text-blue-400 block">{insumo.ean_codigo}</span>
                        <span className="text-[10px] text-slate-500">Stock: {insumo.cantidad_stock} {insumo.unidad_medida}</span>
                      </div>
                      <button
                        onClick={() => agregarAlCarrito(insumo.ean_codigo, insumo.cantidad_stock)}
                        disabled={insumo.cantidad_stock <= 0 || isBlocked}
                        className="px-2.5 py-1 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-850 disabled:text-slate-650 text-white font-bold rounded transition flex items-center gap-1 text-[10px]"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Utilizar
                        {qtyEnCarrito > 0 && (
                          <span className="bg-white text-blue-900 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold ml-1">
                            {qtyEnCarrito}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Columna 2: Carrito y Cierre de Comisión */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" /> Carrito de Retiro
          </h2>
          <p className="text-[11px] text-slate-500">Insumos seleccionados para transportar en esta comisión de viaje.</p>
          
          {Object.keys(carrito).length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-600 border border-dashed border-slate-850 rounded-2xl bg-slate-950/10">
              El carrito está vacío. <br /> Presione "Utilizar" en el stock.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {Object.entries(carrito).map(([ean, qty]) => {
                  const item = insumosEconomato.find(i => i.ean_codigo === ean);
                  return (
                    <div key={ean} className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-200 block truncate">{item?.descripcion_articulo || ean}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{ean}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => quitarDelCarrito(ean)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono text-white font-bold text-xs">{qty}</span>
                        <button 
                          onClick={() => agregarAlCarrito(ean, item?.cantidad_stock || 99)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={vaciarCarrito}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-350 rounded-lg transition flex-1 border border-slate-750"
                >
                  Vaciar
                </button>
                <button
                  onClick={registrarComisionCarrito}
                  disabled={abriendoComision}
                  className="px-3 py-2 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-850 disabled:text-slate-650 text-xs font-bold text-white rounded-lg transition flex-1"
                >
                  {abriendoComision ? 'Abriendo...' : 'Registrar Salida'}
                </button>
              </div>
            </div>
          )}

          {/* Botón Cerrar Comisión */}
          <div className="border-t border-slate-850 pt-4 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cerrar Comisión de Campo</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Sincera los repuestos en posesión, devuelve excedentes y emite el informe de uso.</p>
            </div>
            <button
              onClick={finalizarComision}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow-lg shadow-amber-600/10"
            >
              <Clock className="w-4 h-4" /> Marcar Cierre de Comisión
            </button>
          </div>
        </div>

        {/* Columna 3: Tabla de Repuestos en Tránsito */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" /> Custodia en Ruta (Posesión)
          </h2>
          <p className="text-[11px] text-slate-500">Insumos bajo tu cargo actual que deben ser declarados.</p>

          {cargando ? (
            <div className="text-slate-500 text-xs py-6 animate-pulse">Cargando registros...</div>
          ) : custodia.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">No hay repuestos bajo custodia registrados para este técnico.</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {custodia.map((item) => (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-200 block truncate text-xs">{item.descripcion_articulo}</span>
                      <span className="font-mono text-[10px] text-blue-400 block">{item.ean_codigo}</span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${
                      item.estado === 'En Ruta' ? 'bg-amber-950/80 text-amber-400 border border-amber-900/40' :
                      item.estado === 'Consumido' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.estado}
                    </span>
                  </div>

                  {item.estado === 'En Ruta' ? (
                    <div className="flex gap-2 pt-1 border-t border-slate-850/60">
                      <button
                        onClick={() => abrirModalConsumir(item.ean_codigo)}
                        className="px-2.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 transition text-[10px] font-bold text-white rounded-lg flex-1"
                      >
                        Consumido
                      </button>
                      <button
                        onClick={() => ejecutarDevolverItem(item.ean_codigo)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 transition text-[10px] font-bold text-slate-300 rounded-lg flex-1 border border-slate-750"
                      >
                        Devolver
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-850/60 text-[10px] text-slate-500 space-y-0.5">
                      {item.estado === 'Consumido' ? (
                        <>
                          <p>📌 Usado en: <strong className="text-slate-300 font-mono">{item.numero_serie_activo}</strong></p>
                          <p>🏢 Agencia: <strong className="text-slate-300">{item.ubicacion_detalle}</strong></p>
                        </>
                      ) : (
                        <p className="italic">Devuelto al almacén de Economato.</p>
                      )}
                      <p className="text-[8px] text-slate-600 mt-1">Reg: {item.fecha_regularizacion?.substring(0, 16).replace('T', ' ')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Reporte de Uso de la Comisión Cerrada */}
      {mostrarReporte && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-5 h-5 text-emerald-400" /> Reporte de Rendición y Uso de Repuestos (Comisión Cerrada)
            </h2>
            <button 
              onClick={() => setMostrarReporte(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-850 pb-3 text-slate-400">
              <div>
                <span className="font-bold text-slate-350">Código Técnico:</span> {tecnicoId} <br />
                <span className="font-bold text-slate-350">Fecha de Cierre:</span> {new Date().toLocaleDateString()}
              </div>
              <div className="text-right">
                <span className="font-bold text-white block">CAJA MUNICIPAL DE AHORRO Y CRÉDITO DE TACNA S.A.</span>
                <span className="text-[10px] text-slate-500">Jefatura de Soporte de TI y Comunicaciones</span>
              </div>
            </div>

            {reporteComision.length === 0 ? (
              <p className="text-slate-500 italic py-4">No se registraron repuestos consumidos en esta comisión. Todos los repuestos fueron devueltos a stock o la salida fue vacía.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-300 font-semibold">Detalle de Repuestos Empleados en Equipos de Cómputo / Impresoras:</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2">Código EAN</th>
                        <th className="py-2">Descripción Insumo</th>
                        <th className="py-2">Equipo Destino (S/N o ID)</th>
                        <th className="py-2">Agencia / Sede de Uso</th>
                        <th className="py-2 text-right">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50">
                      {reporteComision.map((item, idx) => (
                        <tr key={idx} className="text-slate-300 text-[11px]">
                          <td className="py-2 font-mono font-bold text-blue-400">{item.ean_codigo}</td>
                          <td className="py-2">{item.descripcion_articulo || 'Repuesto'}</td>
                          <td className="py-2 font-mono text-white">{item.numero_serie_activo || 'N/A'}</td>
                          <td className="py-2">{item.ubicacion_detalle || 'N/A'}</td>
                          <td className="py-2 text-right font-mono">1</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-850 flex justify-end">
              <div className="text-center w-52 border-t border-slate-850 pt-2 text-[10px] text-slate-500">
                Firma de Técnico de Campo
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registrar Consumo de Repuesto */}
      {modalConsumirAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> Descargar Uso de Repuesto
              </h2>
              <button 
                onClick={() => setModalConsumirAbierto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={ejecutarConsumirItem} className="space-y-4 text-left text-xs">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-slate-400">
                <span className="font-bold text-slate-350">Código EAN:</span> <span className="font-mono text-blue-400">{eanAConsumir}</span>
              </div>

              {/* Toggle de Registro en Caliente */}
              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-350 font-bold uppercase tracking-wider">¿Equipo no registrado en la CMDB?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registroCaliente}
                    onChange={(e) => setRegistroCaliente(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Si es registro en caliente, mostrar campos adicionales del activo */}
              {registroCaliente && (
                <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
                  <p className="text-[10px] text-blue-400 font-bold uppercase">Alta Rápida de Equipo en Caliente</p>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-semibold uppercase">Tipo de Equipo *</label>
                    <select
                      value={calienteTipo}
                      onChange={(e) => setCalienteTipo(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="IMPRESORA">IMPRESORA</option>
                      <option value="CPU">CPU</option>
                      <option value="LAPTOP">LAPTOP</option>
                      <option value="MONITOR">MONITOR</option>
                      <option value="SWITCH">SWITCH</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-400 font-semibold uppercase">Marca *</label>
                      <input
                        type="text"
                        placeholder="ej. HP"
                        value={calienteMarca}
                        onChange={(e) => setCalienteMarca(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-400 font-semibold uppercase">Modelo *</label>
                      <input
                        type="text"
                        placeholder="ej. LaserJet M426"
                        value={calienteModelo}
                        onChange={(e) => setCalienteModelo(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {registroCaliente ? 'Número de Serie del Nuevo Equipo *' : 'Número de Serie / ID Equipo Destino *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. S12345XYZ"
                  value={serieMaquinaUso}
                  onChange={(e) => setSerieMaquinaUso(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Agencia / Sede de Uso *</label>
                <input
                  type="text"
                  required
                  list="cmac-agencias"
                  placeholder="ej. AGENCIA SAN MARTÍN"
                  value={sedeUso}
                  onChange={(e) => setSedeUso(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalConsumirAbierto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    guardandoUso || 
                    (!registroCaliente && !serieMaquinaUso) || 
                    (registroCaliente && (!calienteMarca || !calienteModelo || !serieMaquinaUso))
                  }
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center"
                >
                  {guardandoUso ? 'Registrando...' : 'Confirmar Uso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Datalist de agencias */}
      <datalist id="cmac-agencias">
        {AGENCIAS_CMACTACNA.map(ag => (
          <option key={ag} value={ag} />
        ))}
      </datalist>
    </div>
  );
}
