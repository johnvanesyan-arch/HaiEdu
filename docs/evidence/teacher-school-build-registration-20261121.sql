insert into private.client_failure_builds(build_id,expires_at) values ('7ef5840df5ede544ecfea25f2a01e44b35599afb594b36e7fb6c754a7ae0dae9',clock_timestamp()+interval '30 days') on conflict(build_id) do update set expires_at=excluded.expires_at;

