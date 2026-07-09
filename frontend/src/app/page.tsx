'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, LayoutDashboard, Wrench, Package, BarChart3, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const [tokenSimulado, setTokenSimulado] = useState<string>('');

  const simularLogin = (rol: 'administrador' | 'tecnico') => {
    // Generar un payload simulado para desarrollo frontend local rápido
    const dummyUser = {
      id: rol === 'administrador' ? 'admin-uuid-1111' : 'tecnico-uuid-2222',
      username: rol === 'administrador' ? 'admin' : 'tecnico1',
      rol: rol
    };
    localStorage.setItem('user', JSON.stringify(dummyUser));
    // Simulamos un token estático
    localStorage.setItem('token', 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token');
    alert(`Sesión simulada iniciada como: ${rol.toUpperCase()}`);
    window.location.reload();
  };

  const limpiarSesion = () => {
    localStorage.clear();
    alert('Sesión cerrada.');
    window.location.reload();
  };

  return (
    <div className="space-y-12">
      {/* Hero Section con gradiente premium */}
      <section className="text-center relative py-12 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)]" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6 px-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Shield className="w-3.5 h-3.5" /> Portal de Modernización TIC - ITIL v4
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Administración de Activos Informáticos
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Plataforma centralizada para el triaje, inventariado dinámico en CMDB, liquidación de repuestos y regularización técnica ante Contraloría.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => simularLogin('administrador')}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 focus:ring-2 focus:ring-blue-500"
            >
              Simular Admin
            </button>
            <button
              onClick={() => simularLogin('tecnico')}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition border border-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              Simular Técnico
            </button>
            <button
              onClick={limpiarSesion}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-950/40 hover:bg-red-900/40 text-red-400 transition border border-red-900/30 focus:ring-2 focus:ring-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </section>

      {/* Grid de KPIs Estadísticos */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition backdrop-blur-sm">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-sm font-medium">Downtime Ciudadano</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-white">1.8 Días</p>
          <span className="text-xs text-green-400 font-medium">↓ 85% de la línea base</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition backdrop-blur-sm">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-sm font-medium">Comisiones de Viaje Activas</span>
            <Wrench className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-white">4 Activas</p>
          <span className="text-xs text-slate-400">Técnicos desplegados</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition backdrop-blur-sm">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-sm font-medium">Regularizados en 48h</span>
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-white">96.4%</p>
          <span className="text-xs text-green-400 font-medium">Cumplimiento normativo</span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition backdrop-blur-sm">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-sm font-medium">Desviación Rollers EAN</span>
            <BarChart3 className="w-5 h-5 text-cyan-500" />
          </div>
          <p className="text-3xl font-bold mt-2 text-white">0%</p>
          <span className="text-xs text-slate-400">Control físico vs lógico</span>
        </div>
      </section>

      {/* Accesos Directos a los Módulos de Flujo */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-400" /> Módulos de Flujo Operativo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/triaje" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">1. Triaje Inbound</h3>
            <p className="text-sm text-slate-400 mt-2">Búsqueda rápida en caché de activos, semáforo crítico automático y switch de contingencia.</p>
          </Link>

          <Link href="/kanban" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">2. Kanban de Tickets</h3>
            <p className="text-sm text-slate-400 mt-2">Monitoreo y arrastre de solicitudes bajo los estados To Do, In Progress, En Tránsito a Taller y Done.</p>
          </Link>

          <Link href="/custodia" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">3. Custodia en Ruta</h3>
            <p className="text-sm text-slate-400 mt-2">Control de repuestos retirados, cronómetro de Aging de 48 horas y middleware de bloqueo.</p>
          </Link>

          <Link href="/admin" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">4. Administración</h3>
            <p className="text-sm text-slate-400 mt-2">Carga masiva de compras, informes INF-BAJA/INF-RENOV, reuso de CPU y descarga Excel.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
