import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Sheet, Vacio, useToast } from "../components/ui";
import { STAGES, stageInfo } from "../lib/format";

type Cliente = {
  id: string; first_name: string; zona: string | null;
  medio_pago: string | null; stage: string; phone: string | null;
  notes: string | null; created_at: string;
};

export default function Clientes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [sel, setSel] = useState<Cliente | null>(null);
  const [altaOpen, setAltaOpen] = useState(false);
  const [festejo, setFestejo] = useState(false);
  const [form, setForm] = useState({ first_name: "", zona: "", phone: "", medio_pago: "" });

  const cargar = () =>
    profile && supabase.from("clients").select("*").eq("owner_id", profile.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setClientes((data as Cliente[]) ?? []));

  useEffect(() => { cargar(); }, [profile?.id]);

  const guardarAlta = async () => {
    if (!profile) return;
    const nombre = form.first_name.trim();
    if (!nombre) { toast("Poné el nombre del cliente"); return; }
    if (/[0-9]{7,}/.test(nombre) || /[0-9]{7,}/.test(form.zona)) {
      toast("Ojo: nada de números largos (DNI) acá 🙅"); return;
    }
    const { error } = await supabase.from("clients").insert({
      owner_id: profile.id, source: "vendedor",
      first_name: nombre,
      zona: form.zona.trim() || null,
      phone: form.phone.trim() || null,
      medio_pago: form.medio_pago || null,
    });
    if (error) { toast("No se pudo guardar. Revisá los datos."); return; }
    setForm({ first_name: "", zona: "", phone: "", medio_pago: "" });
    setAltaOpen(false);
    toast("Cliente anotado 📒");
    cargar();
  };

  const cambiarEtapa = async (c: Cliente, stage: string) => {
    if (!profile) return;
    const { error } = await supabase.from("clients")
      .update({ stage, updated_at: new Date().toISOString(), ...(stage === "venta" ? { sold_at: new Date().toISOString() } : {}) })
      .eq("id", c.id);
    if (error) { toast("No se pudo cambiar"); return; }
    await supabase.from("client_events").insert({
      client_id: c.id, user_id: profile.id, kind: "stage_change", from_stage: c.stage, to_stage: stage,
    });
    setSel(null);
    if (stage === "venta") { setFestejo(true); setTimeout(() => setFestejo(false), 2600); }
    cargar();
  };

  const activos = (clientes ?? []).filter((c) => !["venta", "perdido"].includes(c.stage));
  const cerrados = (clientes ?? []).filter((c) => ["venta", "perdido"].includes(c.stage));

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1 className="display" style={{ fontSize: 36, margin: 0 }}>Mis clientes</h1>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <p style={{ color: "var(--color-ink-soft)", margin: "0 0 8px", fontSize: 16.5 }}>
        Tu cuaderno personal: anotá a cada interesado y movelo de etapa. Solo lo ven vos y tu líder.
      </p>
      <p style={{ fontSize: 14.5, color: "var(--color-rojo)", fontWeight: 600, margin: "0 0 14px" }}>
        🔒 Nunca anotes el DNI acá — eso va solo por el canal del asesor.
      </p>

      <button className="btn btn-primario" style={{ width: "100%", minHeight: 56 }} onClick={() => setAltaOpen(true)}>
        ➕ Anotar cliente nuevo
      </button>

      {clientes === null ? (
        <div className="cargando" style={{ height: 120, marginTop: 16 }} />
      ) : activos.length === 0 && cerrados.length === 0 ? (
        <Vacio emoji="📒" titulo="Tu cuaderno está en blanco"
          detalle="Cuando alguien te pregunte por la moto, anotalo acá y no se te escapa más." />
      ) : (
        <>
          {activos.length > 0 && <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Trabajando ahora</h2>}
          {activos.map((c) => {
            const st = stageInfo(c.stage);
            return (
              <button key={c.id} className="indice-row" style={{ minHeight: 62 }} onClick={() => setSel(c)}>
                <span>
                  <div style={{ fontWeight: 700 }}>{c.first_name} {c.zona ? <span style={{ fontWeight: 400, color: "var(--color-ink-soft)" }}>· {c.zona}</span> : null}</div>
                  <div style={{ fontSize: 15, color: "var(--color-birome)", fontWeight: 600 }}>{st.emoji} {st.label}</div>
                </span>
                <span className="indice-flecha">→</span>
              </button>
            );
          })}
          {cerrados.length > 0 && <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Cerrados</h2>}
          {cerrados.map((c) => {
            const st = stageInfo(c.stage);
            return (
              <button key={c.id} className="indice-row" style={{ minHeight: 56, opacity: c.stage === "perdido" ? 0.6 : 1 }} onClick={() => setSel(c)}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 700 }}>{c.first_name}</span>
                  {c.stage === "venta" ? <span className="sello" style={{ fontSize: 15 }}>VENTA 🎉</span> : <span style={{ color: "var(--color-ink-soft)" }}>{st.emoji} {st.label}</span>}
                </span>
                <span className="indice-flecha">→</span>
              </button>
            );
          })}
        </>
      )}

      {/* Alta */}
      <Sheet open={altaOpen} onClose={() => setAltaOpen(false)}>
        <h2 className="display" style={{ fontSize: 28, margin: "0 0 8px" }}>Cliente nuevo</h2>
        <label className="campo-label">Nombre (con eso alcanza)</label>
        <input className="campo" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Ej: Carlos" />
        <label className="campo-label">Zona (opcional)</label>
        <input className="campo" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} placeholder="Ej: Alta Córdoba" />
        <label className="campo-label">Celular (opcional — es TU cliente)</label>
        <input className="campo" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="351 …" />
        <label className="campo-label">¿Cómo pagaría? (opcional)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["contado", "Contado"], ["tarjeta", "Tarjeta"], ["financiado", "Financiado"], ["consulta", "No sé aún"]].map(([v, l]) => (
            <button key={v} className="btn" style={{
              minHeight: 46, fontSize: 15.5,
              background: form.medio_pago === v ? "var(--color-birome)" : "var(--color-surface)",
              color: form.medio_pago === v ? "#fff" : "var(--color-ink)",
              border: form.medio_pago === v ? "none" : "2px solid var(--color-line)",
            }} onClick={() => setForm({ ...form, medio_pago: form.medio_pago === v ? "" : v })}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primario" style={{ width: "100%", minHeight: 56, marginTop: 18 }} onClick={guardarAlta}>
          Anotar en el cuaderno 📒
        </button>
      </Sheet>

      {/* Detalle / cambio de etapa */}
      <Sheet open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <>
            <h2 className="display" style={{ fontSize: 30, margin: "0 0 2px" }}>{sel.first_name}</h2>
            <p style={{ color: "var(--color-ink-soft)", margin: "0 0 12px" }}>
              {[sel.zona, sel.medio_pago && `paga: ${sel.medio_pago}`, sel.phone].filter(Boolean).join(" · ") || "Sin datos extra"}
            </p>
            {sel.phone && (
              <a className="btn btn-wa" style={{ width: "100%", marginBottom: 14, textDecoration: "none" }}
                href={`https://wa.me/549${sel.phone.replace(/\D/g, "").replace(/^0/, "").replace(/^549?/, "")}`}
                target="_blank" rel="noopener noreferrer">
                Escribirle por WhatsApp 💬
              </a>
            )}
            <h3 className="titulo-seccion">¿En qué etapa está?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {STAGES.map((s) => (
                <button key={s.id} className="btn" style={{
                  minHeight: 52, justifyContent: "flex-start",
                  background: sel.stage === s.id ? "var(--color-birome)" : "var(--color-surface)",
                  color: sel.stage === s.id ? "#fff" : "var(--color-ink)",
                  border: sel.stage === s.id ? "none" : "2px solid var(--color-line)",
                }} onClick={() => cambiarEtapa(sel, s.id)}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      {/* Festejo VENTA */}
      {festejo && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, background: "oklch(98.4% 0.004 250 / 0.85)", pointerEvents: "none" }}>
          <span className="sello sello-animado" style={{ fontSize: 52, padding: "10px 26px" }}>VENTA 🎉</span>
        </div>
      )}
    </div>
  );
}
