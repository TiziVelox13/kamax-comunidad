-- ============================================================
-- COMUNIDAD KAMAX — Schema fundacional v1 (v2-ready)
-- Decisión 15: DNI JAMÁS en la plataforma. Teléfono con revelado
-- logueado. Roles: admin / lider / creador / vendedor / observador.
-- ============================================================

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'vendedor'
    check (role in ('admin','lider','creador','vendedor','observador')),
  first_name text not null check (first_name !~ '[0-9]{7,}'),
  phone text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Helper: rol del usuario actual (security definer para usar en RLS)
create or replace function public.current_role_kamax()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.current_role_kamax() in ('admin','lider'), false) $$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where id = auth.uid() and active) $$;

alter table public.profiles enable row level security;
create policy "profiles_select_members" on public.profiles
  for select using (public.is_active_member());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role_kamax());
create policy "profiles_all_staff" on public.profiles
  for all using (public.current_role_kamax() = 'admin');

-- ---------- INVITES ----------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  first_name text not null check (first_name !~ '[0-9]{7,}'),
  phone text not null,
  role text not null default 'vendedor'
    check (role in ('lider','creador','vendedor','observador')),
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
create policy "invites_staff" on public.invites for all using (public.is_staff());

-- ---------- ANNOUNCEMENTS (avisos con acuse) ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  priority text not null default 'importante' check (priority in ('normal','importante')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "ann_select_members" on public.announcements for select using (public.is_active_member());
create policy "ann_write_staff" on public.announcements for insert with check (public.is_staff());
create policy "ann_update_staff" on public.announcements for update using (public.is_staff());

create table public.announcement_acks (
  announcement_id uuid references public.announcements(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  acked_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
alter table public.announcement_acks enable row level security;
create policy "acks_insert_own" on public.announcement_acks
  for insert with check (user_id = auth.uid());
create policy "acks_select_own_or_staff" on public.announcement_acks
  for select using (user_id = auth.uid() or public.is_staff());

-- ---------- ASSETS (placas y contenido) ----------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  campaign text,
  storage_path text not null,
  caption text not null default '' check (caption !~ '\$\s*[0-9]'), -- JAMÁS precio en captions
  media_type text not null default 'image' check (media_type in ('image','video')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.assets enable row level security;
create policy "assets_select_members" on public.assets
  for select using (public.is_active_member() and active);
create policy "assets_write_creators" on public.assets
  for insert with check (coalesce(public.current_role_kamax(),'') in ('admin','lider','creador'));
create policy "assets_update_creators" on public.assets
  for update using (coalesce(public.current_role_kamax(),'') in ('admin','lider','creador'));

create table public.asset_events (
  id bigint generated always as identity primary key,
  asset_id uuid references public.assets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('download','copy_caption','share')),
  created_at timestamptz not null default now()
);
alter table public.asset_events enable row level security;
create policy "aev_insert_own" on public.asset_events for insert with check (user_id = auth.uid());
create policy "aev_select_own_or_staff" on public.asset_events
  for select using (user_id = auth.uid() or public.is_staff());

-- ---------- CHAT ----------
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('general','dm')),
  name text,
  member_a uuid references public.profiles(id), -- dm: vendedor
  member_b uuid references public.profiles(id), -- dm: líder
  created_at timestamptz not null default now(),
  unique (kind, member_a, member_b)
);
alter table public.channels enable row level security;
create policy "ch_select" on public.channels for select using (
  public.is_active_member() and (kind = 'general' or member_a = auth.uid() or member_b = auth.uid() or public.is_staff())
);
create policy "ch_insert_dm" on public.channels for insert with check (
  kind = 'dm' and (member_a = auth.uid() or public.is_staff())
);

create table public.messages (
  id bigint generated always as identity primary key,
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text,
  image_path text,
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or image_path is not null)
);
create index messages_channel_idx on public.messages (channel_id, created_at desc);
alter table public.messages enable row level security;
create policy "msg_select" on public.messages for select using (
  exists (select 1 from public.channels c where c.id = channel_id
    and (c.kind = 'general' or c.member_a = auth.uid() or c.member_b = auth.uid() or public.is_staff()))
);
create policy "msg_insert" on public.messages for insert with check (
  user_id = auth.uid() and exists (select 1 from public.channels c where c.id = channel_id
    and (c.kind = 'general' or c.member_a = auth.uid() or c.member_b = auth.uid()))
);
create policy "msg_moderate_staff" on public.messages for update using (public.is_staff());

-- ---------- KB (guía de venta — fuente única) ----------
create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  section text not null check (section in ('producto','precio','objeciones','speech','proceso','no_decir')),
  title text not null,
  body_md text not null default '',
  copy_blocks jsonb not null default '[]'::jsonb, -- [{label, text}] bloques copiables
  sort int not null default 100,
  active boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
alter table public.kb_articles enable row level security;
create policy "kb_select_members" on public.kb_articles for select using (public.is_active_member() and active);
create policy "kb_write_staff" on public.kb_articles for all using (public.is_staff());

