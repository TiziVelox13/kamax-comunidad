import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Vacio } from "../components/ui";

type Canal = { id: string; kind: "general" | "dm"; name: string | null; member_a: string | null; member_b: string | null };

export default function Chat() {
  const { profile, isStaff } = useAuth();
  const nav = useNavigate();
  const [canales, setCanales] = useState<Canal[] | null>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data } = await supabase.from("channels").select("*").order("kind");
      const cs = (data as Canal[]) ?? [];
      setCanales(cs);
      const ids = Array.from(new Set(cs.flatMap((c) => [c.member_a, c.member_b]).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name").in("id", ids);
        setNombres(Object.fromEntries((profs ?? []).map((p) => [p.id, p.first_name])));
      }
    })();
  }, [profile?.id]);

  if (!profile) return null;
  const general = (canales ?? []).find((c) => c.kind === "general");
  const dms = (canales ?? []).filter((c) => c.kind === "dm");
  const otro = (c: Canal) => (c.member_a === profile.id ? c.member_b : c.member_a);

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1 className="display" style={{ fontSize: 36, margin: 0 }}>Chat</h1>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>

      {canales === null ? (
        <div className="cargando" style={{ height: 120 }} />
      ) : (
        <>
          {general && (
            <button className="indice-row" style={{ minHeight: 66 }} onClick={() => nav(`/chat/${general.id}`)}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>👥</span>
                <span>
                  <div style={{ fontWeight: 700 }}>Chat del equipo</div>
                  <div style={{ fontSize: 14.5, color: "var(--color-ink-soft)", fontWeight: 400 }}>Toda la comunidad</div>
                </span>
              </span>
              <span className="indice-flecha">→</span>
            </button>
          )}
          <h2 className="titulo-seccion" style={{ marginTop: 20 }}>{isStaff ? "Tus 1 a 1" : "Tu línea directa"}</h2>
          {dms.length === 0 ? (
            <Vacio emoji="👤" titulo={isStaff ? "Sin conversaciones todavía" : "Tu canal con tu líder aparece acá"}
              detalle={isStaff ? "Cuando entren vendedores, sus líneas aparecen acá." : "Se crea solo apenas haya una líder activa."} />
          ) : (
            dms.map((c) => {
              const oid = otro(c);
              const nombre = (oid && nombres[oid]) || "Conversación";
              return (
                <button key={c.id} className="indice-row" style={{ minHeight: 62 }} onClick={() => nav(`/chat/${c.id}`)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="avatar">{nombre.slice(0, 2).toUpperCase()}</span>
                    <span style={{ fontWeight: 600 }}>{nombre}</span>
                  </span>
                  <span className="indice-flecha">→</span>
                </button>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
