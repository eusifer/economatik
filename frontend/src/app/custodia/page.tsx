'use client';

import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, Play, CheckCircle, Clock } from 'lucide-react';

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
}

export default function CustodiaPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [custodia, setCustodia] = useState<CustodiaItem[]>([]);
  const [tecnicoId, setTecnicoId] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Campos para abrir comisión
  const [inputEans, setInputEans] = useState('');
  const [abriendoComision, setAbriendoComision] = useState(false);

  useEffect(() => {
    // Intentar leer técnico de sesión simulada para comodidad de test
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.rol === 'tecnico') {
        setTecnicoId(user.id);
      }
    }
  }, []);

  useEffect(() => {
    if (tecnicoId) {
      cargarCustodiaYTension();
    }
  }, [tecnicoId]);

  const cargarCustodiaYTension = async () => {
    setCargando(true);
    try {
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

  const iniciarComision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoId || !inputEans) {
      alert('Debe ingresar el ID del Técnico y al menos un código EAN.');
      return;
    }

    setAbriendoComision(true);
    const codes = inputEans.split(',').map(c => c.trim()).filter(Boolean);

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
          variables: { tId: tecnicoId, eans: codes }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(`Error al abrir comisión: ${data.errors[0].message}`);
      } else {
        alert('Comisión de Viaje abierta. Los repuestos han sido registrados como En Ruta.');
        setInputEans('');
        cargarCustodiaYTension();
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setAbriendoComision(false);
    }
  };

  const finalizarComision = async () => {
    if (!tecnicoId) return;

    if (!confirm('¿Está seguro de cerrar la comisión? Esto iniciará el cronómetro de 48 horas para rendir el stock.')) {
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
        alert('Comisión cerrada con éxito. El conteo regresivo de Aging Logístico de 48h ha comenzado.');
        cargarCustodiaYTension();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const regularizarItem = async (ean: string, estado: 'Consumido' | 'Devuelto') => {
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
          variables: { tId: tecnicoId, ean, estado }
        })
      });

      const data = await res.json();
      if (data.errors) {
        alert(data.errors[0].message);
      } else {
        alert(`Repuesto EAN ${ean} regularizado como ${estado}.`);
        cargarCustodiaYTension();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Custodia en Ruta y Aging Logístico</h1>
        <p className="text-sm text-slate-400 mt-1">Control de inventario en tránsito para comisiones de viaje de técnicos de campo.</p>
      </div>

      {/* Consultor de Técnico */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="consulta-tech-id" className="text-sm font-semibold text-slate-300">ID del Técnico a Consultar</label>
          <input
            id="consulta-tech-id"
            type="text"
            placeholder="ej. tecnico-uuid-2222"
            value={tecnicoId}
            onChange={(e) => setTecnicoId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <button
          onClick={cargarCustodiaYTension}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white rounded-lg transition"
        >
          Consultar
        </button>
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
            <div className="text-xs text-red-400">
              Han transcurrido más de 48 horas desde la finalización de su última comisión de viaje sin regularizar el stock.
              El middleware del backend ha inhabilitado temporalmente su cuenta para realizar nuevos retiros de repuestos del Economato.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Abrir Comisión (Izquierda) */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" /> Iniciar Comisión de Viaje
          </h2>

          <form onSubmit={iniciarComision} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="ean-codes" className="text-sm font-semibold text-slate-300">Códigos EAN de Repuestos *</label>
              <textarea
                id="ean-codes"
                rows={3}
                placeholder="Digitar o escanear EANs separados por comas (ej. EAN-1002, EAN-1002)..."
                value={inputEans}
                onChange={(e) => setInputEans(e.target.value)}
                disabled={isBlocked}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isBlocked || abriendoComision}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
            >
              Registrar Salida "En Ruta"
            </button>
          </form>

          {/* Botón Cerrar Comisión */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-300">Finalizar Comisión de Campo</h3>
            <p className="text-xs text-slate-500 mt-1">Gatilla la cuenta regresiva regulada de 48 horas.</p>
            <button
              onClick={finalizarComision}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-3 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white transition"
            >
              <Clock className="w-4 h-4" /> Marcar Cierre de Comisión
            </button>
          </div>
        </div>

        {/* Tabla de Repuestos en Tránsito (Derecha - 2 Columnas de ancho) */}
        <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" /> Inventario y Custodia en Posesión
          </h2>

          {cargando ? (
            <div className="text-slate-400 text-sm">Consultando registros...</div>
          ) : custodia.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">No hay repuestos registrados bajo custodia para este técnico.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-3 px-4">Código EAN</th>
                    <th className="py-3 px-4">Artículo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Fecha Retiro</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-200 divide-y divide-slate-850">
                  {custodia.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{item.ean_codigo}</td>
                      <td className="py-3.5 px-4">{item.descripcion_articulo}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.estado === 'En Ruta' ? 'bg-amber-950/80 text-amber-400 border border-amber-900' :
                          item.estado === 'Consumido' ? 'bg-green-950/85 text-green-400 border border-green-900' :
                          'bg-slate-950 text-slate-400 border border-slate-850'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{item.fecha_retiro.substring(0, 10)}</td>
                      <td className="py-3.5 px-4 text-center">
                        {item.estado === 'En Ruta' ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => regularizarItem(item.ean_codigo, 'Consumido')}
                              className="px-2 py-1 bg-green-700 hover:bg-green-600 transition text-[10px] font-bold text-white rounded"
                            >
                              Consumido
                            </button>
                            <button
                              onClick={() => regularizarItem(item.ean_codigo, 'Devuelto')}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 transition text-[10px] font-bold text-white rounded"
                            >
                              Devolver
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Regularizado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
