import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, FUNCTIONS_URL } from "../lib/supabase";
import { enablePush, needsInstallFirst, type PushResult } from "../lib/push";
import { useAuth } from "../lib/auth";

type Paso = "cargando" | "pin" | "push" | "instalar_ios" | "listo" | "invalido";

export default function Invite() {
  const { token } = useParams();
  const nav = useNavigate();
  const { refreshProfile } = useAuth();
  const [paso, setPaso] = useState<Paso>("cargando");
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/redeem-invite?token=${encodeURIComponent(token ?? "")}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        });
        const data = await res.json();
        if (!res.ok || !data.first_name) { setPaso("invalido"); return; }
        setNombre(data.first_name);
        if (data.auto) {
          // Invitación de prueba con auto-entrada: canjea y entra sola, sin pasos
          const r2 = await fetch(`${FUNCTIONS_URL}/redeem-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
            body: JSON.stringify({ token }),
          });
          const d2 = await r2.json();
          if (r2.ok && d2.email && d2.pin) {
            const { error: loginErr } = await supabase.auth.signInWithPassword({ email: d2.email, password: d2.pin });
            if (!loginErr) { await refreshProfile(); nav("/", { replace: true }); return; }
          }
          setPaso("invalido");
          return;
        }
        setPaso("pin");
      } catch { setPaso("invalido"); }
    })();
  }, [token]);

  const canjear = async () => {
    setError("");
    if (!/^\d{4,6}$/.test(pin)) { setError("El PIN tiene que ser de 4 a 6 números."); return; }
    if (pin !== pin2) { setError("Los PIN no coinciden. Escribilos de nuevo."); return; }
    setOcupado(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/redeem-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Algo salió mal."); setOcupado(false); return; }
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: data.email, password: pin });
      if (loginErr) { setError("Cuenta creada, pero no pudimos entrar. Probá desde la pantalla de entrada."); setOcupado(false); return; }
      await refreshProfile();
      setPaso(needsInstallFirst() ? "instalar_ios" : "push");
    } catch { setError("Sin conexión. Probá de nuevo."); }
    setOcupado(false);
  };

  const activarPush = async () => {
    setOcupado(true);
    const { data: { user } } = await supabase.auth.getUser();
    const r: PushResult = user ? await enablePush(user.id) : "error";
    setOcupado(false);
    if (r === "needs_install") { setPaso("instalar_ios"); return; }
    setPaso("listo");
  };

  const Logo = <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 26, margin: "26px auto 0", display: "block" }} />;

  if (paso === "cargando") return <div className="pantalla-plena">{Logo}<div className="cargando" style={{ height: 20, margin: "40px auto", maxWidth: 220 }} /></div>;

  if (paso === "invalido") {
    return (
      <div className="pantalla-plena" style={{ textAlign: "center" }}>
        {Logo}
        <div style={{ fontSize: 48, marginTop: 60 }}>😕</div>
        <h1 className="display" style={{ fontSize: 34 }}>Esta invitación no sirve más</h1>
        <p style={{ color: "var(--color-ink-soft)", fontSize: 17 }}>
          Puede que ya la hayas usado o que esté vencida.<br />Pedile una nueva a tu líder por WhatsApp.
        </p>
        <button className="btn btn-borde" style={{ margin: "20px auto" }} onClick={() => nav("/login")}>Ya tengo cuenta → entrar</button>
      </div>
    );
  }

  if (paso === "pin") {
    return (
      <div className="pantalla-plena">
        {Logo}
        <h1 className="display" style={{ fontSize: 40, margin: "34px 0 4px" }}>¡Hola, {nombre}! 👋</h1>
        <p style={{ fontSize: 18, color: "var(--color-ink-soft)", margin: "0 0 22px" }}>
          Bienvenido al equipo KAMAX. Elegí un PIN para entrar (como el del cajero).
        </p>
        <label className="campo-label" htmlFor="pin">Tu PIN (4 a 6 números)</label>
        <input id="pin" className="campo" type="password" inputMode="numeric" autoComplete="new-password"
          maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          style={{ letterSpacing: 8, fontSize: 26, textAlign: "center" }} />
        <label className="campo-label" htmlFor="pin2">Repetilo para confirmar</label>
        <input id="pin2" className="campo" type="password" inputMode="numeric" autoComplete="new-password"
          maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
          style={{ letterSpacing: 8, fontSize: 26, textAlign: "center" }} />
        {error && <p style={{ color: "var(--color-rojo)", fontWeight: 600 }}>{error}</p>}
        <button className="btn btn-primario" style={{ width: "100%", marginTop: 22, minHeight: 56 }}
          disabled={ocupado} onClick={canjear}>
          {ocupado ? "Creando tu cuenta…" : "Entrar a la comunidad →"}
        </button>
        <p style={{ fontSize: 15, color: "var(--color-ink-soft)", textAlign: "center", marginTop: 14 }}>
          Guardate el PIN. Si lo perdés, tu líder te manda un acceso nuevo.
        </p>
      </div>
    );
  }

  if (paso === "push") {
    return (
      <div className="pantalla-plena" style={{ textAlign: "center" }}>
        {Logo}
        <div style={{ fontSize: 52, marginTop: 46 }}>🔔</div>
        <h1 className="display" style={{ fontSize: 36 }}>Activá las notificaciones</h1>
        <p style={{ fontSize: 18, color: "var(--color-ink-soft)" }}>
          Por acá te llegan los <strong style={{ color: "var(--color-ink)" }}>avisos importantes</strong>: precios,
          novedades y urgencias. <strong style={{ color: "var(--color-rojo)" }}>Aceptá el permiso sí o sí</strong> cuando
          el teléfono te lo pregunte.
        </p>
        <button className="btn btn-rojo" style={{ width: "100%", minHeight: 58, marginTop: 18 }} disabled={ocupado} onClick={activarPush}>
          Activar notificaciones 🔔
        </button>
        <button className="btn btn-fantasma" style={{ width: "100%", marginTop: 8 }} onClick={() => setPaso("listo")}>
          Ahora no (no recomendado)
        </button>
      </div>
    );
  }

  if (paso === "instalar_ios") {
    return (
      <div className="pantalla-plena">
        {Logo}
        <h1 className="display" style={{ fontSize: 34, marginTop: 30 }}>Un paso más en iPhone 🍎</h1>
        <p style={{ fontSize: 17.5, color: "var(--color-ink-soft)" }}>
          Para que te lleguen los avisos, primero agregá la app a tu pantalla de inicio:
        </p>
        <ol style={{ fontSize: 18, lineHeight: 2, paddingLeft: 24 }}>
          <li>Tocá el botón <strong>Compartir</strong> <span aria-hidden>⬆️</span> (abajo en Safari)</li>
          <li>Elegí <strong>"Agregar a inicio"</strong> <span aria-hidden>➕</span></li>
          <li>Abrí <strong>KAMAX</strong> desde el ícono nuevo</li>
          <li>Volvé a esta parte y activá las notificaciones</li>
        </ol>
        <button className="btn btn-primario" style={{ width: "100%", marginTop: 16 }} onClick={activarPush}>
          Ya la agregué → activar notificaciones
        </button>
        <button className="btn btn-fantasma" style={{ width: "100%", marginTop: 8 }} onClick={() => setPaso("listo")}>
          Después lo hago
        </button>
      </div>
    );
  }

  return (
    <div className="pantalla-plena" style={{ textAlign: "center" }}>
      {Logo}
      <div style={{ marginTop: 60 }}>
        <span className="sello sello-animado" style={{ fontSize: 34, padding: "6px 18px" }}>¡ADENTRO! 🎉</span>
      </div>
      <p style={{ fontSize: 18, color: "var(--color-ink-soft)", marginTop: 26 }}>
        Ya sos parte de la Comunidad KAMAX.<br />Arrancá por las placas: elegí una y compartila en tus redes.
      </p>
      <button className="btn btn-primario" style={{ width: "100%", minHeight: 58, marginTop: 12 }} onClick={() => nav("/placas")}>
        Ver las placas 🏍️ →
      </button>
    </div>
  );
}