-- ---------- CLIENTS (cuaderno v1 / mesa v2) ----------
-- Decisión 15: DNI jamás (checks anti-dígitos largos). Teléfono nullable,
-- revelado por asignación con log. source distingue cartera propia vs pauta central.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id), -- null = lead central sin asignar (mesa v2)
  source text not null default 'vendedor' check (source in ('vendedor','maxi')),
  first_name text not null check (first_name !~ '[0-9]{7,}'),
  zona text check (coalesce(zona,'') !~ '[0-9]{7,}'),
  medio_pago text check (medio_pago in ('contado','tarjeta','financiado','consulta') or medio_pago is null),
  stage text not null default 'hablando'
    check (stage in ('hablando','pidio_precio','paso_dni','en_validacion','venta','perdido')),
  phone text,
  phone_revealed_at timestamptz,
  assigned_at timestamptz,
  notes text check (coalesce(notes,'') !~ '[0-9]{7,}'), -- anti-DNI
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_owner_idx on public.clients (owner_id, stage);
alter table public.clients enable row level security;
create policy "cl_own" on public.clients for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and coalesce(notes,'') !~ '[0-9]{7,}');
create policy "cl_staff_read" on public.clients for select using (public.is_staff());

create table public.client_events (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references public.profiles(id),
  kind text not null check (kind in ('created','stage_change','assigned','phone_revealed','note')),
  from_stage text, to_stage text,
  created_at timestamptz not null default now()
);
alter table public.client_events enable row level security;
create policy "cev_insert_own" on public.client_events for insert with check (user_id = auth.uid());
create policy "cev_select" on public.client_events for select using (
  user_id = auth.uid() or public.is_staff()
  or exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid())
);

-- Mesa v2: vista ENMASCARADA (sin teléfono) de leads centrales sin dueño
create or replace view public.mesa_view with (security_invoker = off) as
  select id, first_name, zona, medio_pago, stage, source, created_at
  from public.clients
  where source = 'maxi' and owner_id is null and stage not in ('venta','perdido');

-- Mesa v2: auto-asignación con revelado + log (RPC atómica)
create or replace function public.claim_client(p_client_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_client public.clients; v_flags jsonb;
begin
  select value into v_flags from public.app_settings where key = 'feature_flags';
  if coalesce((v_flags->>'mesa_enabled')::boolean, false) is distinct from true then
    raise exception 'La mesa no está habilitada todavía';
  end if;
  if not public.is_active_member() then raise exception 'No autorizado'; end if;
  update public.clients
    set owner_id = auth.uid(), assigned_at = now(), phone_revealed_at = now(), updated_at = now()
    where id = p_client_id and owner_id is null and source = 'maxi'
    returning * into v_client;
  if v_client.id is null then raise exception 'Ese cliente ya fue tomado por otro vendedor'; end if;
  insert into public.client_events (client_id, user_id, kind)
    values (p_client_id, auth.uid(), 'assigned'), (p_client_id, auth.uid(), 'phone_revealed');
  return json_build_object('id', v_client.id, 'first_name', v_client.first_name, 'phone', v_client.phone);
end $$;

-- ---------- ASISTENTE ----------
create table public.assistant_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  body text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index am_user_idx on public.assistant_messages (user_id, created_at desc);
alter table public.assistant_messages enable row level security;
create policy "am_own" on public.assistant_messages for select using (user_id = auth.uid() or public.is_staff());
create policy "am_insert_own" on public.assistant_messages for insert with check (user_id = auth.uid() and role = 'user');

create table public.assistant_quota (
  user_id uuid references public.profiles(id) on delete cascade,
  day date not null default current_date,
  used int not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_quota enable row level security;
create policy "aq_own" on public.assistant_quota for select using (user_id = auth.uid() or public.is_staff());

-- ---------- PUSH ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
alter table public.push_subscriptions enable row level security;
create policy "ps_own" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ps_staff_read" on public.push_subscriptions for select using (public.is_staff());

-- ---------- ACTIVIDAD (racha) ----------
create table public.daily_activity (
  user_id uuid references public.profiles(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);
alter table public.daily_activity enable row level security;
create policy "da_own" on public.daily_activity for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "da_staff_read" on public.daily_activity for select using (public.is_staff());

-- ---------- SETTINGS / FEATURE FLAGS ----------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "st_select_members" on public.app_settings for select using (public.is_active_member());
create policy "st_write_admin" on public.app_settings for all using (public.current_role_kamax() = 'admin');

insert into public.app_settings (key, value) values
  ('feature_flags', '{"mesa_enabled": false, "warroom_enabled": false, "assistant_live": false}'),
  ('assistant', '{"daily_limit": 30}'),
  ('team', '{"whatsapp_grupo": "", "lider_nombre": "Ayelen"}');

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('placas', 'placas', true);
insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', false);

create policy "placas_read_all" on storage.objects for select using (bucket_id = 'placas');
create policy "placas_write_creators" on storage.objects for insert
  with check (bucket_id = 'placas' and coalesce(public.current_role_kamax(),'') in ('admin','lider','creador'));
create policy "placas_delete_creators" on storage.objects for delete
  using (bucket_id = 'placas' and coalesce(public.current_role_kamax(),'') in ('admin','lider','creador'));
create policy "chatimg_read_members" on storage.objects for select
  using (bucket_id = 'chat-images' and public.is_active_member());
create policy "chatimg_write_members" on storage.objects for insert
  with check (bucket_id = 'chat-images' and public.is_active_member());

-- ---------- REALTIME ----------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.announcements;

-- ---------- CANAL GENERAL SEED ----------
insert into public.channels (kind, name) values ('general', 'Chat del equipo');
