import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { horaCorta } from "../lib/format";
import { useToast } from "../components/ui";

type Msg = {
  id: number; channel_id: string; user_id: string;
  body: string | null; image_path: string | null;
  created_at: string; deleted_at: string | null;
};

export default function ChatRoom() {
  const { channelId } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [titulo, setTitulo] = useState("Chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [texto, setTexto] = useState("");
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarNombres = async (ids: string[]) => {
    const faltan = ids.filter((i) => !nombres[i]);
    if (!faltan.length) return;
    const { data } = await supabase.from("profiles").select("id, first_name").in("id", faltan);
    setNombres((n) => ({ ...n, ...Object.fromEntries((data ?? []).map((p) => [p.id, p.first_name])) }));
  };

  useEffect(() => {
    if (!channelId || !profile) return;
    (async () => {
      const { data: canal } = await supabase.from("channels").select("*").eq("id", channelId).maybeSingle();
      if (!canal) { nav("/chat"); return; }
      if (canal.kind === "general") setTitulo("Chat del equipo");
      else {
        const otro = canal.member_a === profile.id ? canal.member_b : canal.member_a;
        const { data: p } = await supabase.from("profiles").select("first_name").eq("id", otro).maybeSingle();
        setTitulo(p?.first_name ?? "Conversación");
      }
      const { data } = await supabase.from("messages").select("*")
        .eq("channel_id", channelId).order("created_at", { ascending: false }).limit(60);
      const lista = ((data as Msg[]) ?? []).reverse();
      setMsgs(lista);
      cargarNombres(Array.from(new Set(lista.map((m) => m.user_id))));
    })();

    const sub = supabase
      .channel(`room-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          cargarNombres([m.user_id]);
        })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channelId, profile?.id]);

  // Signed URLs para imágenes (bucket privado)
  useEffect(() => {
    const paths = msgs.filter((m) => m.image_path && !imgUrls[m.image_path]).map((m) => m.image_path!) as string[];
    if (!paths.length) return;
    Promise.all(paths.map(async (p) => {
      const { data } = await supabase.storage.from("chat-images").createSignedUrl(p, 3600);
      return [p, data?.signedUrl ?? ""] as const;
    })).then((pairs) => setImgUrls((u) => ({ ...u, ...Object.fromEntries(pairs) })));
  }, [msgs]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const enviar = async () => {
    const body = texto.trim();
    if (!body || !profile || !channelId) return;
    setTexto("");
    const { error } = await supabase.from("messages").insert({ channel_id: channelId, user_id: profile.id, body });
    if (error) { toast("No se pudo enviar. Probá de nuevo."); setTexto(body); }
  };

  const enviarImagen = async (f: File) => {
    if (!profile || !channelId) return;
    if (f.size > 8 * 1024 * 1024) { toast("La imagen es muy pesada (máx 8 MB)"); return; }
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${channelId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, f);
    if (error) { toast("No se pudo subir la imagen"); return; }
    await supabase.from("messages").insert({ channel_id: channelId, user_id: profile.id, image_path: path });
  };

  if (!profile) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 560, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--color-line)", background: "var(--color-paper)" }}>
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/chat")} aria-label="Volver">←</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{titulo}</h1>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m) => {
          const mia = m.user_id === profile.id;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mia ? "flex-end" : "flex-start" }}>
              {!mia && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-birome)", marginBottom: 2 }}>{nombres[m.user_id] ?? "…"}</span>}
              <div className={`burbuja ${mia ? "burbuja-mia" : "burbuja-otro"}`}>
                {m.deleted_at ? <em style={{ opacity: 0.6 }}>mensaje eliminado</em> : (
                  <>
                    {m.image_path && imgUrls[m.image_path] && (
                      <img src={imgUrls[m.image_path]} alt="" style={{ maxWidth: "100%", borderRadius: 8, display: "block", marginBottom: m.body ? 6 : 0 }} />
                    )}
                    {m.body}
                  </>
                )}
              </div>
              <span style={{ fontSize: 12, color: "var(--color-ink-soft)", marginTop: 2 }}>{horaCorta(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarImagen(f); e.target.value = ""; }} />
        <button className="btn btn-fantasma" style={{ minHeight: 48, padding: "0 8px", fontSize: 24 }}
          onClick={() => fileRef.current?.click()} aria-label="Mandar imagen">📎</button>
        <input className="campo" style={{ minHeight: 48, flex: 1 }} placeholder="Escribí acá…"
          value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()} />
        <button className="btn btn-primario" style={{ minHeight: 48, minWidth: 56 }} onClick={enviar} aria-label="Enviar">➤</button>
      </div>
    </div>
  );
}
