import { useLocation, useNavigate } from "react-router-dom";

/* Íconos línea-birome propios (trazo 2px, sin relleno) */
const I = {
  inicio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9h13v-9" />
    </svg>
  ),
  placas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10.2" r="1.7" /><path d="M4.5 17.5 10 12.8l3.4 2.9 3.2-2.4 2.9 2.4" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12a8.5 8.5 0 1 1-4-7.2" /><path d="M20.5 4.5 12.6 12l-2.8-1" /><path d="M7.5 20.5 8.6 17" />
    </svg>
  ),
  guia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" /><path d="M17.5 16.5H8" /><path d="M8.5 8.5h5.5M8.5 11.5h5.5" />
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v16.5l-3-1.8-3 1.8-3-1.8-3 1.8V4Z" /><path d="M9 8.5h6M9 12h6" />
    </svg>
  ),
};

const TABS = [
  { path: "/", label: "Inicio", icon: I.inicio },
  { path: "/placas", label: "Placas", icon: I.placas },
  { path: "/chat", label: "Chat", icon: I.chat },
  { path: "/guia", label: "Guía", icon: I.guia },
  { path: "/clientes", label: "Clientes", icon: I.clientes },
];

export function TabBar({ chatBadge = 0, soloDesktop = false }: { chatBadge?: number; soloDesktop?: boolean }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const activa = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  return (
    <nav className={`tabbar ${soloDesktop ? "solo-desktop" : ""}`} aria-label="Navegación principal">
      <div className="tab-logo" aria-hidden>
        <img src="/img/logo-kamax.png" alt="" style={{ height: 22 }} />
        <span>Comunidad</span>
      </div>
      {TABS.map((t) => (
        <button key={t.path} className={`tab ${activa(t.path) ? "activa" : ""}`} onClick={() => nav(t.path)}>
          {t.icon}
          <span>{t.label}</span>
          {t.path === "/chat" && chatBadge > 0 && (
            <span className="badge-rojo" style={{ position: "absolute", top: 4, right: "22%" }}>{chatBadge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
