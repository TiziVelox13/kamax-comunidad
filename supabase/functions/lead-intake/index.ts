// COMUNIDAD KAMAX — lead-intake (contrato con el Track 1 / Maxi en n8n)
// Recibe leads de la pauta central y los crea ENMASCARADOS para la mesa v2.
// Auth: header x-kamax-key contra el Vault (lead_intake_key). verify_jwt = false.
// Contrato: POST { phone, first_name, zona?, medio_pago?, stage?, source: 'maxi' }
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const STAGES = ["hablando", "pidio_precio", "paso_dni", "en_validacion"];
const MEDIOS = ["contado", "tarjeta", "financiado", "consulta"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const key = req.headers.get("x-kamax-key");
    const { data: expected } = await admin.rpc("get_secret", { p_name: "lead_intake_key" });
    if (!key || !expected || key !== expected) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const firstName = String(body.first_name ?? "").trim().slice(0, 60);
    const phone = String(body.phone ?? "").replace(/[^\d+]/g, "");
    if (!firstName || /[0-9]{7,}/.test(firstName)) return json({ error: "invalid_first_name" }, 400);
    if (phone.replace(/\D/g, "").length < 8) return json({ error: "invalid_phone" }, 400);

    const stage = STAGES.includes(body.stage) ? body.stage : "hablando";
    const medio = MEDIOS.includes(body.medio_pago) ? body.medio_pago : null;
    const zona = body.zona ? String(body.zona).slice(0, 80) : null;
    if (zona && /[0-9]{7,}/.test(zona)) return json({ error: "invalid_zona" }, 400);

    // Dedup por teléfono en leads centrales abiertos
    const { data: existing } = await admin.from("clients").select("id")
      .eq("source", "maxi").eq("phone", phone)
      .not("stage", "in", "(venta,perdido)").maybeSingle();
    if (existing) return json({ ok: true, id: existing.id, dedup: true });

    const { data: created, error } = await admin.from("clients").insert({
      source: "maxi", owner_id: null,
      first_name: firstName, phone, zona, medio_pago: medio, stage,
    }).select("id").single();
    if (error) return json({ error: "insert_failed" }, 500);

    return json({ ok: true, id: created.id });
  } catch (_e) {
    return json({ error: "bad_request" }, 400);
  }
});
