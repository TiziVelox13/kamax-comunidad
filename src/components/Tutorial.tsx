import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../lib/auth";

export const TUTORIAL_KEY = "kamax_tutorial_v1";

type Paso = { emoji: string; titulo: string; texto: string; extra?: React.ReactNode };

/* Mini-demos visuales dibujadas con el propio sistema (sin imágenes) */
const MiniLedger = () => (
  <div style={{ margin: "14px 6px 0" }}>
    <div className="ledger-row" style={{ padding: "6px 2px" }}>
      <span style={{ fontSize: 14.5, fontWeight: 500 }}>Placas compartidas</span>
      <span className="ledger-dots" aria-hidden />
      <span className="ledger-num" style={{ fontSize: 22 }}>12</span>
    </div>
    <div className="ledger-row" style={{ padding: "6px 2px", borderBottom: "none" }}>
      <span style={{ fontSize: 14.5, fontWeight: 500 }}>Racha 🔥</span>
      <span className="ledger-dots" aria-hidden />
      <span className="ledger-num" style={{ fontSize: 22, color: "var(--color-rojo)" }}>5 días</span>
    </div>
  </div>
);

const MiniRecorte = () => (
  <div className="recorte" style={{ margin: "14px 6px 0", padding: "10px 12px" }}>
    <div style={{ fontWeight: 700, fontSize: 14.5 }}>📣 Nuevo precio desde el lunes</div>
    <div style={{ background: "var(--color-rojo)", color: "#fff", borderRadius: 7, textAlign: "center", padding: "7px 0", fontWeight: 700, fontSize: 14, marginTop: 8 }}>
      Entendido ✓
    </div>
  </div>
);

const MiniBotones = () => (
  <div style={{ display: "flex", gap: 8, margin: "14px 6px 0" }}>
    <div style={{ flex: 1, background: "var(--color-birome)", color: "#fff", borderRadius: 8, textAlign: "center", padding: "9px 0", fontWeight: 700, fontSize: 13.5 }}>
      Compartir 📤
    </div>
    <div style={{ flex: 1, background: "var(--color-surface)", border: "2px solid var(--color-ink)", borderRadius: 8, textAlign: "center", padding: "7px 0", fontWeight: 700, fontSize: 13.5 }}>
      Copiar texto 📋
    </div>
  </div>
);

const MiniSello = () => (
  <div style={{ textAlign: "center", margin: "16px 0 2px" }}>
    <span className="sello" style={{ fontSize: 22, padding: "3px 14px" }}>VENTA 🎉</span>
  </div>
);

export function Tutorial({ onCerrar }: { onCerrar: () => void }) {
  const { profile, isStaff } = useAuth();
  const [i, setI] = useState(0);
  const fondoRef = useRef<HTMLDivElement>(null);

  // Al cambiar de paso, el overlay vuelve arriba (por si el paso anterior scrolleó)
  useEffect(() => { fondoRef.current?.scrollTo({ top: 0 }); }, [i]);

  const pasos = useMemo<Paso[]>(() => {
    const base: Paso[] = [
      {
        emoji: "📒",
        titulo: `¡Hola, ${profile?.first_name ?? "compañero"}!`,
        texto: "Esta es la Comunidad KAMAX: tu cuaderno de ventas. Todo lo que necesitás para vender la AL125 vive acá. Te muestro en 1 minuto cómo funciona.",
      },
      {
        emoji: "📣",
        titulo: "Los avisos importantes",
        texto: "Cuando haya una novedad (precio, stock, urgencia) te aparece arriba de todo, como un recorte pegado. Tocá \"Entendido ✓\" cuando lo leas — así el equipo sabe que estás al tanto.",
        extra: <MiniRecorte />,
      },
      {
        emoji: "🏍️",
        titulo: "Placas listas para compartir",
        texto: "Fotos y diseños de la moto con el texto ya escrito. Un toque para mandarla a tus redes o WhatsApp, otro para copiar el texto. Compartir todos los días trae clientes.",
        extra: <MiniBotones />,
      },
      {
        emoji: "📖",
        titulo: "La Guía + el Asistente",
        texto: "En la Guía está TODO: qué decir del precio, cómo responder cada objeción, qué cosas las confirma el asesor. ¿Apurado? Preguntale al Asistente 🤖 y te contesta al instante, a cualquier hora.",
      },
      {
        emoji: "✍️",
        titulo: "Tu cuaderno de clientes",
        texto: "Anotá a cada interesado con su nombre y movelo de etapa a medida que avanza. Cuando cierres una venta… lo estampamos juntos. Solo lo ven vos y tu líder.",
        extra: <MiniSello />,
      },
      {
        emoji: "🔥",
        titulo: "Tus números, tu racha",
        texto: "En Inicio ves tus placas compartidas, tu racha de días activo y tus clientes en curso. Entrá todos los días aunque sea un minuto: la constancia vende.",
        extra: <MiniLedger />,
      },
    ];
    if (profile?.role === "creador" || isStaff) {
      base.push({
        emoji: "🎨",
        titulo: "Subir contenido nuevo",
        texto: "Desde Equipo 🛠️ → Subir placa cargás una foto con su texto en menos de un minuto. Ojo: el sistema no deja publicar precios en los textos — el precio se charla en privado.",
      });
    }
    if (isStaff) {
      base.push({
        emoji: "🛠️",
        titulo: "El panel del equipo",
        texto: "Desde Equipo publicás avisos (le llegan como notificación a todos), ves quién confirmó y quién falta, invitás vendedores por WhatsApp y editás la Guía. Todo sin tocar nada técnico.",
      });
    }
    base.push({
      emoji: "💬",
      titulo: "No estás solo",
      texto: "En el Chat está todo el equipo, y tenés tu línea directa 1 a 1 con tu líder. Preguntá, compartí, festejá. ¡Éxitos y a vender! 🏍️",
    });
    return base;
  }, [profile?.role, isStaff, profile?.first_name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  const cerrar = () => {
    localStorage.setItem(TUTORIAL_KEY, "visto");
    onCerrar();
  };

  const paso = pasos[i];
  const ultimo = i === pasos.length - 1;

  return (
    <div ref={fondoRef} className="tuto-fondo" role="dialog" aria-modal="true" aria-label="Tutorial de la Comunidad">
      <div className="tuto-hoja" key={i}>
        <span className="tuto-emoji" style={{ fontSize: 46 }} aria-hidden>{paso.emoji}</span>
        <h2 className="display" style={{ fontSize: 26, textAlign: "center", margin: "10px 0 6px", color: "var(--color-birome)" }}>
          {paso.titulo}
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.45, textAlign: "center", margin: 0, color: "var(--color-ink)" }}>
          {paso.texto}
        </p>
        {paso.extra}
        <div className="tuto-dots" style={{ marginTop: 14 }} aria-hidden>
          {pasos.map((_, j) => <span key={j} className={`tuto-dot ${j === i ? "activo" : ""}`} />)}
        </div>
        <button
          className="btn btn-primario"
          style={{ width: "100%", marginTop: 13, minHeight: 52 }}
          onClick={() => (ultimo ? cerrar() : setI(i + 1))}
        >
          {ultimo ? "¡A vender! 🏍️" : "Siguiente →"}
        </button>
        {!ultimo && (
          <button className="btn btn-fantasma" style={{ width: "100%", minHeight: 40, fontSize: 15, color: "var(--color-ink-soft)" }} onClick={cerrar}>
            Saltar por ahora
          </button>
        )}
      </div>
    </div>
  );
}
