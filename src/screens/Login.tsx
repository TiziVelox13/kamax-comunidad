import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, phoneToEmail } from "../lib/supabase";

export default function Login() {
  const nav = useNavigate();
  const [tel, setTel] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    setError("");
    if (tel.replace(/\D/g, "").length < 8) { setError("Escribí tu número de celular completo."); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError("El PIN es de 4 a 6 números."); return; }
    setOcupado(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(tel),
      password: pin,
    });
    setOcupado(false);
    if (err) { setError("Teléfono o PIN incorrectos. Si te olvidaste el PIN, pedile un acceso nuevo a tu líder."); return; }
    nav("/", { replace: true });
  };

  return (
    <div className="pantalla-plena">
      <img src="/img/logo-kamax.png" alt="KAMAX" style={{ height: 28, margin: "40px auto 0", display: "block" }} />
      <h1 className="display" style={{ fontSize: 42, textAlign: "center", margin: "22px 0 2px" }}>Comunidad</h1>
      <p style={{ textAlign: "center", color: "var(--color-ink-soft)", margin: "0 0 26px", fontSize: 17 }}>
        El cuaderno del equipo de ventas
      </p>
      <label className="campo-label" htmlFor="tel">Tu celular</label>
      <input id="tel" className="campo" type="tel" inputMode="tel" autoComplete="tel"
        placeholder="351 555 0000" value={tel} onChange={(e) => setTel(e.target.value)} />
      <label className="campo-label" htmlFor="pin">Tu PIN</label>
      <input id="pin" className="campo" type="password" inputMode="numeric" maxLength={6}
        value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        style={{ letterSpacing: 8, fontSize: 26, textAlign: "center" }}
        onKeyDown={(e) => e.key === "Enter" && entrar()} />
      {error && <p style={{ color: "var(--color-rojo)", fontWeight: 600 }}>{error}</p>}
      <button className="btn btn-primario" style={{ width: "100%", minHeight: 58, marginTop: 20 }} disabled={ocupado} onClick={entrar}>
        {ocupado ? "Entrando…" : "Entrar →"}
      </button>
      <p style={{ fontSize: 15.5, color: "var(--color-ink-soft)", textAlign: "center", marginTop: 18 }}>
        ¿Primera vez? Entrá directo desde el link de invitación que te mandó tu líder por WhatsApp.
      </p>
    </div>
  );
}
