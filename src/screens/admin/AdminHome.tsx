import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function AdminHome() {
  const { profile, isStaff, signOut } = useAuth();
  const nav = useNavigate();
  if (!profile) return null;
  const esCreador = isStaff || profile.role === "creador";

  return (
    <div className="pantalla">
      <header className="encabezado">
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/")} aria-label="Volver">←</button>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <h1 className="display" style={{ fontSize: 38, margin: "4px 0 2px" }}>Equipo</h1>
      <p style={{ color: "var(--color-ink-soft)", margin: "0 0 18px" }}>Herramientas de coordinación</p>

      {isStaff && (
        <>
          <button className="indice-row" style={{ minHeight: 64 }} onClick={() => nav("/equipo/avisos")}>
            <span>📣 Avisos y acuses</span><span className="indice-flecha">→</span>
          </button>
          <button className="indice-row" style={{ minHeight: 64 }} onClick={() => nav("/equipo/vendedores")}>
            <span>👥 Vendedores e invitaciones</span><span className="indice-flecha">→</span>
          </button>
        </>
      )}
      {esCreador && (
        <button className="indice-row" style={{ minHeight: 64 }} onClick={() => nav("/equipo/placas")}>
          <span>🖼️ Subir placas</span><span className="indice-flecha">→</span>
        </button>
      )}
      {isStaff && (
        <button className="indice-row" style={{ minHeight: 64 }} onClick={() => nav("/equipo/guia")}>
          <span>📖 Editar la Guía</span><span className="indice-flecha">→</span>
        </button>
      )}

      <button className="btn btn-fantasma" style={{ width: "100%", marginTop: 30, color: "var(--color-ink-soft)" }}
        onClick={async () => { await signOut(); nav("/login"); }}>
        Cerrar sesión
      </button>
    </div>
  );
}
