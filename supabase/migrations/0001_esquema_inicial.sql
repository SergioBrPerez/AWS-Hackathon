-- =====================================================================
-- Agent Locally · Esquema inicial (Fase 1)
-- Ejecutar en Supabase: SQL Editor > New query > pegar > Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- pgvector para la búsqueda semántica (RAG). Los embeddings (gte-small,
-- 384 dimensiones) los calcula `npm run embeddings` (ver 0002_busqueda_semantica.sql).
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------
-- 1. restaurantes
-- ---------------------------------------------------------------------
create table if not exists public.restaurantes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  tipo_cocina   text not null,
  rango_precio  smallint not null check (rango_precio between 1 and 3), -- 1=€ 2=€€ 3=€€€
  direccion     text not null,
  latitud       double precision not null,
  longitud      double precision not null,
  descripcion   text,
  patrocinado   boolean not null default false,  -- modelo de negocio: posicionamiento pagado
  embedding     extensions.vector(384),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. platos
-- ---------------------------------------------------------------------
-- alergenos_declarados usa estos códigos (14 alérgenos UE):
--   gluten, crustaceos, huevo, pescado, cacahuete, soja, lacteos,
--   frutos_secos, apio, mostaza, sesamo, sulfitos, altramuces, moluscos
-- ingredientes puede venir vacío: el agente deberá INFERIR los
-- ingredientes probables a partir del nombre y la descripción.
create table if not exists public.platos (
  id                    uuid primary key default gen_random_uuid(),
  restaurante_id        uuid not null references public.restaurantes(id) on delete cascade,
  nombre                text not null,
  categoria             text not null check (categoria in ('Entrante', 'Principal', 'Postre', 'Bebida')),
  descripcion           text,
  precio                numeric(6,2),
  ingredientes          text[] not null default '{}',
  alergenos_declarados  text[] not null default '{}',
  permite_modificacion  boolean not null default false,
  nota_cocina           text,
  embedding             extensions.vector(384),
  created_at            timestamptz not null default now()
);

create index if not exists platos_restaurante_idx on public.platos (restaurante_id);

-- ---------------------------------------------------------------------
-- 3. historial_elecciones (memoria colectiva / aprendizaje)
-- ---------------------------------------------------------------------
-- firma_perfil: restricciones del grupo normalizadas, ordenadas y unidas
-- con '+', p.ej. 'embarazo+sin_gluten+vegetariano'.
create table if not exists public.historial_elecciones (
  id                    uuid primary key default gen_random_uuid(),
  firma_perfil          text not null,
  restaurante_id        uuid not null references public.restaurantes(id) on delete cascade,
  contador_selecciones  integer not null default 0,
  platos_validados      uuid[] not null default '{}',
  updated_at            timestamptz not null default now(),
  unique (firma_perfil, restaurante_id)
);

-- Registro atómico de una elección (tool registrar_feedback_eleccion).
-- Suma 1 al contador y añade los platos validados sin duplicados.
create or replace function public.registrar_eleccion(
  p_firma_perfil text,
  p_restaurante_id uuid,
  p_platos uuid[] default '{}'
) returns public.historial_elecciones
language sql
as $$
  insert into public.historial_elecciones as h
    (firma_perfil, restaurante_id, contador_selecciones, platos_validados)
  values (p_firma_perfil, p_restaurante_id, 1, coalesce(p_platos, '{}'))
  on conflict (firma_perfil, restaurante_id) do update set
    contador_selecciones = h.contador_selecciones + 1,
    platos_validados = (
      select coalesce(array_agg(distinct x), '{}')
      from unnest(h.platos_validados || coalesce(p_platos, '{}')) as x
    ),
    updated_at = now()
  returning *;
$$;

-- ---------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------
-- Lectura pública (clave publishable). Las escrituras solo se hacen desde
-- las API routes con la clave secreta, que ignora RLS.
alter table public.restaurantes          enable row level security;
alter table public.platos                enable row level security;
alter table public.historial_elecciones  enable row level security;

drop policy if exists "lectura publica" on public.restaurantes;
create policy "lectura publica" on public.restaurantes for select using (true);

drop policy if exists "lectura publica" on public.platos;
create policy "lectura publica" on public.platos for select using (true);

drop policy if exists "lectura publica" on public.historial_elecciones;
create policy "lectura publica" on public.historial_elecciones for select using (true);

revoke execute on function public.registrar_eleccion(text, uuid, uuid[]) from public, anon, authenticated;
