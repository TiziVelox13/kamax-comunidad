import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import { supabase } from "../lib/supabase";
import { Vacio, useToast } from "../components/ui";

type Art = {
  id: string; slug: string; section: string; title: string;
  body_md: string; copy_blocks: { label: string; text: string }[]; sort: number;
};

const SECCIONES: Record<string, { titulo: string; emoji: string }> = {
  producto: { titulo: "La moto", emoji: "🏍️" },
  precio: { titulo: "Precio y pagos", emoji: "💲" },
  speech: { titulo: "Cómo arrancar", emoji: "🗣️" },
  objeciones: { titulo: "Si te dicen que no", emoji: "🛡️" },
  proceso: { titulo: "Del dato a la venta", emoji: "🧭" },
  no_decir: { titulo: "Qué NO decir", emoji: "🚫" },
};

export default function Guia() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const [arts, setArts] = useState<Art[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("kb_articles").select("*").eq("active", true).order("sort")
      .then(({ data }) => setArts((data as Art[]) ?? []));
  }, []);

  const actual = (arts ?? []).find((a) => a.slug === slug);
  const filtrados = useMemo(() => {
    if (!q.trim()) return arts ?? [];
    const t = q.toLowerCase();
    return (arts ?? []).filter((a) => a.title.toLowerCase().includes(t) || a.body_md.toLowerCase().includes(t));
  }, [arts, q]);

  const copiar = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast("Copiado ✓ Pegalo en tu chat");
  };

  if (actual) {
    return (
      <div className="pantalla">
        <header className="encabezado">
          <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/guia")} aria-label="Volver">←</button>
          <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
        </header>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-birome)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {SECCIONES[actual.section]?.emoji} {SECCIONES[actual.section]?.titulo}
        </span>
        <h1 className="display" style={{ fontSize: 32, margin: "4px 0 10px" }}>{actual.title}</h1>
        <div className="articulo" style={{ fontSize: 17, lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: marked.parse(actual.body_md) as string }} />
        {actual.copy_blocks?.length > 0 && (
          <>
            <h2 className="titulo-seccion" style={{ marginTop: 22 }}>Para copiar y mandar</h2>
            {actual.copy_blocks.map((b, i) => (
              <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-soft)", marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: 16.5, whiteSpace: "pre-wrap" }}>{b.text}</div>
                <button className="btn btn-borde" style={{ width: "100%", marginTop: 10, minHeight: 46 }} onClick={() => copiar(b.text)}>
                  Copiar 📋
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  const porSeccion = Object.keys(SECCIONES)
    .map((s) => ({ s, items: filtrados.filter((a) => a.section === s) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1 className="display" style={{ fontSize: 36, margin: 0 }}>Guía de venta</h1>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <input className="campo" placeholder="Buscar… (ej: repuestos, cuotas)" value={q}
        onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 6 }} />
      {arts === null ? (
        <div className="cargando" style={{ height: 140, marginTop: 12 }} />
      ) : porSeccion.length === 0 ? (
        <Vacio emoji="🔎" titulo={q ? "No encontré nada con eso" : "La guía se está armando"}
          detalle={q ? "Probá con otra palabra, o preguntale al Asistente." : "Muy pronto vas a tener acá todo lo que necesitás para vender."} />
      ) : (
        porSeccion.map(({ s, items }) => (
          <div key={s}>
            <h2 className="titulo-seccion" style={{ marginTop: 20 }}>{SECCIONES[s].emoji} {SECCIONES[s].titulo}</h2>
            {items.map((a) => (
              <button key={a.id} className="indice-row" onClick={() => nav(`/guia/${a.slug}`)}>
                <span>{a.title}</span><span className="indice-flecha">→</span>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
