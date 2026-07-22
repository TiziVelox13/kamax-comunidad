// COMUNIDAD KAMAX — assistant (proxy del asistente IA)
// Valida JWT → quota diaria → intenta el workflow n8n (Maxi coach) →
// fallback: responde con secciones relevantes de la Guía (kb_articles).
// Contrato n8n: POST { seller_id, seller_name, message, history[6], kb_version } → { reply, sources[] }
import { createClient } from "npm:@supabase/supabase-js@2";

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
    // 1) Usuario del JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sesión vencida. Entrá de nuevo." }, 401);

    const { data: profile } = await admin.from("profiles")
      .select("id, first_name, active").eq("id", user.id).maybeSingle();
    if (!profile?.active) return json({ error: "Tu cuenta no está activa." }, 403);

    const { message } = await req.json();
    if (!message || String(message).trim().length === 0) return json({ error: "Escribí tu pregunta" }, 400);
    const text = String(message).trim().slice(0, 2000);

    // 2) Quota diaria
    const { data: settingsRows } = await admin.from("app_settings").select("key, value")
      .in("key", ["assistant", "feature_flags"]);
    const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));
    const limit = Number(settings.assistant?.daily_limit ?? 30);
    const today = new Date().toISOString().slice(0, 10);
    const { data: quota } = await admin.from("assistant_quota")
      .select("used").eq("user_id", user.id).eq("day", today).maybeSingle();
    const used = quota?.used ?? 0;
    if (used >= limit) {
      return json({
        reply: "Uy, llegaste al límite de preguntas de hoy 😅. Mañana arrancamos de nuevo. Mientras tanto tenés toda la Guía de venta a mano.",
        sources: [], limited: true,
      });
    }
    await admin.from("assistant_quota").upsert({ user_id: user.id, day: today, used: used + 1 });

    // 3) Guardar pregunta
    await admin.from("assistant_messages").insert({ user_id: user.id, role: "user", body: text });

    // 4) Historial (últimos 6 turnos)
    const { data: histRows } = await admin.from("assistant_messages")
      .select("role, body").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(7);
    const history = (histRows ?? []).slice(1).reverse().map((m) => ({ role: m.role, content: m.body }));

    // 5) n8n (Maxi coach) si está vivo
    let reply = "";
    let sources: Array<{ slug: string; title: string }> = [];
    const live = settings.feature_flags?.assistant_live === true;
    const webhookUrl = settings.assistant?.webhook_url;
    if (live && webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seller_id: user.id, seller_name: profile.first_name,
            message: text, history, kb_version: "v1",
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok) {
          const data = await res.json();
          reply = String(data.reply ?? "").trim();
          sources = Array.isArray(data.sources) ? data.sources : [];
        }
      } catch (_e) { /* cae al fallback */ }
    }

    // 6) Fallback: búsqueda en la Guía
    if (!reply) {
      const words = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3).slice(0, 6);
      let hits: Array<{ slug: string; title: string }> = [];
      if (words.length > 0) {
        const ors = words.map((w) => `title.ilike.%${w}%,body_md.ilike.%${w}%`).join(",");
        const { data: kb } = await admin.from("kb_articles")
          .select("slug, title").eq("active", true).or(ors).limit(3);
        hits = kb ?? [];
      }
      if (hits.length === 0) {
        const { data: kb } = await admin.from("kb_articles")
          .select("slug, title").eq("active", true).order("sort").limit(3);
        hits = kb ?? [];
      }
      sources = hits;
      reply = hits.length > 0
        ? "Todavía me están terminando de entrenar 🔧, pero esto de la Guía te va a servir 👇 Tocá cualquiera para abrirlo. Y si no te alcanza, mandale al chat con " +
          (settings.team?.lider_nombre ?? "tu líder") + "."
        : "Todavía me están terminando de entrenar 🔧. Mirá la Guía de venta o preguntale a tu líder por el chat.";
    }

    // 7) Guardar respuesta
    await admin.from("assistant_messages").insert({ user_id: user.id, role: "assistant", body: reply, sources });
    return json({ reply, sources });
  } catch (_e) {
    return json({ error: "Algo salió mal. Probá de nuevo." }, 500);
  }
});
