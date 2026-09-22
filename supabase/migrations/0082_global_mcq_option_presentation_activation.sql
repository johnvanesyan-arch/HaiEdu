-- Sprint 12.5Z — activate global persisted MCQ option-order randomization.
-- Safe to activate only after get-session-item v13 and submit-answer v14 are deployed.

update private.assessment_presentation_configuration
set enabled=true,
    algorithm_version='mcq-option-order-v1',
    updated_at=now()
where config_key='mcq_option_order';

do $$
begin
  if not exists (
    select 1
    from private.assessment_presentation_configuration
    where config_key='mcq_option_order'
      and enabled=true
      and algorithm_version='mcq-option-order-v1'
  ) then
    raise exception 'mcq_option_order_activation_failed';
  end if;
end
$$;
