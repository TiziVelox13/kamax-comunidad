import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { hoyLargo, calcRacha } from "../lib/format";
import { useToast } from "../components/ui";
import { Tutorial, TUTORIAL_KEY } from "../components/Tutorial";
import { PushBanner } from "../components/PushBanner";

type Aviso = { id: string; title: string; body: string | null; created_at: string };

export default function Home() {
  const { profile, isStaff } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [stats, setStats] = useState({ placas: 0, racha: 0, clientes: 0 });
  const [chatSinLeer, setChatSinLeer] = useState(0);
  const [tutorial, setTutorial] = useState(false);

  useEffect(() => {
    if (profile && !localStorage.getItem(TUTORIAL_KEY)) setTutorial(true);
  }, [profile?.id]);

  const cargar = async () => {
    if (!profile) return;
    // Aviso pendiente más reciente sin acuse
    const { data: anns } = await supabase.from("announcements")
      .select("id, title, body, created_at").eq("active", true)
      .order("created_at", { ascending: false }).limit(10);
    const { data: acks } = await supabase.from("announcement_acks")
      .select("announcement_id").eq("user_id", profile.id);
    const acked = new Set((acks ?? []).map((a) => a.announcement_id));
    setAviso((anns ?? []).find((a) => !acked.has(a.id)) ?? null);

    // Números vivos
    const [{ count: ev }, { count: cl }, { data: act }] = await Promise.all([
      supabase.from("asset_events").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      supabase.from("clients").select("id", { count: "exact", head: true })
        .eq("owner_id", profile.id).not("stage", "in", "(venta,perdido)"),
      supabase.from("daily_activity").select("day").eq("user_id", profile.id)
        .order("day", { ascending: false }).limit(60),
    ]);
    setStats({
      placas: ev ?? 0,
      clientes: cl ?? 0,
      racha: calcRacha((act ?? []).map((d) => String(d.day))),
    });
  };

  useEffect(() => { cargar(); }, [profile?.id]);

  const confirmarAviso = async () => {
    if (!aviso || !profile) return;
    const { error } = await supabase.from("announcement_acks")
      .insert({ announcement_id: aviso.id, user_id: profile.id });
    if (!error) { toast("Aviso confirmado ✓"); cargar(); }
  };

  if (!profile) return null;

  return (
    <div className="pantalla">
      <header className="encabezado">
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 22 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-fantasma"
            style={{ minHeight: 42, minWidth: 42, padding: 0, fontSize: 19, border: "2px solid var(--color-line)", borderRadius: "50%" }}
            onClick={() => setTutorial(true)}
            aria-label="Ver el tutorial de nuevo"
            title="¿Cómo funciona?"
          >?</button>
          {(isStaff || profile.role === "creador") && (
            <button className="btn btn-borde" style={{ minHeight: 42, fontSize: 15, padding: "0 14px" }} onClick={() => nav("/equipo")}>
              Equipo 🛠️
            </button>
          )}
          <span className="avatar">{profile.first_name.slice(0, 2).toUpperCase()}</span>
        </div>
      </header>

      <PushBanner />

      <h1 className="display" style={{ fontSize: 40, margin: "4px 0 0" }}>Hola, {profile.first_name}</h1>
      <p style={{ color: "var(--color-ink-soft)", margin: "2px 0 16px", fontSize: 17 }}>{hoyLargo()}</p>

      {aviso && (
        <div className="recorte" style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.3 }}>📣 {aviso.title}</div>
          {aviso.body && <div style={{ color: "var(--color-ink-soft)", margin: "6px 0 2px", fontSize: 16.5 }}>{aviso.body}</div>}
          <button className="btn btn-rojo" style={{ width: "100%", marginTop: 12 }} onClick={confirmarAviso}>
            Entendido ✓
          </button>
        </div>
      )}

      <h2 className="titulo-seccion">Tus cuentas de hoy</h2>
      <div>
        <div className="ledger-row">
          <span style={{ fontWeight: 500 }}>Placas compartidas</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-num">{stats.placas}</span>
        </div>
        <div className="ledger-row">
          <span style={{ fontWeight: 500 }}>Racha 🔥</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-num" style={{ color: "var(--color-rojo)" }}>{stats.racha} {stats.racha === 1 ? "día" : "días"}</span>
        </div>
        <div className="ledger-row" style={{ borderBottom: "none" }}>
          <span style={{ fontWeight: 500 }}>Clientes activos</span>
          <span className="ledger-dots" aria-hidden />
          <span className="ledger-num">{stats.clientes}</span>
        </div>
      </div>

      <h2 className="titulo-seccion" style={{ marginTop: 24 }}>Índice</h2>
      <button className="indice-row" onClick={() => nav("/placas")}>
        <span>🏍️ Placas para compartir</span><span className="indice-flecha">→</span>
      </button>
      <button className="indice-row" onClick={() => nav("/guia")}>
        <span>📖 Guía de venta</span><span className="indice-flecha">→</span>
      </button>
      <button className="indice-row" onClick={() => nav("/chat")}>
        <span>💬 Chat del equipo</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {chatSinLeer > 0 && <span className="badge-rojo">{chatSinLeer}</span>}
          <span className="indice-flecha">→</span>
        </span>
      </button>
      <button className="indice-row" onClick={() => nav("/asistente")}>
        <span>🤖 Asistente</span><span className="indice-flecha">→</span>
      </button>
      <button className="indice-row" style={{ borderBottom: "none" }} onClick={() => nav("/clientes")}>
        <span>📒 Mis clientes</span><span className="indice-flecha">→</span>
      </button>

      <div style={{ marginTop: 26, display: "flex", gap: 14, alignItems: "center", borderTop: "1px solid var(--color-line)", paddingTop: 14 }}>
        <img src="/img/moto-34.webp" alt="KAMAX AL125" style={{ width: 104 }} />
        <div>
          <div className="display" style={{ fontSize: 22, color: "var(--color-birome)" }}>AL125</div>
          <div style={{ fontSize: 15.5, color: "var(--color-ink-soft)" }}>La moto que estamos vendiendo. Ficha completa en la Guía.</div>
        </div>
      </div>

      {tutorial && <Tutorial onCerrar={() => setTutorial(false)} />}
    </div>
  );
}
