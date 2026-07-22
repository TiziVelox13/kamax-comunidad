import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui";

export default function AdminPlacas() {
  const { profile, isStaff } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({ title: "", campaign: "", caption: "" });
  const [ocupado, setOcupado] = useState(false);

  const puede = isStaff || profile?.role === "creador";
  if (!profile || !puede) { nav("/"); return null; }

  const tienePrecio = /\$\s*\d/.test(form.caption);

  const elegir = (f: File) => {
    if (f.size > 15 * 1024 * 1024) { toast("Muy pesada (máx 15 MB)"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }));
  };

  const publicar = async () => {
    if (!file) { toast("Elegí la imagen primero"); return; }
    if (!form.title.trim()) { toast("Ponele un nombre a la placa"); return; }
    if (tienePrecio) { toast("El texto no puede llevar precio 🚫"); return; }
    setOcupado(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("placas").upload(path, file);
    if (upErr) { toast("No se pudo subir la imagen"); setOcupado(false); return; }
    const { error } = await supabase.from("assets").insert({
      title: form.title.trim(),
      campaign: form.campaign.trim() || null,
      storage_path: path,
      caption: form.caption.trim(),
      created_by: profile.id,
    });
    if (error) { toast("No se pudo guardar la placa"); setOcupado(false); return; }
    // Avisar al equipo (push suave, sin acuse)
    try {
      await supabase.functions.invoke("push-dispatch", {
        body: { title: "🖼️ Placa nueva lista para repostear", body: form.title.trim(), url: "/placas" },
      });
    } catch { /* no bloquea */ }
    toast("¡Placa publicada! El equipo ya la ve 🏍️");
    setFile(null); setPreview(""); setForm({ title: "", campaign: "", caption: "" });
    setOcupado(false);
  };

  return (
    <div className="pantalla">
      <header className="encabezado">
        <button className="btn btn-fantasma" style={{ minHeight: 40, padding: "0 6px", fontSize: 24 }} onClick={() => nav("/equipo")} aria-label="Volver">←</button>
        <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 20 }} />
      </header>
      <h1 className="display" style={{ fontSize: 36, margin: "0 0 4px" }}>Subir placa</h1>
      <p style={{ color: "var(--color-ink-soft)", margin: "0 0 14px", fontSize: 16 }}>
        Elegí la imagen, escribí el texto sugerido y publicá. Un minuto, desde el celu.
      </p>

      <input ref={fileRef} type="file" accept="image/*,video/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) elegir(f); }} />
      {preview ? (
        <button onClick={() => fileRef.current?.click()} style={{ border: "none", padding: 0, background: "none", cursor: "pointer", width: "100%" }}>
          <img src={preview} alt="Vista previa" style={{ width: "100%", borderRadius: 12, display: "block" }} />
          <span style={{ fontSize: 14.5, color: "var(--color-birome)", fontWeight: 600 }}>Tocar para cambiar</span>
        </button>
      ) : (
        <button className="btn btn-borde" style={{ width: "100%", minHeight: 120, borderStyle: "dashed", flexDirection: "column", gap: 6 }}
          onClick={() => fileRef.current?.click()}>
          <span style={{ fontSize: 34 }}>📷</span>
          <span>Elegir de la galería</span>
        </button>
      )}

      <label className="campo-label">Nombre de la placa</label>
      <input className="campo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Moto en el patio — roja" />
      <label className="campo-label">Campaña (opcional, agrupa placas)</label>
      <input className="campo" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="Ej: Julio 2026" />
      <label className="campo-label">Texto sugerido para repostear</label>
      <textarea className="campo" rows={4} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })}
        placeholder={"Ej: 🏍️ KAMAX AL125 — 125cc, arranque eléctrico, tablero digital y USB.\n0 km lista para la calle. ¿Te interesa? Escribime 👇"} />
      {tienePrecio && (
        <p style={{ color: "var(--color-rojo)", fontWeight: 700, fontSize: 15.5 }}>
          🚫 El texto tiene un precio — sacalo. El precio se pasa solo en el 1 a 1 con el cliente.
        </p>
      )}
      <button className="btn btn-primario" style={{ width: "100%", minHeight: 56, marginTop: 16 }}
        disabled={ocupado || tienePrecio} onClick={publicar}>
        {ocupado ? "Publicando…" : "Publicar para el equipo 🚀"}
      </button>
    </div>
  );
}
