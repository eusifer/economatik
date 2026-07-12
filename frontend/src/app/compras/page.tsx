'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Download, 
  RefreshCw,
  ShoppingCart,
  History,
  FileCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BuyItem {
  id: string;
  almacen: 'Almacen-TIC' | 'Economato-Equipos' | 'Economato-InsRep';
  marca: string;
  modelo: string;
  tipo: string;
  serie: string;
  cantidad: number;
  info: string;
}

interface InvoiceGroup {
  factura: string;
  fecha: string;
  pdfB64: string | null;
  pdfMime: string | null;
  pdfNombre: string;
  items: {
    tipo: string;
    marca: string;
    modelo: string;
    serie: string;
    cantidad: number;
    almacen: string;
  }[];
}

export default function ComprasPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  // Estados Formulario Factura
  const [regFactura, setRegFactura] = useState('');
  const [regAdjuntoB64, setRegAdjuntoB64] = useState<string | null>(null);
  const [regAdjuntoMime, setRegAdjuntoMime] = useState<string | null>(null);
  const [regAdjuntoNombre, setRegAdjuntoNombre] = useState<string>('');

  // Estados Formulario Ítem
  const [almacenDestino, setAlmacenDestino] = useState<'Almacen-TIC' | 'Economato-Equipos' | 'Economato-InsRep'>('Almacen-TIC');
  const [regSerieEan, setRegSerieEan] = useState('');
  const [regNombreDesc, setRegNombreDesc] = useState('');
  const [regMarcaCat, setRegMarcaCat] = useState('');
  const [regModeloUnidad, setRegModeloUnidad] = useState('');
  const [regCantidad, setRegCantidad] = useState(1);
  const [regInformacionAdicional, setRegInformacionAdicional] = useState('');

  // Lista Temporal (Carrito)
  const [listaCompra, setListaCompra] = useState<BuyItem[]>([]);
  const [procesandoCompra, setProcesandoCompra] = useState(false);

  // Historial de Compras
  const [historialFacturas, setHistorialFacturas] = useState<InvoiceGroup[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string>('invitado');

  const toggleInvoice = (factura: string) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [factura]: !prev[factura]
    }));
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        setUserRole(u.rol || 'invitado');
      } catch {}
    }
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
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
              listActivosCMDB {
                id
                numero_serie
                tipo_equipo
                marca
                modelo
                ubicacion_inicial
                fecha_registro_sistema
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
              listInsumos {
                sku_codigo
                ean_codigo
                descripcion_articulo
                categoria
                cantidad_stock
                factura_referencia
                factura_adjunto_b64
                factura_adjunto_mime
              }
            }
          `
        })
      });

      const data = await res.json();
      if (data.data) {
        const activos = data.data.listActivosCMDB || [];
        const insumos = data.data.listInsumos || [];
        
        // Agrupar por Factura Referencia
        const groups: Record<string, InvoiceGroup> = {};

        activos.forEach((a: any) => {
          const fact = a.factura_referencia || 'SIN FACTURA';
          // Omitir marcadores históricos muy generales si el usuario lo desea, pero mejor listarlo todo
          if (!groups[fact]) {
            groups[fact] = {
              factura: fact,
              fecha: a.fecha_registro_sistema || new Date().toISOString(),
              pdfB64: a.factura_adjunto_b64 || null,
              pdfMime: a.factura_adjunto_mime || null,
              pdfNombre: `factura_${fact}.pdf`,
              items: []
            };
          }
          groups[fact].items.push({
            tipo: a.tipo_equipo,
            marca: a.marca,
            modelo: a.modelo,
            serie: a.numero_serie,
            cantidad: 1,
            almacen: a.ubicacion_inicial || 'Almacen-TIC'
          });
        });

        insumos.forEach((i: any) => {
          const fact = i.factura_referencia || 'SIN FACTURA';
          if (!groups[fact]) {
            groups[fact] = {
              factura: fact,
              fecha: new Date().toISOString(),
              pdfB64: i.factura_adjunto_b64 || null,
              pdfMime: i.factura_adjunto_mime || null,
              pdfNombre: `factura_${fact}.pdf`,
              items: []
            };
          }
          groups[fact].items.push({
            tipo: i.categoria || 'Repuesto',
            marca: i.descripcion_articulo,
            modelo: i.sku_codigo,
            serie: i.ean_codigo,
            cantidad: i.cantidad_stock || 0,
            almacen: 'Economato-InsRep'
          });
        });

        // Ordenar de la compra más reciente a la más antigua
        const sorted = Object.values(groups).sort((a, b) => {
          const dateA = new Date(isNaN(Number(a.fecha)) ? a.fecha : Number(a.fecha));
          const dateB = new Date(isNaN(Number(b.fecha)) ? b.fecha : Number(b.fecha));
          return dateB.getTime() - dateA.getTime();
        });

        setHistorialFacturas(sorted);
      }
    } catch (err) {
      console.error('Error al cargar historial de facturas:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleFileAdjuntoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRegAdjuntoNombre(file.name);
    setRegAdjuntoMime(file.type);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        const base64Data = dataUrl.split(',')[1];
        setRegAdjuntoB64(base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  const agregarItemLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNombreDesc || !regMarcaCat || !regModeloUnidad) {
      alert('Por favor complete los campos obligatorios del ítem: Tipo/Nombre, Marca y Modelo.');
      return;
    }
    
    const nuevoItem: BuyItem = {
      id: Date.now().toString(),
      almacen: almacenDestino,
      marca: regMarcaCat,
      modelo: regModeloUnidad,
      tipo: regNombreDesc,
      serie: regSerieEan || '',
      cantidad: Number(regCantidad || 1),
      info: regInformacionAdicional || ''
    };

    setListaCompra([...listaCompra, nuevoItem]);
    
    // Limpiar campos individuales
    setRegSerieEan('');
    setRegNombreDesc('');
    setRegMarcaCat('');
    setRegModeloUnidad('');
    setRegCantidad(1);
    setRegInformacionAdicional('');
  };

  const eliminarItemLista = (id: string) => {
    setListaCompra(listaCompra.filter(item => item.id !== id));
  };

  const guardarRegistroManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFactura) {
      alert('Por favor ingrese el Documento / Factura de Compra.');
      return;
    }
    if (listaCompra.length === 0) {
      alert('La lista de compra está vacía. Agregue al menos un ítem.');
      return;
    }

    setProcesandoCompra(true);
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;

      for (const item of listaCompra) {
        const loops = item.almacen === 'Economato-InsRep' ? item.cantidad : 1;
        
        for (let i = 0; i < loops; i++) {
          const res = await fetch(`${backendUrl}/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              query: `
                mutation Ingresar(
                  $almacen: String!
                  $marca: String!
                  $modelo: String!
                  $tipo: String!
                  $serie: String
                  $info: String
                  $factura: String
                  $pdfBase64: String
                  $pdfMime: String
                ) {
                  registrarIngresoActivo(
                    ubicacion_inicial: $almacen
                    marca: $marca
                    modelo: $modelo
                    tipo_equipo: $tipo
                    numero_serie: $serie
                    informacion_adicional: $info
                    factura_referencia: $factura
                    factura_adjunto_b64: $pdfBase64
                    factura_adjunto_mime: $pdfMime
                  ) {
                    id
                    numero_serie
                  }
                }
              `,
              variables: {
                almacen: item.almacen,
                marca: item.marca,
                modelo: item.modelo,
                tipo: item.tipo,
                serie: item.serie || null,
                info: item.info || null,
                factura: regFactura,
                pdfBase64: regAdjuntoB64 || null,
                pdfMime: regAdjuntoMime || null
              }
            })
          });

          const result = await res.json();
          if (result.errors) {
            console.error(`Error al registrar item ${item.tipo}:`, result.errors[0].message);
          } else {
            successCount++;
          }
        }
      }

      alert(`Compra procesada correctamente. Se registraron ${successCount} ingresos en el stock central de la Caja Tacna.`);
      setListaCompra([]);
      setRegFactura('');
      setRegAdjuntoB64(null);
      setRegAdjuntoMime(null);
      setRegAdjuntoNombre('');
      cargarHistorial();

    } catch (err: any) {
      alert(`Error al procesar la compra: ${err.message}`);
    } finally {
      setProcesandoCompra(false);
    }
  };

  const descargarPdfFactura = (b64: string, mime: string, filename: string) => {
    try {
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'factura.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al reconstruir PDF: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-blue-400" /> Registro de Compras y Lotes de Adquisición
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Panel independiente para el alta manual de lotes de hardware y consumibles asociados a comprobantes escaneados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Formulario y Carrito (Izquierda - Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" /> Nueva Factura de Compra
            </h2>

            {userRole === 'invitado' && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg text-xs font-medium">
                🛡️ Modo de Consulta: Su rol de Invitado no posee permisos para añadir o registrar compras.
              </div>
            )}

            {/* Cabecera / Datos Factura */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-4">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">1. Metadatos de la Compra</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-factura" className="text-xs text-slate-400 font-semibold">Documento / Factura de Compra *</label>
                  <input
                    id="reg-factura"
                    type="text"
                    placeholder="Ej. F001-0004523"
                    value={regFactura}
                    onChange={(e) => setRegFactura(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Adjuntar PDF Escaneado</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition text-slate-200 border border-slate-700">
                      Seleccionar PDF
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileAdjuntoChange}
                        className="hidden"
                      />
                    </label>
                    {regAdjuntoNombre ? (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30 max-w-[140px] truncate">
                        📄 {regAdjuntoNombre}
                        <button
                          type="button"
                          onClick={() => {
                            setRegAdjuntoNombre('');
                            setRegAdjuntoB64(null);
                            setRegAdjuntoMime(null);
                          }}
                          className="text-red-500 hover:text-red-400 font-bold ml-1.5"
                        >
                          &times;
                        </button>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Sin archivo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Agregar Item Form */}
            <form onSubmit={agregarItemLista} className="p-4 rounded-xl bg-slate-950/25 border border-slate-850/60 space-y-4">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">2. Agregar Ítem a la Lista</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-almacen" className="text-xs text-slate-400 font-semibold">Almacén Destino *</label>
                  <select
                    id="reg-almacen"
                    value={almacenDestino}
                    onChange={(e) => setAlmacenDestino(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Almacen-TIC">Almacén TIC (Hardware principal)</option>
                    <option value="Economato-Equipos">Economato Equipos (Pinpads, biométricos)</option>
                    <option value="Economato-InsRep">Economato Insumos/Repuestos (EAN compartido)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-nombre" className="text-xs text-slate-400 font-semibold">
                    {almacenDestino === 'Economato-InsRep' ? 'Descripción del Repuesto/Insumo *' : 'Tipo de Equipo (Categoría) *'}
                  </label>
                  <input
                    id="reg-nombre"
                    type="text"
                    required
                    placeholder={almacenDestino === 'Economato-InsRep' ? 'Ej. ROLLER HP, TONER' : 'Ej. PC, Pinpad, Teléfono IP'}
                    value={regNombreDesc}
                    onChange={(e) => setRegNombreDesc(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-marca" className="text-xs text-slate-400 font-semibold">Marca *</label>
                  <input
                    id="reg-marca"
                    type="text"
                    required
                    placeholder="Ej. LENOVO, HP"
                    value={regMarcaCat}
                    onChange={(e) => setRegMarcaCat(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-modelo" className="text-xs text-slate-400 font-semibold">Modelo / Unidad *</label>
                  <input
                    id="reg-modelo"
                    type="text"
                    required
                    placeholder="Ej. ThinkCentre M70q"
                    value={regModeloUnidad}
                    onChange={(e) => setRegModeloUnidad(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-serie" className="text-xs text-slate-400 font-semibold">
                    {almacenDestino === 'Economato-InsRep' ? 'Código EAN *' : 'Número de Serie (Si no tiene, se autogenera)'}
                  </label>
                  <input
                    id="reg-serie"
                    type="text"
                    required={almacenDestino === 'Economato-InsRep'}
                    placeholder={almacenDestino === 'Economato-InsRep' ? 'Ej. EAN-1001' : 'Ej. S/N o deje vacío'}
                    value={regSerieEan}
                    onChange={(e) => setRegSerieEan(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reg-cantidad" className="text-xs text-slate-400 font-semibold">Cantidad *</label>
                  <input
                    id="reg-cantidad"
                    type="number"
                    min={1}
                    disabled={almacenDestino !== 'Economato-InsRep'}
                    placeholder="Cantidad"
                    value={regCantidad}
                    onChange={(e) => setRegCantidad(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-40 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-info" className="text-xs text-slate-400 font-semibold">Información Adicional / Comentarios</label>
                <textarea
                  id="reg-info"
                  rows={1}
                  placeholder="Detalles sobre color, estado cosmético, etc."
                  value={regInformacionAdicional}
                  onChange={(e) => setRegInformacionAdicional(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={userRole === 'invitado'}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-850 hover:bg-slate-750 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 text-xs font-bold text-white rounded-lg transition border border-slate-750"
              >
                <Plus className="w-4 h-4 text-purple-400" /> Añadir Ítem a la Lista de Compra
              </button>
            </form>

            {/* Shopping List Table */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                <span>3. Elementos Consolidados en la Compra</span>
                <span className="text-blue-400">{listaCompra.length} Ítem(s)</span>
              </span>

              {listaCompra.length === 0 ? (
                <div className="p-8 text-center border border-slate-850 rounded-xl bg-slate-950/20 text-slate-500 italic text-xs">
                  La lista de compras está vacía. Añada ítems arriba para comenzar.
                </div>
              ) : (
                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="p-2.5">Almacén</th>
                        <th className="p-2.5">Tipo</th>
                        <th className="p-2.5">Marca / Modelo</th>
                        <th className="p-2.5">Serie / EAN</th>
                        <th className="p-2.5 text-center">Cant.</th>
                        <th className="p-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40">
                      {listaCompra.map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/20">
                          <td className="p-2.5 font-semibold text-slate-350">{item.almacen}</td>
                          <td className="p-2.5 text-blue-400 font-medium">{item.tipo}</td>
                          <td className="p-2.5 text-slate-200">{item.marca} - {item.modelo}</td>
                          <td className="p-2.5 font-mono text-white">{item.serie || 'AUTOGENERADO'}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-400">{item.cantidad}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => eliminarItemLista(item.id)}
                              className="text-red-500 hover:text-red-400 font-bold px-2 py-0.5 rounded transition"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={guardarRegistroManual}
              disabled={procesandoCompra || listaCompra.length === 0 || !regFactura || userRole === 'invitado'}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-650 hover:bg-blue-600 disabled:bg-slate-850 disabled:text-slate-500 text-xs font-bold text-white rounded-xl transition shadow-lg shadow-blue-500/15"
            >
              {procesandoCompra ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Procesando Compra...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Registrar Compra Completa ({listaCompra.reduce((acc, i) => acc + i.cantidad, 0)} Unidades)
                </>
              )}
            </button>

          </div>
        </div>

        {/* Historial de Facturas (Derecha - Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" /> Historial de Compras y Facturas
            </h2>
            <p className="text-xs text-slate-400">Listado de adquisiciones y facturas registradas en el sistema (de la más reciente a la más antigua).</p>

            {loadingHistorial ? (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">Cargando historial de compras...</div>
            ) : historialFacturas.length === 0 ? (
              <div className="p-8 text-center border border-slate-850 rounded-xl bg-slate-950/20 text-slate-500 italic text-xs">
                No hay facturas registradas en la CMDB.
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {historialFacturas.map(group => {
                  const totalItemsCount = group.items.reduce((acc, curr) => acc + curr.cantidad, 0);

                  return (
                    <div key={group.factura} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3 hover:border-slate-800 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleInvoice(group.factura)}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-400 hover:text-white transition"
                            aria-label={expandedInvoices[group.factura] ? "Colapsar factura" : "Expandir factura"}
                          >
                            {expandedInvoices[group.factura] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Factura / ID</span>
                            <h4 className="text-xs font-bold text-white font-mono">{group.factura}</h4>
                          </div>
                        </div>
                        {group.pdfB64 && (
                          <button
                            onClick={() => descargarPdfFactura(group.pdfB64!, group.pdfMime!, group.pdfNombre)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded border border-slate-800 transition flex items-center gap-1 text-[10px] font-bold"
                            title="Descargar Factura PDF Escaneada"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF Factura
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-850 pt-2">
                        <div>
                          <span className="font-bold text-slate-500">Fecha Registro:</span> <br />
                          {new Date(isNaN(Number(group.fecha)) ? group.fecha : Number(group.fecha)).toLocaleDateString()}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-500">Unidades Totales:</span> <br />
                          <span className="text-white font-bold">{totalItemsCount}</span>
                        </div>
                      </div>

                      {/* Items Detalle (Colapsable) */}
                      {expandedInvoices[group.factura] ? (
                        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-850/50 space-y-2 mt-2">
                          <span className="text-[9px] text-slate-500 uppercase font-semibold block border-b border-slate-900 pb-1">Items de la Factura:</span>
                          <div className="space-y-2">
                            {group.items.map((item, idx) => (
                              <div key={idx} className="text-[10px] text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-900 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-200">
                                    {item.cantidad}x {item.tipo}
                                  </span>
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850 uppercase font-bold font-mono">
                                    {item.almacen.replace('Economato-', '').replace('Almacen-', '')}
                                  </span>
                                </div>
                                <div className="text-slate-400 italic">
                                  {item.marca} {item.modelo}
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-slate-500 pt-1">
                                  <span>Serie/EAN: <strong className="font-mono text-blue-400">{item.serie}</strong></span>
                                  {group.pdfB64 && (
                                    <button
                                      type="button"
                                      onClick={() => descargarPdfFactura(group.pdfB64!, group.pdfMime!, group.pdfNombre)}
                                      className="text-blue-500 hover:text-blue-400 font-bold transition flex items-center gap-0.5"
                                    >
                                      <Download className="w-2.5 h-2.5" /> PDF
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-850/50 space-y-1 mt-2">
                          <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                            <span className="text-[9px] text-slate-500 uppercase font-semibold block">Vista Previa:</span>
                            <button
                              type="button"
                              onClick={() => toggleInvoice(group.factura)}
                              className="text-[9px] text-blue-400 hover:text-blue-300 font-bold transition"
                            >
                              Expandir (+)
                            </button>
                          </div>
                          {group.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-[9px] text-slate-400 truncate">
                              • {item.cantidad}x {item.tipo} ({item.marca} {item.modelo})
                            </div>
                          ))}
                          {group.items.length > 2 && (
                            <span className="text-[8px] text-slate-500 italic block mt-0.5">y {group.items.length - 2} ítem(s) más...</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
