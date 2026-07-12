'use client';

import React, { useState, useEffect } from 'react';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SessionBadge from '@/components/SessionBadge';
import { 
  LayoutDashboard, 
  BarChart3, 
  ClipboardCopy, 
  KanbanSquare, 
  HardDrive, 
  FileSpreadsheet, 
  Warehouse, 
  Layers, 
  Boxes, 
  TrendingUp, 
  ShoppingCart, 
  ShieldAlert,
  Menu,
  X,
  LogOut
} from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<{username: string; rol: string} | null>(null);

  useEffect(() => {
    const readUser = () => {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        try {
          setSession(JSON.parse(userRaw));
        } catch (e) {}
      } else {
        setSession(null);
      }
    };

    readUser();
    window.addEventListener('session-change', readUser);
    return () => window.removeEventListener('session-change', readUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('session-change'));
    window.location.href = '/';
  };

  const menuGroups = [
    {
      title: 'General',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['administrador', 'tecnico', 'invitado'] },
        { name: 'Reportes ITIL', href: '/reportes', icon: BarChart3, roles: ['administrador', 'tecnico'] },
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { name: 'Triaje Inbound', href: '/triaje', icon: ClipboardCopy, roles: ['administrador', 'tecnico'] },
        { name: 'Kanban de Tickets', href: '/kanban', icon: KanbanSquare, roles: ['administrador', 'tecnico'] },
      ]
    },
    {
      title: 'Inventario CMDB',
      items: [
        { name: 'Asignaciones', href: '/asignaciones', icon: Warehouse, roles: ['administrador', 'tecnico', 'invitado'] },
        { name: 'Kardex Logístico', href: '/kardex', icon: Layers, roles: ['administrador', 'tecnico', 'invitado'] },
        { name: 'Consultar Almacenes', href: '/almacenes', icon: HardDrive, roles: ['administrador', 'tecnico', 'invitado'] },
      ]
    },
    {
      title: 'Economato',
      items: [
        { name: 'Economato - Registro', href: '/custodia', icon: Boxes, roles: ['administrador', 'tecnico'] },
        { name: 'Reporte de Usos', href: '/reporte-economato', icon: TrendingUp, roles: ['administrador', 'tecnico', 'invitado'] },
        { name: 'Registro de Compras', href: '/compras', icon: ShoppingCart, roles: ['administrador', 'tecnico', 'invitado'] },
        { name: 'Carga Masiva', href: '/carga-masiva', icon: FileSpreadsheet, roles: ['administrador'] },
      ]
    },
    {
      title: 'Seguridad',
      items: [
        { name: 'Administrador', href: '/admin', icon: ShieldAlert, roles: ['administrador'] },
      ]
    }
  ];

  const isLoginPage = pathname === '/';

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex font-sans">
        {isLoginPage ? (
          <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        ) : (
          <>
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-800 bg-slate-900/60 sticky top-0 h-screen overflow-y-auto">
              <div className="p-6 border-b border-slate-850 flex items-center justify-between">
                <Link href="/dashboard" className="text-lg font-bold tracking-wider text-blue-400 font-mono">
                  ECONOMATIK
                </Link>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/50 uppercase font-bold font-mono">
                  v1.4
                </span>
              </div>
              <div className="flex-1 px-4 py-6 space-y-6">
                {menuGroups.map((group, gIdx) => {
                  const visibleItems = group.items.filter(item => item.roles.includes(session?.rol || 'invitado'));
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={gIdx} className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block">
                        {group.title}
                      </span>
                      <nav className="space-y-1">
                        {visibleItems.map((item, iIdx) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={iIdx}
                              href={item.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                                isActive
                                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400 font-bold'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                              {item.name}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  );
                })}
              </div>

              {/* User Profile & Logout section at the bottom of the sidebar */}
              <div className="p-4 border-t border-slate-850 bg-slate-950/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs uppercase select-none">
                    {session?.username ? session.username.slice(0, 2) : 'US'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-200 truncate">{session?.username || 'Cargando...'}</span>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest">{session?.rol || 'Sesión'}</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 bg-red-950/40 hover:bg-red-900/20 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-900/50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión Corporativa
                </button>
              </div>
            </aside>

            {/* Sidebar Mobile Drawer */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/80 backdrop-blur-sm">
                <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col p-6 animate-in slide-in-from-left duration-200">
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <span className="text-lg font-bold text-blue-400 font-mono">ECONOMATIK</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 py-6 space-y-6 overflow-y-auto">
                    {menuGroups.map((group, gIdx) => {
                      const visibleItems = group.items.filter(item => item.roles.includes(session?.rol || 'invitado'));
                      if (visibleItems.length === 0) return null;

                      return (
                        <div key={gIdx} className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                            {group.title}
                          </span>
                          <nav className="space-y-1">
                            {visibleItems.map((item, iIdx) => {
                              const Icon = item.icon;
                              const isActive = pathname === item.href;
                              return (
                                <Link
                                  key={iIdx}
                                  href={item.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    isActive
                                      ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-400 font-bold'
                                      : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                  {item.name}
                                </Link>
                              );
                            })}
                          </nav>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Profile & Logout */}
                  <div className="mt-auto border-t border-slate-800 pt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs uppercase select-none">
                        {session?.username ? session.username.slice(0, 2) : 'US'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-200 truncate">{session?.username || 'Cargando...'}</span>
                        <span className="block text-[9px] text-slate-500 uppercase tracking-widest">{session?.rol || 'Sesión'}</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2 bg-red-950/40 hover:bg-red-900/20 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-900/50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
                    </button>
                  </div>
                </div>
                <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-45">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <span className="hidden md:inline text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/40 px-3 py-1 rounded border border-slate-850">
                      Portal de Modernización TIC — ITIL v4 CMAC Tacna
                    </span>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <main className="flex-1 p-6 md:p-8">
                {children}
              </main>

              {/* Footer */}
              <footer className="border-t border-slate-800/60 bg-slate-900/20 text-center py-4 text-[10px] text-slate-500">
                <p>© {new Date().getFullYear()} ECONOMATIK — Jefatura de Soporte de TI y Comunicaciones (Tacna). Todos los derechos reservados.</p>
              </footer>
            </div>
          </>
        )}
      </body>
    </html>
  );
}
