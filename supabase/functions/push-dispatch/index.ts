// COMUNIDAD KAMAX — push-dispatch
// Envía notificaciones Web Push (VAPID) a todos los dispositivos suscriptos.
// La llama el panel admin al publicar un aviso. Solo staff (admin/lider).
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    // Staff check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "No autorizado" }, 401);
    const { data: profile } = await admin.from("profiles").select("role, active").eq("id", user.id).maybeSingle();
    if (!profile?.active || !["admin", "lider"].includes(profile.role)) {
      return json({ error: "Solo el equipo líder puede mandar avisos" }, 403);
    }

    const { title, body, url } = await req.json();
    if (!title) return json({ error: "Falta el título" }, 400);

    // VAPID desde el Vault (JWK privada; la pública se deriva de x,y)
    const { data: privRaw } = await admin.rpc("get_secret", { p_name: "vapid_private_jwk" });
    if (!privRaw) return json({ error: "VAPID no configurada" }, 500);
    const priv = JSON.parse(privRaw);
    const pub = { kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, key_ops: ["verify"], ext: true };
    const privJwk = { ...priv, key_ops: ["sign"], ext: true };
    const vapidKeys = await webpush.importVapidKeys(
      { publicKey: pub, privateKey: privJwk },
      { extractable: false },
    );
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:admin@kamax.app",
      vapidKeys,
    });

    const { data: subs } = await admin.from("push_subscriptions").select("*");
    let sent = 0, failed = 0, removed = 0;
    const payload = JSON.stringify({
      title, body: body ?? "", url: url ?? "/",
      ts: Date.now(),
    });

    for (const sub of subs ?? []) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        });
        await subscriber.pushTextMessage(payload, {});
        sent++;
        await admin.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", sub.id);
      } catch (err) {
        failed++;
        const msg = String(err);
        if (msg.includes("404") || msg.includes("410")) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        }
      }
    }
    return json({ ok: true, sent, failed, removed });
  } catch (_e) {
    return json({ error: "No se pudieron mandar las notificaciones" }, 500);
  }
});
