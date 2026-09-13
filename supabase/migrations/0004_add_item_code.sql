-- Stable human-readable item identifiers for curriculum content and analytics.
alter table public.items add column if not exists code text;
create unique index if not exists items_code_key on public.items(code) where code is not null;
