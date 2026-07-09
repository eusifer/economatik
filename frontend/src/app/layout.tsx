import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import SessionBadge from '@/components/SessionBadge';

export const metadata: Metadata = {
  title: 'ENOCOMATIK - Gestión de Activos TIC',
  description: 'Solución corporativa de gestión de activos logísticos y economato para entidades de gobierno',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold tracking-tight text-blue-400 focus:ring-2 focus:ring-blue-500 rounded p-1">
                ENOCOMATIK
              </Link>
              <nav aria-label="Navegación Principal" className="hidden md:flex items-center gap-6">
                <Link href="/triaje" className="text-sm font-medium text-slate-300 hover:text-white transition p-2 rounded focus:ring-2 focus:ring-blue-500">
                  Triaje Inbound
                </Link>
                <Link href="/kanban" className="text-sm font-medium text-slate-300 hover:text-white transition p-2 rounded focus:ring-2 focus:ring-blue-500">
                  Kanban
                </Link>
                <Link href="/custodia" className="text-sm font-medium text-slate-300 hover:text-white transition p-2 rounded focus:ring-2 focus:ring-blue-500">
                  Custodia en Ruta
                </Link>
                <Link href="/admin" className="text-sm font-medium text-slate-300 hover:text-white transition p-2 rounded focus:ring-2 focus:ring-blue-500">
                  Administrador
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <SessionBadge />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-800 bg-slate-900/40 text-center py-6 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ENOCOMATIK. Software de Gestión de Activos para el Sector Público.</p>
        </footer>
      </body>
    </html>
  );
}
