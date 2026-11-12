-- Disposable database only. No real Auth, application data or credentials.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users select ('16000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
  from generate_series(1,200) n;
