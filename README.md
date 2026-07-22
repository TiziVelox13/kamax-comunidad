# Comunidad KAMAX 🏍️

La plataforma del equipo de vendedores freelance de la KAMAX AL125.
PWA mobile-first con estética **EL CUADERNO** — la libreta del vendedor pasada en limpio.

**WhatsApp Kamax: 351 737-3636** · Landing: kamax-al125.vercel.app

## Stack

- **Front:** React 18 + Vite + Tailwind v4 (tokens OKLCH propios en `src/styles.css`) — SPA/PWA, sin backend propio.
- **Backend:** Supabase `kamax-community` (proyecto aislado): Postgres + RLS, Auth, Realtime (chat), Storage (placas / imágenes de chat), Edge Functions, Vault.
- **Asistente IA:** Edge Function `assistant` → webhook n8n (workflow hermano de Maxi) con fallback a la Guía. Se activa con el feature flag `assistant_live`.
- **Push:** Web Push (VAPID) vía Edge Function `push-dispatch`. En iOS requiere PWA instalada.

## Diseño

Doctrina [impeccable](https://impeccable.style) v3.9.1, register **product**.
Ver `PRODUCT.md` (brief) y `DESIGN.md` (tokens y patrones — importable en Claude Design).

## Estructura

```
src/
  lib/         supabase, auth (roles), push, format
  components/  ui (ledger, sello, sheet, toast), TabBar
  screens/     Invite · Login · Home · Placas · Chat(+Room) · Guia · Asistente · Clientes
  screens/admin/  AdminHome · Avisos(acuses+push+recordatorios WA) · Vendedores(invites WA) · Placas(upload) · KB
supabase/
  migrations/  0001_init (schema+RLS+storage+realtime) · 0002 (vault RPC + bootstrap)
  functions/   redeem-invite · assistant · lead-intake · push-dispatch
```

## Roles

admin (Tiziano) · líder (Ayelen) · creador (Richie) · vendedor · observador (Ale, lectura).

## Reglas grabadas en la base

- **DNI jamás** en la plataforma (checks `!~ '[0-9]{7,}'` en clients/invites/profiles).
- **Precio jamás** en captions de placas (check `!~ '\$\s*[0-9]'`).
- Teléfono de leads centrales **enmascarado** hasta auto-asignación con log (`mesa_view` + RPC `claim_client`, decisión 15).
- Mesa y Warroom detrás de feature flags (`app_settings.feature_flags`).

## Contratos para el Track 1 (n8n)

- **Asistente** (n8n recibe): `POST { seller_id, seller_name, message, history[6], kb_version }` → `{ reply, sources[] }`. URL se configura en `app_settings.assistant.webhook_url` + flag `assistant_live`.
- **Lead intake** (n8n envía): `POST /functions/v1/lead-intake` con header `x-kamax-key` (Vault: `lead_intake_key`) y body `{ phone, first_name, zona?, medio_pago?, stage?, source: 'maxi' }`.

## Deploy

Vercel (framework: Vite). Variables en `.env` (públicas por diseño — anon key + VAPID pública).
SPA fallback: `vercel.json` reescribe todo a `index.html`.

## Dev

```bash
npm install
npm run dev
```
