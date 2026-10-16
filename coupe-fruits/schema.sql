-- Coupe-Fruits : à exécuter une fois dans Supabase (SQL Editor > New query > Run).
-- Une seule table de documents, comme la base du jeu dans claude.ai :
--   scores/<id>              meilleurs scores du mois (classement, visible par tous)
--   feed/<id>                12 derniers événements du joueur (fil d'actu, visible par tous)
--   clans/<id du chef>       clan créé par ce joueur (visible par tous)
--   data/users/<id>/save     sauvegarde complète (visible par son propriétaire seulement)

create table if not exists public.docs (
  path        text primary key,
  collection  text not null,
  owner       uuid not null default auth.uid(),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  constraint docs_taille check (pg_column_size(data) < 200000)
);
create index if not exists docs_collection on public.docs (collection);

alter table public.docs enable row level security;

-- Classement et fil d'actu : lisibles par tout le monde, même sans compte.
create policy "lecture publique" on public.docs for select
  using (collection in ('scores', 'feed', 'clans'));

-- Sa propre sauvegarde : lisible par son propriétaire.
create policy "lecture de ses documents" on public.docs for select
  using (owner = auth.uid());

-- Chacun n'écrit que ses trois documents à lui.
create policy "écriture de ses documents" on public.docs for insert
  with check (owner = auth.uid() and path in ('scores/' || auth.uid(), 'feed/' || auth.uid(), 'clans/' || auth.uid(), 'data/users/' || auth.uid() || '/save'));
create policy "mise à jour de ses documents" on public.docs for update
  using (owner = auth.uid())
  with check (owner = auth.uid() and path in ('scores/' || auth.uid(), 'feed/' || auth.uid(), 'clans/' || auth.uid(), 'data/users/' || auth.uid() || '/save'));

-- Mises à jour en direct du classement.
alter publication supabase_realtime add table public.docs;

-- Anti-triche côté serveur. Le jeu vérifie déjà chaque partie, mais un tricheur peut écrire directement dans la base :
-- on refuse les scores impossibles (au-delà de 150 000) et ceux qui montent plus vite que le jeu ne le permet (400 points par seconde).
-- shortcut: limites globales, pas un rejeu de la partie ; la première écriture d'un compte n'a que le plafond. À durcir si la triche apparaît.
create or replace function public.verifier_score() returns trigger language plpgsql as $$
declare
  ecart  numeric := 0;   -- secondes depuis la dernière écriture de ce document
  plus   numeric := 0;   -- le plus gros score qui progresse dans cette écriture
  k text; v jsonb; n numeric; ancien numeric;
begin
  new.updated_at := now();  -- l'heure vient du serveur, jamais du joueur
  if new.collection <> 'scores' then return new; end if;
  if tg_op = 'UPDATE' then ecart := extract(epoch from now() - old.updated_at); end if;
  if length(coalesce(new.data->>'name', '')) > 24 then raise exception 'pseudo trop long'; end if;
  for k, v in select key, value from jsonb_each(case when jsonb_typeof(new.data->'best') = 'object' then new.data->'best' else '{}' end)
              union all select 'rec.' || key, value from jsonb_each(case when jsonb_typeof(new.data->'rec') = 'object' then new.data->'rec' else '{}' end)
              union all select 'jour', new.data->'day'->'s' where jsonb_typeof(new.data->'day') = 'object' loop
    if jsonb_typeof(v) <> 'number' then raise exception 'score invalide'; end if;
    n := v::text::numeric;
    if n < 0 or n > 150000 then raise exception 'score impossible'; end if;
    ancien := case when tg_op <> 'UPDATE' then 0
                   when k = 'jour' then case when old.data->'day'->>'d' = new.data->'day'->>'d' then coalesce((old.data->'day'->>'s')::numeric, 0) else 0 end
                   when k like 'rec.%' then coalesce((old.data->'rec'->>substr(k, 5))::numeric, 0)
                   else coalesce((old.data->'best'->>k)::numeric, 0) end;
    if n > ancien then plus := greatest(plus, n); end if;
  end loop;
  if tg_op = 'UPDATE' and plus > 400 * ecart + 1000 then raise exception 'score trop rapide'; end if;
  return new;
end $$;
drop trigger if exists verifier_score on public.docs;
create trigger verifier_score before insert or update on public.docs for each row execute function public.verifier_score();

-- Bouton « Supprimer mon compte » : efface les documents du joueur puis son compte.
create or replace function public.supprimer_mon_compte() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  delete from public.docs where owner = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
