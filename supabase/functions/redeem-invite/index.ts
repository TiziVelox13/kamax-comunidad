// COMUNIDAD KAMAX — redeem-invite
// GET  ?token=X  → preview { first_name } (para el "¡Hola, Carlos!")
// POST {token, pin} → crea usuario+perfil, o si el teléfono YA tiene cuenta,
//                     RESETEA el PIN (así "Reenviar acceso" = invitación nueva).
// verify_jwt = false (pre-auth): la autenticación ES el token de invitación.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const getInvite = async (token: string) => {
  const { data } = await admin
    .from("invites").select("*")
    .eq("token", token).is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ---- GET: preview del nombre ----
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const invite = await getInvite(token);
    if (!invite) return json({ error: "invalid" }, 404);
    return json({ first_name: invite.first_name });
  }

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const { token, pin } = await req.json();
    if (!token || typeof token !== "string") return json({ error: "Falta el código de invitación" }, 400);
    if (!/^\d{4,6}$/.test(String(pin ?? ""))) {
      return json({ error: "El PIN tiene que ser de 4 a 6 números" }, 400);
    }

    const invite = await getInvite(token);
    if (!invite) return json({ error: "Esta invitación no es válida o ya venció. Pedile una nueva a tu líder." }, 400);

    const phoneDigits = String(invite.phone).replace(/\D/g, "");
    const email = `${phoneDigits}@vendedores.kamax.app`;

    // ¿Ya existe la cuenta de este teléfono? → reset de PIN (reenviar acceso)
    const { data: existingProfile } = await admin
      .from("profiles").select("id").eq("phone", invite.phone).maybeSingle();

    if (existingProfile) {
      const { error: updErr } = await admin.auth.admin.updateUserById(existingProfile.id, { password: String(pin) });
      if (updErr) return json({ error: "No pudimos actualizar tu PIN. Probá de nuevo." }, 500);
      await admin.from("profiles").update({ active: true }).eq("id", existingProfile.id);
      await admin.from("invites")
        .update({ used_by: existingProfile.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);
      return json({ ok: true, email, first_name: invite.first_name, reset: true });
    }

    // Cuenta nueva
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: String(pin),
      email_confirm: true,
      user_metadata: { first_name: invite.first_name },
    });
    if (createErr) return json({ error: "No pudimos crear tu cuenta. Probá de nuevo." }, 500);

    const { error: profErr } = await admin.from("profiles").insert({
      id: created.user.id,
      role: invite.role,
      first_name: invite.first_name,
      phone: invite.phone,
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "No pudimos crear tu perfil. Probá de nuevo." }, 500);
    }

    await admin.from("invites")
      .update({ used_by: created.user.id, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Canal 1:1 con la líder
    if (invite.role !== "lider") {
      const { data: lider } = await admin
        .from("profiles").select("id")
        .eq("role", "lider").eq("active", true)
        .limit(1).maybeSingle();
      if (lider) {
        await admin.from("channels").insert({ kind: "dm", member_a: created.user.id, member_b: lider.id });
      }
    }

    return json({ ok: true, email, first_name: invite.first_name });
  } catch (_e) {
    return json({ error: "Algo salió mal. Probá de nuevo en un ratito." }, 500);
  }
});
