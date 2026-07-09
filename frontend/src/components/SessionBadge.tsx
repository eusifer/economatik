'use client';

import { useEffect, useState } from 'react';

interface SessionData {
  username: string;
  rol: string;
}

/**
 * Componente cliente que lee la sesión activa desde localStorage.
 * Se hidrata únicamente en el navegador, evitando errores de SSR
 * al acceder a APIs exclusivas del cliente (localStorage).
 */
export default function SessionBadge() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('enocomatik_session');
      if (raw) {
        const parsed: SessionData = JSON.parse(raw);
        if (parsed.username && parsed.rol) {
          setSession(parsed);
        }
      }
    } catch {
      // Si el JSON está corrupto, tratar como sin sesión
      setSession(null);
    }
  }, []);

  // Antes de hidratación: placeholder invisible para evitar flash de contenido
  if (!mounted) {
    return (
      <div className="text-right opacity-0" aria-hidden="true">
        <div className="text-xs text-slate-400">Rol Activo:</div>
        <div className="text-sm font-semibold text-blue-400">...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-right" role="status" aria-live="polite">
        <div className="text-xs text-slate-400">Sesión:</div>
        <div className="text-sm font-semibold text-slate-500">
          Sin sesión activa
        </div>
      </div>
    );
  }

  const rolLabel: Record<string, string> = {
    administrador: '🛡️ Administrador',
    tecnico: '🔧 Técnico',
  };

  return (
    <div className="text-right" role="status" aria-live="polite">
      <div className="text-xs text-slate-400 truncate max-w-[140px]">
        {session.username}
      </div>
      <div className="text-sm font-semibold text-blue-400">
        {rolLabel[session.rol] ?? session.rol}
      </div>
    </div>
  );
}
