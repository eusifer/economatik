'use client';

import { useEffect, useState } from 'react';

interface UserSession {
  id: string;
  username: string;
  rol: string;
}

/**
 * Lee la sesión desde las mismas claves que escribe page.tsx:
 *   localStorage.setItem('token', ...)
 *   localStorage.setItem('user', JSON.stringify(...))
 *
 * También escucha el evento 'storage' para actualizarse automáticamente
 * cuando limpiarSesion() hace localStorage.clear() desde otra pestaña
 * o cuando el login escribe las claves por primera vez.
 *
 * Para actualizaciones en la MISMA pestaña (logout en page.tsx),
 * se escucha además el evento personalizado 'session-change'.
 */
export default function SessionBadge() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [mounted, setMounted] = useState(false);

  const leerSesion = () => {
    try {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      if (token && userRaw) {
        const parsed: UserSession = JSON.parse(userRaw);
        if (parsed.username && parsed.rol) {
          setSession(parsed);
          return;
        }
      }
    } catch {
      // JSON corrupto → tratar como sin sesión
    }
    setSession(null);
  };

  useEffect(() => {
    setMounted(true);
    leerSesion();

    // Evento estándar del navegador: detecta cambios de localStorage
    // desde OTRAS pestañas (misma origin).
    window.addEventListener('storage', leerSesion);

    // Evento personalizado: detecta login/logout dentro de la MISMA pestaña.
    // page.tsx debe disparar: window.dispatchEvent(new Event('session-change'))
    // después de escribir/limpiar localStorage.
    window.addEventListener('session-change', leerSesion);

    return () => {
      window.removeEventListener('storage', leerSesion);
      window.removeEventListener('session-change', leerSesion);
    };
  }, []);

  // Placeholder invisible antes de hidratación (evita SSR mismatch)
  if (!mounted) {
    return (
      <div className="text-right opacity-0 select-none" aria-hidden="true">
        <div className="text-xs">·</div>
        <div className="text-sm">·</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-right" role="status" aria-live="polite">
        <div className="text-xs text-slate-500">Sesión:</div>
        <div className="text-sm font-semibold text-slate-500 italic">
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
      <div className="text-xs text-slate-400 truncate max-w-[160px]">
        {session.username}
      </div>
      <div className="text-sm font-semibold text-blue-400">
        {rolLabel[session.rol] ?? session.rol}
      </div>
    </div>
  );
}
