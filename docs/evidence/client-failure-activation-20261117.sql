-- Owner-approved activation preparation: one exact reviewed enabled browser build.
-- Apply only after candidate checks and release approval; does not enable a flag.
insert into private.client_failure_builds(build_id,expires_at)
values ('fe0717a1640bd5887e94171e225c2d60b4368f346f610f3bf48ffcd4e76951c9',clock_timestamp()+interval '30 days')
on conflict(build_id) do update set expires_at=excluded.expires_at;
