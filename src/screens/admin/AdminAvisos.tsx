import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Sheet, useToast } from "../../components/ui";
import { fechaCorta, waLink } from "../../lib/format";

type Aviso = { id: string; title: string; body: string | null; active: boolean; created_at: string; audience_user: string | null };
type Perfil = { id: string; first_name: string; phone: string; role: string; active: boolean };

export default function AdminAvisos() {
  const { isStaff } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [acks, setAcks] = useState<Record<string, Set<string>>>({});
  const [conPush, setConPush] = useState<Set<string>>(new Set());
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [detalle, setDetalle] = useState<Aviso | null>(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [ocupado, setOcupado] = useState(false);

  const cargar = async () => {
    const [{ data: anns }, { data: profs }, { data: ackRows }, { data: subs }] = await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("id, first_name, phone, role, active").eq("active", true),
      supabase.from("announcement_acks").select("announcement_id, user_id"),
      supabase.from("push_subscriptions").select("user_id"),
    ]);
    setAvisos((anns as Aviso[]) ?? []);
    setPerfiles((profs as Perfil[]) ?? []);
    const map: Record<string, Set<string>> = {};
    for (const r of ackRows ?? []) {
      (map[r.announcement_id] ??= new Set()).add(r.user_id);
    }
    setAcks(map);
    setConPush(new Set((subs ?? []).map((s) => s.user_id)));
  };
  useEffect(() => { if (isStaff) cargar(); }, [isStaff]);

  if (!isStaff) { nav("/"); return null; }

  const publicar = async () => {
    const title = form.title.trim();
    if (!title) { toast("Poné el título del aviso"); return; }
    setOcupado(true);
    const { error } = await supabase.from("announcements").insert({ title, body: form.body.trim() || null });
    if (error) { toast("No se pudo publicar"); setOcupado(false); return; }
    // Push a todos los dispositivos
    try {
      const { data } = await supabase.functions.invoke("push-dispatch", {
        body: { title: `📣 ${title}`, body: form.body.trim() || "Tocá para confirmar que lo viste", url: "/" },
      });
      toast(`Publicado ✓ Notificaciones: ${data?.sent ?? 0} enviadas`);
    } catch {
      toast("Publicado ✓ (las notificaciones fallaron)");
    }
    setForm({ title: "", body: "" });
    setNuevoOpen(false);
    setOcupado(false);
    cargar();
  };

  const vendedores = perfiles.filter((p) => p.role !== "observador");

  return (
    <div className="pantalla">
      <header className="encabezado">
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/equipo")} aria-label="Volver">←</button>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <h1 className="display" style={{ fontSize: 36, margin: "0 0 12px" }}>Avisos</h1>
      <button className="btn btn-rojo" style={{ width: "100%", minHeight: 56 }} onClick={() => setNuevoOpen(true)}>
        📣 Publicar aviso nuevo
      </button>

      <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Publicados</h2>
      {avisos.map((a) => {
        const destinatarios = a.audience_user
          ? vendedores.filter((p) => p.id === a.audience_user)
          : vendedores;
        const vistos = destinatarios.filter((p) => acks[a.id]?.has(p.id)).length;
        const personal = a.audience_user ? (perfiles.find((p) => p.id === a.audience_user)?.first_name ?? "una persona") : null;
        return (
          <button key={a.id} className="indice-row" style={{ minHeight: 62 }} onClick={() => setDetalle(a)}>
            <span>
              <div style={{ fontWeight: 700 }}>{a.title} {personal && <span style={{ fontWeight: 500, fontSize: 14, color: "var(--color-birome)" }}>· personal para {personal}</span>}</div>
              <div style={{ fontSize: 14.5, color: vistos >= destinatarios.length ? "var(--color-ok)" : "var(--color-ink-soft)", fontWeight: 600 }}>
                {fechaCorta(a.created_at)} · ✓ {vistos}/{destinatarios.length} confirmaron
              </div>
            </span>
            <span className="indice-flecha">→</span>
          </button>
        );
      })}

      {/* Nuevo aviso */}
      <Sheet open={nuevoOpen} onClose={() => setNuevoOpen(false)}>
        <h2 className="display" style={{ fontSize: 28, margin: "0 0 8px" }}>Aviso nuevo</h2>
        <p style={{ fontSize: 15.5, color: "var(--color-ink-soft)", margin: "0 0 8px" }}>
          Le llega como notificación a todo el equipo y queda fijado arriba hasta que cada uno confirme.
        </p>
        <label className="campo-label">Título (corto y claro)</label>
        <input className="campo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ej: Nuevo precio de lista desde el lunes" />
        <label className="campo-label">Detalle (opcional)</label>
        <textarea className="campo" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Ej: Fijate el precio nuevo en la Guía antes de pasar números." />
        <button className="btn btn-rojo" style={{ width: "100%", minHeight: 56, marginTop: 16 }} disabled={ocupado} onClick={publicar}>
          {ocupado ? "Publicando…" : "Publicar y notificar 🔔"}
        </button>
      </Sheet>

      {/* Detalle de acuses */}
      <Sheet open={!!detalle} onClose={() => setDetalle(null)}>
        {detalle && (() => {
          const set = acks[detalle.id] ?? new Set<string>();
          const alcance = detalle.audience_user ? vendedores.filter((p) => p.id === detalle.audience_user) : vendedores;
          const confirmaron = alcance.filter((p) => set.has(p.id));
          const faltan = alcance.filter((p) => !set.has(p.id));
          const msgWA = (p: Perfil) =>
            `Hola ${p.first_name}! 👋 Te dejé un aviso importante en la Comunidad KAMAX: "${detalle.title}". Entrá y tocá "Entendido ✓" así sé que lo viste 🙏`;
          return (
            <>
              <h2 className="display" style={{ fontSize: 26, margin: "0 0 4px" }}>{detalle.title}</h2>
              <p style={{ color: "var(--color-ink-soft)", margin: "0 0 12px", fontSize: 15.5 }}>{detalle.body}</p>
              {faltan.length > 0 && (
                <>
                  <h3 className="titulo-seccion" style={{ color: "var(--color-rojo)" }}>Faltan confirmar ({faltan.length})</h3>
                  {faltan.map((p) => (
                    <div key={p.id} className="ledger-row" style={{ alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>
                        {p.first_name}
                        {!conPush.has(p.id) && <span title="Sin notificaciones" style={{ fontSize: 13, color: "var(--color-rojo)", display: "block", fontWeight: 600 }}>🔕 sin notificaciones</span>}
                      </span>
                      <span className="ledger-dots" aria-hidden />
                      <a className="btn btn-wa" style={{ minHeight: 44, fontSize: 15, textDecoration: "none", padding: "0 14px" }}
                        href={waLink(p.phone, msgWA(p))} target="_blank" rel="noopener noreferrer">
                        Recordar 💬
                      </a>
                    </div>
                  ))}
                </>
              )}
              {confirmaron.length > 0 && (
                <>
                  <h3 className="titulo-seccion" style={{ color: "var(--color-ok)", marginTop: 16 }}>Confirmaron ✓ ({confirmaron.length})</h3>
                  {confirmaron.map((p) => (
                    <div key={p.id} className="ledger-row">
                      <span>{p.first_name}</span>
                      <span className="ledger-dots" aria-hidden />
                      <span style={{ color: "var(--color-ok)", fontWeight: 700 }}>✓</span>
                    </div>
                  ))}
                </>
              )}
            </>
          );
        })()}
      </Sheet>
    </div>
  );
}
