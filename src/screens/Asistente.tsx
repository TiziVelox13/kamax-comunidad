import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/ui";

type Msg = { id?: number; role: "user" | "assistant"; body: string; sources?: { slug: string; title: string }[] };

const SUGERENCIAS = [
  "¿Qué le contesto a uno que dice que está cara?",
  "Pasame la ficha técnica resumida",
  "Armame un mensaje para reactivar un cliente frío",
];

export default function Asistente() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [confirmaReset, setConfirmaReset] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const resetTimer = useRef<number>();

  const reiniciar = async () => {
    if (!profile) return;
    // Primer toque: pide confirmación (3 segundos); segundo toque: borra
    if (!confirmaReset) {
      setConfirmaReset(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setConfirmaReset(false), 5000);
      return;
    }
    window.clearTimeout(resetTimer.current);
    setConfirmaReset(false);
    const { error } = await supabase.from("assistant_messages").delete().eq("user_id", profile.id);
    if (error) { toast("No se pudo reiniciar. Probá de nuevo."); return; }
    setMsgs([]);
    setTexto("");
    toast("Conversación reiniciada ↺ Empezamos de cero");
  };

  useEffect(() => {
    if (!profile) return;
    supabase.from("assistant_messages").select("id, role, body, sources")
      .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setMsgs(((data as Msg[]) ?? []).reverse()));
  }, [profile?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, pensando]);

  const preguntar = async (q?: string) => {
    const message = (q ?? texto).trim();
    if (!message || pensando) return;
    setTexto("");
    setMsgs((m) => [...m, { role: "user", body: message }]);
    setPensando(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistant", { body: { message } });
      if (error) throw error;
      setMsgs((m) => [...m, { role: "assistant", body: data.reply, sources: data.sources }]);
    } catch {
      toast("No pude responder. Probá de nuevo.");
      setMsgs((m) => m.slice(0, -1));
      setTexto(message);
    }
    setPensando(false);
  };

  if (!profile) return null;

  return (
    <div className="pantalla-chat" style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 560, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--color-line)" }}>
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/")} aria-label="Volver">←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Asistente 🤖</h1>
          <span style={{ fontSize: 14, color: "var(--color-ink-soft)" }}>Tu compañero de ventas, 24 hs</span>
        </div>
        {msgs.length > 0 && (
          <button
            className={`btn ${confirmaReset ? "btn-rojo" : "btn-borde"}`}
            style={{ minHeight: 42, fontSize: confirmaReset ? 14.5 : 19, padding: "0 12px", whiteSpace: "nowrap" }}
            onClick={reiniciar}
            aria-label="Reiniciar la conversación"
            title="Reiniciar la conversación"
          >
            {confirmaReset ? "¿Borrar todo?" : "↺"}
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <div style={{ fontSize: 44 }}>🤖</div>
            <p style={{ fontSize: 17, color: "var(--color-ink-soft)", margin: "8px 0 18px" }}>
              Preguntame lo que necesites para vender la AL125.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGERENCIAS.map((s) => (
                <button key={s} className="btn btn-borde" style={{ fontSize: 16, fontWeight: 500 }} onClick={() => preguntar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id ?? `t${i}`} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div className={`burbuja ${m.role === "user" ? "burbuja-mia" : "burbuja-otro"}`} style={{ whiteSpace: "pre-wrap" }}>
              {m.body}
            </div>
            {m.role === "assistant" && (m.sources?.length ?? 0) > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {m.sources!.map((s) => (
                  <button key={s.slug} className="btn btn-fantasma"
                    style={{ minHeight: 40, fontSize: 15, border: "1.5px solid var(--color-birome)", borderRadius: 20, padding: "0 14px" }}
                    onClick={() => nav(`/guia/${s.slug}`)}>
                    📖 {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {pensando && <div className="burbuja burbuja-otro cargando" style={{ width: 90 }}>&nbsp;pensando…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
        <input className="campo" style={{ minHeight: 48, flex: 1 }} placeholder="Escribí tu pregunta…"
          value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && preguntar()} />
        <button className="btn btn-primario" style={{ minHeight: 48, minWidth: 56 }} disabled={pensando} onClick={() => preguntar()} aria-label="Preguntar">➤</button>
      </div>
    </div>
  );
}
