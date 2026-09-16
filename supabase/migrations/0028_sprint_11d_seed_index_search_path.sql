-- Security-linter fix discovered during Sprint 11D post-DDL review.
-- Preserve deterministic behavior while pinning the function search_path.
create or replace function private.seed_index(p_seed text,p_salt text,p_size integer)
returns integer
language plpgsql
immutable
strict
set search_path=pg_catalog,private
as $$
declare
  v_hash bigint;
begin
  if p_size < 1 then raise exception 'seed_index_invalid_size'; end if;
  v_hash := (('x' || substr(md5(p_seed || ':' || p_salt),1,8))::bit(32)::bigint);
  return ((v_hash % p_size) + 1)::integer;
end;
$$;
