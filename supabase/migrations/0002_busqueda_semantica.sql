-- =====================================================================
-- Agent Locally · Búsqueda semántica (Fase 5)
-- Ejecutar en Supabase: SQL Editor > New query > pegar > Run
-- Requiere 0001_esquema_inicial.sql. Es idempotente.
--
-- Las columnas `embedding` (vector de 384 dimensiones, modelo gte-small) ya
-- existen desde la Fase 1; aquí añadimos los índices y la función de búsqueda.
-- =====================================================================

-- Índices HNSW por similitud coseno: con 80 platos no hacen falta, pero son los
-- que permiten que la búsqueda siga siendo instantánea con miles de restaurantes.
create index if not exists restaurantes_embedding_idx
  on public.restaurantes using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists platos_embedding_idx
  on public.platos using hnsw (embedding extensions.vector_cosine_ops);

-- Busca los restaurantes cuyo SIGNIFICADO se parece más a la consulta.
-- Compara con la ficha del restaurante y con cada uno de sus platos, y se queda
-- con la mejor coincidencia (así "ramen" encuentra un japonés aunque su ficha
-- no lo diga). Devuelve también el plato que mejor encaja, para explicarlo.
create or replace function public.buscar_semantico(
  consulta extensions.vector(384),
  presupuesto_max int default 3,
  limite int default 12
)
returns table (restaurante_id uuid, similitud double precision, plato_coincidente text)
language sql
stable
set search_path = public, extensions
as $$
  with mejor_plato as (
    select distinct on (p.restaurante_id)
      p.restaurante_id, p.nombre, 1 - (p.embedding <=> consulta) as sim
    from platos p
    where p.embedding is not null
    order by p.restaurante_id, p.embedding <=> consulta
  )
  select
    r.id,
    greatest(coalesce(1 - (r.embedding <=> consulta), 0), coalesce(mp.sim, 0)) as similitud,
    case when coalesce(mp.sim, 0) > coalesce(1 - (r.embedding <=> consulta), 0) then mp.nombre end
  from restaurantes r
  left join mejor_plato mp on mp.restaurante_id = r.id
  where r.rango_precio <= presupuesto_max
    and (r.embedding is not null or mp.sim is not null)
  order by similitud desc
  limit limite;
$$;

-- Solo la usa el servidor (clave secreta), que calcula el embedding de la consulta.
revoke execute on function public.buscar_semantico(extensions.vector, int, int) from public, anon, authenticated;
