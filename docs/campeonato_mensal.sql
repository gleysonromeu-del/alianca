-- =====================================================================
-- Módulo Campeonato Mensal — Aliança do Campo Grande
-- Execute este SQL no SQL Editor do Supabase (uma única vez)
-- =====================================================================

do $$ begin
  create type public.campeonato_status as enum ('aberto', 'encerrado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.partida_status as enum ('agendada', 'finalizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.historico_tipo as enum ('campeao', 'pagador_cerveja');
exception when duplicate_object then null; end $$;

create table if not exists public.campeonato_mensal (
  id uuid primary key default gen_random_uuid(),
  mes date not null unique,
  nome text,
  status public.campeonato_status not null default 'aberto',
  campeao_time_id uuid,
  pagador_cerveja_time_id uuid,
  created_at timestamptz not null default now()
);

-- Garante a coluna 'nome' em bases existentes (idempotente)
alter table public.campeonato_mensal add column if not exists nome text;


create table if not exists public.times (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato_mensal(id) on delete cascade,
  nome text not null,
  escudo_url text,
  cor text default '#FFD166',
  capitao_id uuid references public.jogadores(id) on delete set null,
  pontos int not null default 0,
  vitorias int not null default 0,
  empates int not null default 0,
  derrotas int not null default 0,
  gols_pro int not null default 0,
  gols_contra int not null default 0,
  permanece boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists times_campeonato_idx on public.times(campeonato_id);

create table if not exists public.time_jogadores (
  id uuid primary key default gen_random_uuid(),
  time_id uuid not null references public.times(id) on delete cascade,
  jogador_id uuid not null references public.jogadores(id) on delete cascade,
  campeonato_id uuid not null references public.campeonato_mensal(id) on delete cascade,
  unique (campeonato_id, jogador_id)
);
create index if not exists time_jogadores_time_idx on public.time_jogadores(time_id);

create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato_mensal(id) on delete cascade,
  time_a_id uuid not null references public.times(id) on delete cascade,
  time_b_id uuid not null references public.times(id) on delete cascade,
  data timestamptz,
  gols_a int not null default 0,
  gols_b int not null default 0,
  status public.partida_status not null default 'agendada',
  observacoes text,
  created_at timestamptz not null default now(),
  check (time_a_id <> time_b_id)
);
create index if not exists partidas_campeonato_idx on public.partidas(campeonato_id);

create table if not exists public.estatisticas_partida (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas(id) on delete cascade,
  jogador_id uuid not null references public.jogadores(id) on delete cascade,
  time_id uuid not null references public.times(id) on delete cascade,
  gols int not null default 0,
  assistencias int not null default 0,
  amarelos int not null default 0,
  vermelhos int not null default 0,
  presente boolean not null default true,
  unique (partida_id, jogador_id)
);

create table if not exists public.sumulas (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null unique references public.partidas(id) on delete cascade,
  observacoes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.historico_campeoes (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato_mensal(id) on delete cascade,
  time_id uuid,
  mes date not null,
  tipo public.historico_tipo not null,
  nome_time_snapshot text,
  jogadores_snapshot jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.recalcular_classificacao_campeonato(_camp_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.times t set
    pontos = 0, vitorias = 0, empates = 0, derrotas = 0,
    gols_pro = 0, gols_contra = 0
  where t.campeonato_id = _camp_id;

  with agg as (
    select time_id,
      sum(case when resultado = 'V' then 3 when resultado = 'E' then 1 else 0 end)::int as pts,
      sum(case when resultado = 'V' then 1 else 0 end)::int as v,
      sum(case when resultado = 'E' then 1 else 0 end)::int as e,
      sum(case when resultado = 'D' then 1 else 0 end)::int as d,
      sum(gp)::int as gp_total, sum(gc)::int as gc_total
    from (
      select time_a_id as time_id, gols_a as gp, gols_b as gc,
        case when gols_a > gols_b then 'V' when gols_a = gols_b then 'E' else 'D' end as resultado
      from public.partidas where campeonato_id = _camp_id and status = 'finalizada'
      union all
      select time_b_id as time_id, gols_b as gp, gols_a as gc,
        case when gols_b > gols_a then 'V' when gols_a = gols_b then 'E' else 'D' end as resultado
      from public.partidas where campeonato_id = _camp_id and status = 'finalizada'
    ) s group by time_id
  )
  update public.times t set
    pontos = agg.pts, vitorias = agg.v, empates = agg.e, derrotas = agg.d,
    gols_pro = agg.gp_total, gols_contra = agg.gc_total
  from agg where t.id = agg.time_id;
end $$;

create or replace function public.trg_partidas_recalc()
returns trigger language plpgsql as $$
begin
  perform public.recalcular_classificacao_campeonato(coalesce(new.campeonato_id, old.campeonato_id));
  return coalesce(new, old);
end $$;

drop trigger if exists partidas_recalc on public.partidas;
create trigger partidas_recalc
after insert or update or delete on public.partidas
for each row execute function public.trg_partidas_recalc();

create or replace function public.encerrar_campeonato(_camp_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _campeao_id uuid; _pagador_id uuid; _mes date; _novo_mes date; _novo_camp_id uuid;
  _novo_time_id uuid; _campeao_nome text; _campeao_escudo text; _campeao_cor text; _campeao_capitao uuid;
begin
  select mes into _mes from public.campeonato_mensal where id = _camp_id;

  select id into _campeao_id from public.times where campeonato_id = _camp_id
    order by pontos desc, (gols_pro - gols_contra) desc, gols_pro desc limit 1;
  select id into _pagador_id from public.times where campeonato_id = _camp_id
    order by pontos asc, (gols_pro - gols_contra) asc, gols_pro asc limit 1;

  update public.campeonato_mensal
    set status = 'encerrado', campeao_time_id = _campeao_id, pagador_cerveja_time_id = _pagador_id
    where id = _camp_id;

  insert into public.historico_campeoes (campeonato_id, time_id, mes, tipo, nome_time_snapshot, jogadores_snapshot)
  select _camp_id, t.id, _mes, 'campeao'::public.historico_tipo, t.nome,
    (select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'apelido', j.apelido, 'nome', j.nome_completo)), '[]'::jsonb)
     from public.time_jogadores tj join public.jogadores j on j.id = tj.jogador_id where tj.time_id = t.id)
  from public.times t where t.id = _campeao_id;

  insert into public.historico_campeoes (campeonato_id, time_id, mes, tipo, nome_time_snapshot, jogadores_snapshot)
  select _camp_id, t.id, _mes, 'pagador_cerveja'::public.historico_tipo, t.nome, '[]'::jsonb
  from public.times t where t.id = _pagador_id;

  _novo_mes := (date_trunc('month', _mes) + interval '1 month')::date;
  insert into public.campeonato_mensal (mes, status) values (_novo_mes, 'aberto')
    on conflict (mes) do update set status = 'aberto' returning id into _novo_camp_id;

  if _campeao_id is not null then
    select nome, escudo_url, cor, capitao_id into _campeao_nome, _campeao_escudo, _campeao_cor, _campeao_capitao
      from public.times where id = _campeao_id;
    insert into public.times (campeonato_id, nome, escudo_url, cor, capitao_id, permanece)
      values (_novo_camp_id, _campeao_nome, _campeao_escudo, _campeao_cor, _campeao_capitao, true)
      returning id into _novo_time_id;
    insert into public.time_jogadores (time_id, jogador_id, campeonato_id)
      select _novo_time_id, tj.jogador_id, _novo_camp_id
      from public.time_jogadores tj where tj.time_id = _campeao_id
      on conflict do nothing;
  end if;

  return _novo_camp_id;
end $$;

-- Storage bucket
insert into storage.buckets (id, name, public) values ('escudos', 'escudos', true)
  on conflict (id) do nothing;

do $$ begin create policy "escudos read" on storage.objects for select using (bucket_id = 'escudos');
exception when duplicate_object then null; end $$;
do $$ begin create policy "escudos write" on storage.objects for insert
  with check (bucket_id = 'escudos' and public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin create policy "escudos upd" on storage.objects for update
  using (bucket_id = 'escudos' and public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin create policy "escudos del" on storage.objects for delete
  using (bucket_id = 'escudos' and public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- RLS
alter table public.campeonato_mensal enable row level security;
alter table public.times enable row level security;
alter table public.time_jogadores enable row level security;
alter table public.partidas enable row level security;
alter table public.estatisticas_partida enable row level security;
alter table public.sumulas enable row level security;
alter table public.historico_campeoes enable row level security;

do $$ declare t text; begin
  foreach t in array array['campeonato_mensal','times','time_jogadores','partidas','estatisticas_partida','sumulas','historico_campeoes']
  loop
    execute format('drop policy if exists "%1$s_sel" on public.%1$I', t);
    execute format('create policy "%1$s_sel" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "%1$s_ai" on public.%1$I', t);
    execute format('create policy "%1$s_ai" on public.%1$I for insert with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('drop policy if exists "%1$s_au" on public.%1$I', t);
    execute format('create policy "%1$s_au" on public.%1$I for update using (public.has_role(auth.uid(), ''admin''))', t);
    execute format('drop policy if exists "%1$s_ad" on public.%1$I', t);
    execute format('create policy "%1$s_ad" on public.%1$I for delete using (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.times, public.partidas, public.time_jogadores, public.campeonato_mensal, public.estatisticas_partida;
exception when duplicate_object then null; when others then null; end $$;

-- =====================================================================
-- Ranking anual acumulado (artilharia + assistências)
-- Soma todas as estatísticas de partidas FINALIZADAS dos campeonatos
-- do ano informado (janeiro a dezembro).
-- =====================================================================
create or replace function public.ranking_anual(_ano int)
returns table (
  jogador_id uuid,
  apelido text,
  nome_completo text,
  foto_url text,
  gols bigint,
  assistencias bigint,
  amarelos bigint,
  vermelhos bigint,
  jogos bigint
) language sql stable security definer set search_path = public as $$
  select
    j.id as jogador_id,
    j.apelido,
    j.nome_completo,
    j.foto_url,
    coalesce(sum(ep.gols), 0)::bigint as gols,
    coalesce(sum(ep.assistencias), 0)::bigint as assistencias,
    coalesce(sum(ep.amarelos), 0)::bigint as amarelos,
    coalesce(sum(ep.vermelhos), 0)::bigint as vermelhos,
    count(distinct case when ep.presente then ep.partida_id end)::bigint as jogos
  from public.jogadores j
  join public.estatisticas_partida ep on ep.jogador_id = j.id
  join public.partidas p on p.id = ep.partida_id and p.status = 'finalizada'
  join public.campeonato_mensal c on c.id = p.campeonato_id
  where extract(year from c.mes) = _ano
  group by j.id, j.apelido, j.nome_completo, j.foto_url
  having coalesce(sum(ep.gols), 0) + coalesce(sum(ep.assistencias), 0) > 0
  order by gols desc, assistencias desc, j.apelido asc;
$$;

grant execute on function public.ranking_anual(int) to anon, authenticated;
