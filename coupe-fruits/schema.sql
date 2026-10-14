-- Coupe-Fruits : à exécuter une fois dans Supabase (SQL Editor > New query > Run).
-- Une seule table de documents, comme la base du jeu dans claude.ai :
--   scores/<id>              meilleurs scores du mois (classement, visible par tous)
--   feed/<id>                12 derniers événements du joueur (fil d'actu, visible par tous)
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
  using (collection in ('scores', 'feed'));

-- Sa propre sauvegarde : lisible par son propriétaire.
create policy "lecture de ses documents" on public.docs for select
  using (owner = auth.uid());

-- Chacun n'écrit que ses trois documents à lui.
create policy "écriture de ses documents" on public.docs for insert
  with check (owner = auth.uid() and path in ('scores/' || auth.uid(), 'feed/' || auth.uid(), 'data/users/' || auth.uid() || '/save'));
create policy "mise à jour de ses documents" on public.docs for update
  using (owner = auth.uid())
  with check (owner = auth.uid() and path in ('scores/' || auth.uid(), 'feed/' || auth.uid(), 'data/users/' || auth.uid() || '/save'));

-- Mises à jour en direct du classement.
alter publication supabase_realtime add table public.docs;
