-- Cover immutable analysis-scope foreign keys flagged by the database advisor.
create index if not exists calibration_analysis_scopes_metric_set_idx
  on public.calibration_analysis_scopes(calibration_metric_set_id);
create index if not exists calibration_analysis_scopes_pilot_run_idx
  on public.calibration_analysis_scopes(pilot_run_id);
