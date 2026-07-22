import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Sheet, useToast } from "../../components/ui";

type Art = {
  id?: string; slug: string; section: string; title: string;
  body_md: string; copy_blocks: { label: string; text: string }[]; sort: number; active: boolean;
};

const SECS = [["producto", "La moto"], ["precio", "Precio y pagos"], ["speech", "Cómo arrancar"], ["objeciones", "Objeciones"], ["proceso", "Proceso"], ["no_decir", "Qué NO decir"]];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export default function AdminKB() {
  const { isStaff } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [arts, setArts] = useState<Art[]>([]);
  const [edit, setEdit] = useState<Art | null>(null);

  const cargar = () =>
    supabase.from("kb_articles").select("*").order("sort").then(({ data }) => setArts((data as Art[]) ?? []));
  useEffect(() => { if (isStaff) cargar(); }, [isStaff]);
  if (!isStaff) { nav("/"); return null; }

  const nuevo = (): Art => ({ slug: "", section: "producto", title: "", body_md: "", copy_blocks: [], sort: 100, active: true });

  const guardar = async () => {
    if (!edit) return;
    if (!edit.title.trim()) { toast("Falta el título"); return; }
    const row = { ...edit, slug: edit.slug || slugify(edit.title) };
    const { error } = edit.id
      ? await supabase.from("kb_articles").update(row).eq("id", edit.id)
      : await supabase.from("kb_articles").insert(row);
    if (error) { toast("No se pudo guardar (¿slug repetido?)"); return; }
    toast("Guardado ✓");
    setEdit(null);
    cargar();
  };

  return (
    <div className="pantalla">
      <header className="encabezado">
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/equipo")} aria-label="Volver">←</button>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <h1 className="display" style={{ fontSize: 36, margin: "0 0 12px" }}>Editar la Guía</h1>
      <button className="btn btn-primario" style={{ width: "100%", minHeight: 54 }} onClick={() => setEdit(nuevo())}>
        ➕ Artículo nuevo
      </button>
      {SECS.map(([s, l]) => {
        const items = arts.filter((a) => a.section === s);
        if (!items.length) return null;
        return (
          <div key={s}>
            <h2 className="titulo-seccion" style={{ marginTop: 20 }}>{l}</h2>
            {items.map((a) => (
              <button key={a.id} className="indice-row" onClick={() => setEdit(a)}>
                <span style={{ opacity: a.active ? 1 : 0.5 }}>{a.title} {!a.active && "(oculto)"}</span>
                <span className="indice-flecha">✏️</span>
              </button>
            ))}
          </div>
        );
      })}

      <Sheet open={!!edit} onClose={() => setEdit(null)}>
        {edit && (
          <>
            <h2 className="display" style={{ fontSize: 26, margin: "0 0 8px" }}>{edit.id ? "Editar" : "Nuevo"} artículo</h2>
            <label className="campo-label">Sección</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SECS.map(([v, l]) => (
                <button key={v} className="btn" style={{
                  minHeight: 42, fontSize: 14,
                  background: edit.section === v ? "var(--color-birome)" : "var(--color-surface)",
                  color: edit.section === v ? "#fff" : "var(--color-ink)",
                  border: edit.section === v ? "none" : "2px solid var(--color-line)",
                }} onClick={() => setEdit({ ...edit, section: v })}>{l}</button>
              ))}
            </div>
            <label className="campo-label">Título</label>
            <input className="campo" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <label className="campo-label">Contenido (podés usar **negrita** y listas con -)</label>
            <textarea className="campo" rows={8} value={edit.body_md} onChange={(e) => setEdit({ ...edit, body_md: e.target.value })} />
            <label className="campo-label">Bloques copiables</label>
            {edit.copy_blocks.map((b, i) => (
              <div key={i} style={{ border: "1px solid var(--color-line)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <input className="campo" style={{ minHeight: 44, marginBottom: 6 }} placeholder="Etiqueta (ej: Respuesta corta)"
                  value={b.label} onChange={(e) => {
                    const cb = [...edit.copy_blocks]; cb[i] = { ...b, label: e.target.value }; setEdit({ ...edit, copy_blocks: cb });
                  }} />
                <textarea className="campo" rows={3} placeholder="Texto que el vendedor copia y manda"
                  value={b.text} onChange={(e) => {
                    const cb = [...edit.copy_blocks]; cb[i] = { ...b, text: e.target.value }; setEdit({ ...edit, copy_blocks: cb });
                  }} />
                <button className="btn btn-fantasma" style={{ minHeight: 38, fontSize: 14, color: "var(--color-rojo)" }}
                  onClick={() => setEdit({ ...edit, copy_blocks: edit.copy_blocks.filter((_, j) => j !== i) })}>
                  Quitar bloque
                </button>
              </div>
            ))}
            <button className="btn btn-borde" style={{ width: "100%", minHeight: 46 }}
              onClick={() => setEdit({ ...edit, copy_blocks: [...edit.copy_blocks, { label: "", text: "" }] })}>
              ➕ Agregar bloque copiable
            </button>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-primario" style={{ flex: 1, minHeight: 54 }} onClick={guardar}>Guardar ✓</button>
              <button className="btn btn-borde" style={{ minHeight: 54 }}
                onClick={() => setEdit({ ...edit, active: !edit.active })}>
                {edit.active ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
