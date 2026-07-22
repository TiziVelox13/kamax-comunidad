import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Sheet, useToast } from "../../components/ui";
import { waLink } from "../../lib/format";

type Perfil = { id: string; first_name: string; phone: string; role: string; active: boolean };
type Invite = { id: string; token: string; first_name: string; phone: string; role: string; used_by: string | null; expires_at: string };

const ROLES = [["vendedor", "Vendedor"], ["creador", "Creador de contenido"], ["lider", "Líder"], ["observador", "Observador"]];

export default function AdminVendedores() {
  const { isStaff, profile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [altaOpen, setAltaOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", phone: "", role: "vendedor" });

  const cargar = async () => {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, phone, role, active").order("first_name"),
      supabase.from("invites").select("*").is("used_by", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    ]);
    setPerfiles((p as Perfil[]) ?? []);
    setInvites((i as Invite[]) ?? []);
  };
  useEffect(() => { if (isStaff) cargar(); }, [isStaff]);

  if (!isStaff) { nav("/"); return null; }

  const linkInvite = (token: string) => `${location.origin}/invite/${token}`;
  const msgInvite = (i: { first_name: string; token: string }) =>
    `¡Hola ${i.first_name}! 👋 Te sumo al equipo de ventas KAMAX 🏍️\n\nEntrá por acá y elegí tu PIN (te lleva 1 minuto):\n${linkInvite(i.token)}\n\nAhí adentro tenés las placas para compartir, la guía de venta y todo el equipo. ¡Bienvenido/a!`;

  const crearInvite = async () => {
    const nombre = form.first_name.trim();
    const tel = form.phone.trim();
    if (!nombre || tel.replace(/\D/g, "").length < 8) { toast("Completá nombre y celular"); return; }
    const { error } = await supabase.from("invites").insert({
      first_name: nombre, phone: tel, role: form.role, created_by: profile!.id,
    });
    if (error) { toast("No se pudo crear la invitación"); return; }
    setForm({ first_name: "", phone: "", role: "vendedor" });
    setAltaOpen(false);
    toast("Invitación lista ✓ Mandásela por WhatsApp");
    cargar();
  };

  const reenviarAcceso = async (p: Perfil) => {
    // Nuevo invite para el mismo teléfono → al canjearlo, resetea el PIN
    const { error } = await supabase.from("invites").insert({
      first_name: p.first_name, phone: p.phone, role: p.role, created_by: profile!.id,
    });
    if (error) { toast("No se pudo generar el acceso"); return; }
    toast("Acceso nuevo generado ✓ Aparece en Invitaciones pendientes");
    cargar();
  };

  const toggleActivo = async (p: Perfil) => {
    const { error } = await supabase.from("profiles").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast("Solo el admin puede cambiar esto"); return; }
    toast(p.active ? `${p.first_name} desactivado 🔒` : `${p.first_name} reactivado ✓`);
    cargar();
  };

  return (
    <div className="pantalla">
      <header className="encabezado">
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/equipo")} aria-label="Volver">←</button>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <h1 className="display" style={{ fontSize: 36, margin: "0 0 12px" }}>Vendedores</h1>
      <button className="btn btn-primario" style={{ width: "100%", minHeight: 56 }} onClick={() => setAltaOpen(true)}>
        ➕ Invitar al equipo
      </button>

      {invites.length > 0 && (
        <>
          <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Invitaciones pendientes</h2>
          {invites.map((i) => (
            <div key={i.id} className="ledger-row" style={{ alignItems: "center" }}>
              <span>
                <div style={{ fontWeight: 700 }}>{i.first_name}</div>
                <div style={{ fontSize: 14, color: "var(--color-ink-soft)" }}>{i.phone} · {i.role}</div>
              </span>
              <span className="ledger-dots" aria-hidden />
              <a className="btn btn-wa" style={{ minHeight: 44, fontSize: 15, textDecoration: "none", padding: "0 14px" }}
                href={waLink(i.phone, msgInvite(i))} target="_blank" rel="noopener noreferrer">
                Enviar 💬
              </a>
            </div>
          ))}
        </>
      )}

      <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Equipo</h2>
      {perfiles.map((p) => (
        <div key={p.id} className="ledger-row" style={{ alignItems: "center", opacity: p.active ? 1 : 0.55 }}>
          <span>
            <div style={{ fontWeight: 700 }}>{p.first_name} {!p.active && "🔒"}</div>
            <div style={{ fontSize: 14, color: "var(--color-ink-soft)" }}>{p.phone} · {p.role}</div>
          </span>
          <span className="ledger-dots" aria-hidden />
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-borde" style={{ minHeight: 44, fontSize: 14, padding: "0 10px" }} onClick={() => reenviarAcceso(p)}>
              Reenviar acceso
            </button>
            <button className="btn" style={{ minHeight: 44, fontSize: 14, padding: "0 10px", background: p.active ? "var(--color-paper-deep)" : "var(--color-ok)", color: p.active ? "var(--color-ink)" : "#fff" }}
              onClick={() => toggleActivo(p)}>
              {p.active ? "Pausar" : "Activar"}
            </button>
          </span>
        </div>
      ))}

      <Sheet open={altaOpen} onClose={() => setAltaOpen(false)}>
        <h2 className="display" style={{ fontSize: 28, margin: "0 0 8px" }}>Invitar al equipo</h2>
        <label className="campo-label">Nombre</label>
        <input className="campo" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Ej: Carlos" />
        <label className="campo-label">Celular (con característica)</label>
        <input className="campo" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="351 555 0000" />
        <label className="campo-label">Rol</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ROLES.map(([v, l]) => (
            <button key={v} className="btn" style={{
              minHeight: 46, fontSize: 15,
              background: form.role === v ? "var(--color-birome)" : "var(--color-surface)",
              color: form.role === v ? "#fff" : "var(--color-ink)",
              border: form.role === v ? "none" : "2px solid var(--color-line)",
            }} onClick={() => setForm({ ...form, role: v })}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primario" style={{ width: "100%", minHeight: 56, marginTop: 18 }} onClick={crearInvite}>
          Crear invitación →
        </button>
        <p style={{ fontSize: 14.5, color: "var(--color-ink-soft)", textAlign: "center", marginTop: 10 }}>
          Después la mandás por WhatsApp con un toque.
        </p>
      </Sheet>
    </div>
  );
}
