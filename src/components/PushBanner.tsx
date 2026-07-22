import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { enablePush, hasPushSubscription, needsInstallFirst, pushSupport } from "../lib/push";
import { Sheet, useToast } from "./ui";

/** Banner en Inicio para activar las notificaciones después del onboarding */
export function PushBanner() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [mostrar, setMostrar] = useState(false);
  const [guiaIOS, setGuiaIOS] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!pushSupport() && !needsInstallFirst()) return;
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
      const tiene = await hasPushSubscription();
      setMostrar(!tiene);
    })();
  }, []);

  if (!mostrar || !profile) return null;

  const activar = async () => {
    if (needsInstallFirst()) { setGuiaIOS(true); return; }
    setOcupado(true);
    const r = await enablePush(profile.id);
    setOcupado(false);
    if (r === "ok") { toast("¡Notificaciones activadas! 🔔"); setMostrar(false); }
    else if (r === "denied") { toast("El teléfono bloqueó el permiso — activalo desde la configuración del navegador"); }
    else if (r === "needs_install") { setGuiaIOS(true); }
    else toast("No se pudo activar. Probá de nuevo.");
  };

  return (
    <>
      <button className="push-banner entra-1" onClick={activar} disabled={ocupado}>
        <span style={{ fontSize: 26 }} aria-hidden>🔔</span>
        <span style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 16, display: "block" }}>Activá las notificaciones</span>
          <span style={{ fontSize: 14.5, color: "var(--color-ink-soft)" }}>Para no perderte ningún aviso importante</span>
        </span>
        <span style={{ color: "var(--color-birome)", fontSize: 20, fontWeight: 700 }} aria-hidden>→</span>
      </button>

      <Sheet open={guiaIOS} onClose={() => setGuiaIOS(false)}>
        <h2 className="display" style={{ fontSize: 28, margin: "0 0 8px" }}>En iPhone, un paso más 🍎</h2>
        <ol style={{ fontSize: 17, lineHeight: 1.9, paddingLeft: 22, margin: "8px 0" }}>
          <li>Tocá <strong>Compartir</strong> <span aria-hidden>⬆️</span> abajo en Safari</li>
          <li>Elegí <strong>"Agregar a inicio"</strong> <span aria-hidden>➕</span></li>
          <li>Abrí <strong>KAMAX</strong> desde el ícono nuevo</li>
          <li>Tocá este botón de nuevo y aceptá el permiso</li>
        </ol>
        <button className="btn btn-primario" style={{ width: "100%", minHeight: 52 }} onClick={() => setGuiaIOS(false)}>
          Entendido
        </button>
      </Sheet>
    </>
  );
}
