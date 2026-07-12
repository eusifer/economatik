'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Printer, ArrowLeft } from 'lucide-react';

function ActaContent() {
  const searchParams = useSearchParams();
  const serie = searchParams.get('serie') || '';
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  const [activo, setActivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serie) {
      cargarDatosActivo();
    }
  }, [serie]);

  const cargarDatosActivo = async () => {
    try {
      const res = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetActivo($serie: String!) {
              searchActivo(query: $serie) {
                numero_serie
                tipo_equipo
                marca
                modelo
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
          `,
          variables: { serie }
        })
      });
      const data = await res.json();
      if (data.data && data.data.searchActivo) {
        setActivo(data.data.searchActivo);
      }
    } catch (err) {
      console.error('Error al cargar datos del acta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse">Cargando datos del Acta de Entrega...</div>
      </div>
    );
  }

  if (!activo || !activo.acta_entrega || activo.acta_entrega.estado === 'No Aplica') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 p-6">
        <div className="text-red-400 text-lg font-bold">⚠️ No se encontró acta de entrega para este activo.</div>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
        >
          Cerrar Pestaña
        </button>
      </div>
    );
  }

  const { acta_entrega } = activo;
  const fechaGeneracion = acta_entrega.fecha_generacion 
    ? new Date(Number(acta_entrega.fecha_generacion) || acta_entrega.fecha_generacion).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans print:p-0">
      {/* Botones de Control (Ocultos al imprimir) */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print:hidden bg-slate-100 p-4 rounded-xl border border-slate-200">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" /> Cerrar Pestaña
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-650 hover:bg-blue-650/90 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10"
        >
          <Printer className="w-4 h-4" /> Imprimir Acta / Guardar PDF
        </button>
      </div>

      {/* Cuerpo del Acta (Estilo Formal Imprimible) */}
      <div className="max-w-3xl mx-auto border-2 border-black p-8 sm:p-12 print:border-0 print:p-0">
        {/* Cabecera */}
        <div className="text-center space-y-2 border-b-2 border-black pb-6 mb-6">
          <h1 className="text-xl font-extrabold tracking-wide uppercase">Acta de Entrega de Equipo Informático</h1>
          <p className="text-xs font-bold text-slate-700 tracking-wider">CAJA MUNICIPAL DE AHORRO Y CRÉDITO DE TACNA S.A.</p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Jefatura de Soporte de TI y Comunicaciones</p>
        </div>

        {/* Cuerpo / Texto introductorio */}
        <div className="text-sm leading-relaxed mb-6 space-y-4">
          <p>
            Por medio del presente documento, se hace constar la entrega física e instalación del equipo informático detallado a continuación, en el marco de la modernización tecnológica y soporte técnico de las agencias de la Caja Municipal de Tacna.
          </p>
          <p>
            El usuario receptor declara recibir el equipo en óptimas condiciones de funcionamiento y se compromete a velar por el buen uso, custodia y mantenimiento del bien asignado para el ejercicio de sus funciones.
          </p>
        </div>

        {/* Especificaciones del Destinatario */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 border border-black mb-3">1. Datos del Destinatario y Destino</h2>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold w-1/3">Destinatario Nombre:</td>
                <td className="border border-black p-2">{acta_entrega.destinatario_nombre}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Cargo del Destinatario:</td>
                <td className="border border-black p-2">{acta_entrega.destinatario_cargo}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Jefe Inmediato Superior:</td>
                <td className="border border-black p-2">{acta_entrega.jefe_inmediato_nombre}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Agencia Sede Destino:</td>
                <td className="border border-black p-2">{acta_entrega.agencia_destino}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalles del Hardware Asignado */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-2 border border-black mb-3">2. Especificaciones Técnicas del Hardware</h2>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold w-1/3">Tipo de Equipo:</td>
                <td className="border border-black p-2">{activo.tipo_equipo}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Marca:</td>
                <td className="border border-black p-2">{activo.marca}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Modelo:</td>
                <td className="border border-black p-2">{activo.modelo}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold">Número de Serie:</td>
                <td className="border border-black p-2 font-mono">{activo.numero_serie}</td>
              </tr>
              {activo.id_interno && activo.id_interno !== activo.numero_serie && (
                <tr>
                  <td className="border border-black p-2 font-bold">ID Interno Asignado:</td>
                  <td className="border border-black p-2 font-mono font-bold">{activo.id_interno}</td>
                </tr>
              )}
              {activo.informacion_adicional && (
                <tr>
                  <td className="border border-black p-2 font-bold">Información Adicional:</td>
                  <td className="border border-black p-2 italic text-slate-700">{activo.informacion_adicional}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fecha y Firmas */}
        <div className="space-y-16">
          <div className="text-right text-xs">
            Tacna, {fechaGeneracion}.
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
            <div className="flex flex-col items-center justify-end">
              <div className="w-full border-t border-black mb-2" />
              <span className="font-bold">Firma del Técnico</span>
              <span className="text-slate-500">Soporte TI / SG-TIC</span>
            </div>
            
            <div className="flex flex-col items-center justify-end">
              <div className="w-full border-t border-black mb-2" />
              <span className="font-bold">Firma del Receptor</span>
              <span className="text-slate-500">Usuario Asignado</span>
            </div>

            <div className="flex flex-col items-center justify-end">
              <div className="w-full border-t border-black mb-2" />
              <span className="font-bold">V°B° Jefe Inmediato</span>
              <span className="text-slate-500">Autorizador</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActaPrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse">Cargando módulo de impresión...</div>
      </div>
    }>
      <ActaContent />
    </Suspense>
  );
}
