import { createContext, useContext, useEffect, useRef, useState } from "react";

/* ---------- Toast ---------- */
type ToastCtx = { toast: (msg: string) => void };
const TCtx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(TCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const toast = (m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  };
  return (
    <TCtx.Provider value={{ toast }}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </TCtx.Provider>
  );
}

/* ---------- Fila de ledger ---------- */
export function LedgerRow({ label, value, color }: { label: React.ReactNode; value: React.ReactNode; color?: string }) {
  return (
    <div className="ledger-row">
      <span style={{ fontSize: 17, fontWeight: 500 }}>{label}</span>
      <span className="ledger-dots" aria-hidden />
      <span className="ledger-num" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

/* ---------- Título de sección ---------- */
export const TituloSeccion = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <h2 className="titulo-seccion" style={{ margin: "18px 0 4px", ...style }}>{children}</h2>
);

/* ---------- Sheet inferior ---------- */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="sheet-fondo"
      style={{ position: "fixed", inset: 0, background: "oklch(17.8% 0.032 260 / 0.5)", zIndex: 55, display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-panel"
        style={{
          background: "var(--color-paper)", width: "100%", maxWidth: 560, margin: "0 auto",
          borderRadius: "16px 16px 0 0", padding: "10px 18px calc(18px + env(safe-area-inset-bottom))",
          maxHeight: "88dvh", overflowY: "auto",
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--color-dots)", margin: "6px auto 12px" }} />
        {children}
      </div>
    </div>
  );
}

/* ---------- Estado vacío digno ---------- */
export function Vacio({ emoji, titulo, detalle }: { emoji: string; titulo: string; detalle?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--color-ink-soft)" }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 19, color: "var(--color-ink)" }}>{titulo}</div>
      {detalle && <div style={{ fontSize: 16, marginTop: 6 }}>{detalle}</div>}
    </div>
  );
}

/* ---------- Spinner ---------- */
export const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div className="cargando" style={{ width: 120, height: 14 }} />
  </div>
);

/* ---------- Avatar ---------- */
export const Avatar = ({ nombre, size = 40 }: { nombre: string; size?: number }) => (
  <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
    {nombre.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
  </span>
);
