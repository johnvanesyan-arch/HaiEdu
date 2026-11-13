-- READ ONLY: Supabase unified-log ClickHouse query, NOT database/Postgres SQL.
-- Use query_logs with an explicit bounded ISO start/end window (at most24h).
-- Returns route/status/count/latency only: no identities, headers or payloads.
-- Fields verified in the separate BF-16 test project on13November2026.
select
  log_attributes['request.pathname'] as route,
  toUInt16OrZero(toString(log_attributes['response.status_code'])) as http_status,
  count() as requests,
  round(quantile(0.95)(toFloat64OrZero(
    toString(log_attributes['execution_time_ms'])))) as p95_execution_ms
from logs
where source = 'function_edge_logs'
group by route, http_status
order by route, http_status;
