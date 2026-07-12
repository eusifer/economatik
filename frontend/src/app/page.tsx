'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, LayoutDashboard, Wrench, Package, BarChart3, AlertTriangle, User, Lock, LogOut, Key } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string; rol: string } | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    // Cargar sesión del almacenamiento local si ya existe
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userStr && token) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    if (!usernameInput || !passwordInput) {
      setErrorMsg('Usuario y contraseña son requeridos.');
      setCargando(false);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      const data = await res.json();
      if (res.status === 200) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Notificar a SessionBadge en el header (mismo tab)
        window.dispatchEvent(new Event('session-change'));
        setUser(data.user);
      } else {
        setErrorMsg(data.message || 'Credenciales inválidas.');
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión con el servidor.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const limpiarSesion = () => {
    localStorage.clear();
    // Notificar a SessionBadge en el header (mismo tab)
    window.dispatchEvent(new Event('session-change'));
    setUser(null);
    setUsernameInput('');
    setPasswordInput('');
    alert('Sesión cerrada.');
  };

  return (
    <div className="space-y-12">
      {/* Hero Section con gradiente premium */}
      <section className="text-center relative py-12 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)]" />
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 px-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Shield className="w-3.5 h-3.5" /> Portal de Modernización TIC - ITIL v4
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Administración de Activos Informáticos
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
            Plataforma centralizada para el triaje, inventariado dinámico en CMDB, liquidación de repuestos y regularización técnica ante Contraloría.
          </p>

          {user ? (
            /* Vista del usuario autenticado */
            <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-900/80 border border-blue-900/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                <span>SESIÓN ACTIVA</span>
              </div>
              <div className="text-white">
                <p className="text-lg font-semibold">Bienvenido, <span className="text-blue-400">{user.username}</span></p>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Rol: {user.rol}</p>
              </div>
              <button
                onClick={limpiarSesion}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-red-950/60 hover:bg-red-900/40 text-red-400 border border-red-900/30 transition focus:ring-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión Corporativa
              </button>
            </div>
          ) : (
            /* Formulario de Login Corporativo */
            <form onSubmit={handleLogin} className="max-w-md mx-auto p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl text-left">
              <div>
                <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" /> Ingreso al Sistema
                </h2>
                <p className="text-xs text-slate-500 text-center mt-1">Credenciales corporativas de la CMAC Tacna</p>
              </div>

              {errorMsg && (
                <div className="p-3 text-xs font-semibold bg-red-950/40 border border-red-900/30 text-red-400 rounded-lg text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                {/* Input de Usuario */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-username" className="text-xs font-semibold text-slate-400">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      id="login-username"
                      type="text"
                      placeholder="ej. admin o tecnico1"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Input de Contraseña */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-400">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {cargando ? 'Autenticando...' : 'Iniciar Sesión'}
              </button>
            </form>
          )}
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
            <span className="text-sm font-medium">Comisiones Activas</span>
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

      {/* Accesos Directos a los Módulos de Flujo (Condicionados por RBAC) */}
      {user && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-400" /> Módulos de Flujo Operativo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Módulo 0: Dashboard de Stock y Auditoría */}
            <Link href="/dashboard" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">📊 Dashboard Stock</h3>
              <p className="text-sm text-slate-400 mt-2">Consolidado de stock de hardware por sedes de la Caja Tacna e identificación automatizada de inconsistencias ITIL.</p>
            </Link>

            {/* Módulo 1: Triaje Inbound (Acceso para ambos) */}
            <Link href="/triaje" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">1. Triaje Inbound</h3>
              <p className="text-sm text-slate-400 mt-2">Búsqueda rápida en caché de activos, semáforo crítico automático y switch de contingencia.</p>
            </Link>

            {/* Módulo 2: Kanban de Tickets (Acceso para ambos) */}
            <Link href="/kanban" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">2. Kanban de Tickets</h3>
              <p className="text-sm text-slate-400 mt-2">Monitoreo y arrastre de solicitudes bajo los estados To Do, In Progress, En Tránsito a Taller y Done.</p>
            </Link>

            {/* Módulo 3: Economato - Registro de uso (Acceso para ambos) */}
            <Link href="/custodia" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">3. Economato - Registro de uso</h3>
              <p className="text-sm text-slate-400 mt-2">Control de repuestos retirados, cronómetro de Aging de 48 horas y regularización de uso en caliente.</p>
            </Link>

            {/* Módulo 4: Asignación de Activos (Acceso para todos) */}
            <Link href="/asignaciones" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">4. Asignaciones y Actas</h3>
              <p className="text-sm text-slate-400 mt-2">Control de destino final de equipos TIC, actas de cargo y firmas físicas en la CMDB.</p>
            </Link>

            {/* Módulo 5: Administración (Solo Administrador - Control RBAC en Interfaz) */}
            {user.rol === 'administrador' ? (
              <Link href="/admin" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
                <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">5. Administración</h3>
                <p className="text-sm text-slate-400 mt-2">Carga masiva de compras, informes INF-BAJA/INF-RENOV, reuso de CPU y descarga Excel.</p>
              </Link>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/20 border border-slate-900 opacity-40 cursor-not-allowed">
                <h3 className="font-bold text-lg text-slate-500">5. Administración</h3>
                <p className="text-sm text-slate-600 mt-2">Acceso restringido. Requiere privilegios de Administrador Patrimonial.</p>
              </div>
            )}

            {/* Módulo 6: Reportes ITIL */}
            <Link href="/reportes" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">📈 Reportes ITIL</h3>
              <p className="text-sm text-slate-400 mt-2">Métricas de Acuerdo de Niveles de Servicio (SLA), MTTR, First Contact Resolution y descarga de reportes Excel.</p>
            </Link>

            {/* Módulo 9: Kardex y Trazabilidad */}
            <Link href="/kardex" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
              <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">📋 Kardex y Trazabilidad</h3>
              <p className="text-sm text-slate-400 mt-2">Consulta del historial de movimientos, comprobantes de adición/baja y actas de asignación por número de serie.</p>
            </Link>

             {/* Módulo 7: Carga Masiva (Solo Administrador) */}
             {user.rol === 'administrador' ? (
               <Link href="/carga-masiva" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
                 <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">💾 Carga Masiva</h3>
                 <p className="text-sm text-slate-400 mt-2">Poblamiento masivo de inventario mediante formatos específicos (CPUs, Impresoras) con validación en vivo.</p>
               </Link>
             ) : (
               <div className="p-6 rounded-2xl bg-slate-950/20 border border-slate-900 opacity-40 cursor-not-allowed">
                 <h3 className="font-bold text-lg text-slate-500">💾 Carga Masiva</h3>
                 <p className="text-sm text-slate-600 mt-2">Acceso restringido. Requiere privilegios de Administrador Patrimonial.</p>
               </div>
             )}

             {/* Módulo 8: Registro de Compras (Solo Administrador) */}
             {user.rol === 'administrador' ? (
               <Link href="/compras" className="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition">
                 <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition">🛍️ Registro de Compras</h3>
                 <p className="text-sm text-slate-400 mt-2">Alta manual de compras por factura con escaneo PDF adjunto y consulta de historial cronológico.</p>
               </Link>
             ) : (
               <div className="p-6 rounded-2xl bg-slate-950/20 border border-slate-900 opacity-40 cursor-not-allowed">
                 <h3 className="font-bold text-lg text-slate-500">🛍️ Registro de Compras</h3>
                 <p className="text-sm text-slate-600 mt-2">Acceso restringido. Requiere privilegios de Administrador Patrimonial.</p>
               </div>
             )}
          </div>
        </section>
      )}
    </div>
  );
}
