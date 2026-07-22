import { useEffect, useMemo, useState } from "react";
import { supabase, publicUrl } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Sheet, Vacio, useToast } from "../components/ui";
import { fechaCorta } from "../lib/format";

type Asset = {
  id: string; title: string; campaign: string | null;
  storage_path: string; caption: string; created_at: string;
};

export default function Placas() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [sel, setSel] = useState<Asset | null>(null);
  const [campania, setCampania] = useState<string>("todas");

  useEffect(() => {
    supabase.from("assets").select("*").eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAssets((data as Asset[]) ?? []));
  }, []);

  const campanias = useMemo(
    () => Array.from(new Set((assets ?? []).map((a) => a.campaign).filter(Boolean))) as string[],
    [assets],
  );
  const lista = (assets ?? []).filter((a) => campania === "todas" || a.campaign === campania);

  const evento = (asset_id: string, kind: string) =>
    profile && supabase.from("asset_events").insert({ asset_id, user_id: profile.id, kind }).then(() => {});

  const compartir = async (a: Asset) => {
    const url = publicUrl("placas", a.storage_path);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = a.storage_path.split(".").pop() || "jpg";
      const file = new File([blob], `kamax-${a.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        evento(a.id, "share");
        toast("¡Compartida! 💪");
        return;
      }
      // Fallback: descarga directa
      const obj = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = obj; link.download = file.name; link.click();
      URL.revokeObjectURL(obj);
      evento(a.id, "download");
      toast("Descargada 📥 Buscala en tu galería");
    } catch {
      window.open(url, "_blank");
      evento(a.id, "download");
    }
  };

  const copiarCaption = async (a: Asset) => {
    await navigator.clipboard.writeText(a.caption);
    evento(a.id, "copy_caption");
    toast("Texto copiado ✓ Pegalo en tu publicación");
  };

  return (
    <div className="pantalla">
      <header className="encabezado">
        <h1 className="display" style={{ fontSize: 36, margin: 0 }}>Placas</h1>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <p style={{ color: "var(--color-ink-soft)", margin: "0 0 14px", fontSize: 16.5 }}>
        Elegí una, compartila en tus redes y copiá el texto que ya viene listo.
      </p>

      {campanias.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
          {["todas", ...campanias].map((c) => (
            <button key={c}
              className="btn"
              style={{
                minHeight: 42, fontSize: 15.5, whiteSpace: "nowrap",
                background: campania === c ? "var(--color-birome)" : "var(--color-surface)",
                color: campania === c ? "#fff" : "var(--color-ink)",
                border: campania === c ? "none" : "2px solid var(--color-line)",
              }}
              onClick={() => setCampania(c)}>
              {c === "todas" ? "Todas" : c}
            </button>
          ))}
        </div>
      )}

      {assets === null ? (
        <div className="cargando" style={{ height: 180, marginTop: 10 }} />
      ) : lista.length === 0 ? (
        <Vacio emoji="🖼️" titulo="Todavía no hay placas acá"
          detalle="Apenas el equipo suba contenido nuevo, te va a llegar el aviso." />
      ) : (
        <div className="grilla-placas">
          {lista.map((a) => (
            <button key={a.id} onClick={() => setSel(a)}
              style={{ border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden", background: "var(--color-surface)", cursor: "pointer", padding: 0, textAlign: "left" }}>
              <img src={publicUrl("placas", a.storage_path)} alt={a.title}
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} loading="lazy" />
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.25 }}>{a.title}</div>
                <div style={{ fontSize: 13.5, color: "var(--color-ink-soft)" }}>{a.campaign ?? fechaCorta(a.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <>
            <img src={publicUrl("placas", sel.storage_path)} alt={sel.title}
              style={{ width: "100%", borderRadius: 10, display: "block" }} />
            <h2 style={{ fontSize: 20, margin: "12px 0 4px" }}>{sel.title}</h2>
            {sel.caption && (
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, padding: "10px 12px", fontSize: 16, color: "var(--color-ink-soft)", whiteSpace: "pre-wrap" }}>
                {sel.caption}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              <button className="btn btn-primario" style={{ minHeight: 56 }} onClick={() => compartir(sel)}>
                Compartir / Descargar 📤
              </button>
              {sel.caption && (
                <button className="btn btn-borde" style={{ minHeight: 56 }} onClick={() => copiarCaption(sel)}>
                  Copiar texto 📋
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
