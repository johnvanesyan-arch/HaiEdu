-- Chapter I decision I-2, option A (plan revision 3, 20 November 2026).
-- Repository preparation for an isolated build and local staging only.
-- Applying this migration to production needs John's explicit approval.
--
-- Versioned pass/readiness criteria for the registered legacy mastery adapter
-- (legacy-physics7-u01-v1), plus an append-only activation log that decides which
-- version NEW checks receive. Each check saves its version, criteria and fingerprint
-- when it starts and is scored by them when it finishes (Edge Functions).
-- The activation log is seeded with today's rule only: nothing changes for students
-- until a separately approved activation row names another version.
begin;

create schema if not exists private;

create table private.legacy_mastery_rule_versions (
  rule_version text primary key check (rule_version ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  unit_code text not null check (length(trim(unit_code)) > 0),
  criteria jsonb not null,
  fingerprint text not null,
  description text not null check (length(trim(description)) > 0),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(criteria) = 'object'),
  check (criteria->>'schemaVersion' = 'haiedu-legacy-mastery-criteria-v1'),
  check (criteria->>'ruleVersion' = rule_version),
  check (criteria->>'unitCode' = unit_code)
);

create table private.legacy_mastery_rule_activations (
  activation_sequence bigint generated always as identity primary key,
  unit_code text not null,
  rule_version text not null references private.legacy_mastery_rule_versions(rule_version),
  activated_at timestamptz not null default clock_timestamp(),
  activated_by text not null check (length(trim(activated_by)) between 1 and 200),
  reason text not null check (length(trim(reason)) between 1 and 1000)
);
create index legacy_mastery_rule_activations_unit_idx
  on private.legacy_mastery_rule_activations (unit_code, activation_sequence desc);

-- The fingerprint is always computed here from the stored JSON, never supplied.
create function private.legacy_mastery_rule_fingerprint()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.fingerprint := encode(sha256(convert_to(new.criteria::text, 'UTF8')), 'hex');
  return new;
end;
$$;
create trigger legacy_mastery_rule_versions_fingerprint before insert on private.legacy_mastery_rule_versions
  for each row execute function private.legacy_mastery_rule_fingerprint();

create function private.legacy_mastery_rule_activation_unit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from private.legacy_mastery_rule_versions v
                 where v.rule_version = new.rule_version and v.unit_code = new.unit_code) then
    raise exception 'legacy_mastery_rule_unit_mismatch';
  end if;
  return new;
end;
$$;
create trigger legacy_mastery_rule_activations_unit before insert on private.legacy_mastery_rule_activations
  for each row execute function private.legacy_mastery_rule_activation_unit();

-- Registry rows are immutable and the activation log is append-only.
create function private.legacy_mastery_rule_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'legacy_mastery_rule_records_immutable';
end;
$$;
create trigger legacy_mastery_rule_versions_immutable before update or delete on private.legacy_mastery_rule_versions
  for each row execute function private.legacy_mastery_rule_immutable();
create trigger legacy_mastery_rule_versions_no_truncate before truncate on private.legacy_mastery_rule_versions
  for each statement execute function private.legacy_mastery_rule_immutable();
create trigger legacy_mastery_rule_activations_immutable before update or delete on private.legacy_mastery_rule_activations
  for each row execute function private.legacy_mastery_rule_immutable();
create trigger legacy_mastery_rule_activations_no_truncate before truncate on private.legacy_mastery_rule_activations
  for each statement execute function private.legacy_mastery_rule_immutable();

alter table private.legacy_mastery_rule_versions enable row level security;
alter table private.legacy_mastery_rule_activations enable row level security;
revoke all on private.legacy_mastery_rule_versions, private.legacy_mastery_rule_activations
  from public, anon, authenticated, service_role;

-- Today's rule, recorded as it is. Wording stays in today's pages (textsHy null)
-- and today's result display stays in place (reporting null).
insert into private.legacy_mastery_rule_versions (rule_version, unit_code, description, criteria) values
('phy7-u01-v1', 'PHY7-U01',
 'Today''s Chapter I rule: rounded percentage of all 20 questions >= 80%, at least 1 correct in every skill, readiness on all ten skills.',
 '{
   "schemaVersion": "haiedu-legacy-mastery-criteria-v1",
   "ruleVersion": "phy7-u01-v1",
   "unitCode": "PHY7-U01",
   "deliveredSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S07","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "itemsPerSkill": 2,
   "scoredSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S07","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "readinessSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S07","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "reviewTargetSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S07","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "maximumReviewTargets": 3,
   "minimumPercent": 80,
   "percentComparison": "rounded_overall_percent",
   "minimumCorrectPerScoredSkill": 1,
   "reporting": null,
   "textsHy": null
 }'::jsonb),
('phy7-u01-i2-v1', 'PHY7-U01',
 'Decision I-2: S07 delivered and reported separately; pass on the 18 questions of the nine other skills at the exact 80% (15/18) with at least 1 correct in each; readiness on those nine; S07 never a targeted-review skill.',
 '{
   "schemaVersion": "haiedu-legacy-mastery-criteria-v1",
   "ruleVersion": "phy7-u01-i2-v1",
   "unitCode": "PHY7-U01",
   "deliveredSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S07","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "itemsPerSkill": 2,
   "scoredSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "readinessSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "reviewTargetSkillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"],
   "maximumReviewTargets": 3,
   "minimumPercent": 80,
   "percentComparison": "exact_scored_fraction",
   "minimumCorrectPerScoredSkill": 1,
   "reporting": {
     "resultSchemaVersion": "haiedu-assessment-result-v2",
     "groups": [
       {"key": "required", "label": "Պարտադիր և օժանդակ հմտություններ", "skillCodes": ["PHY7-U01-S01","PHY7-U01-S02","PHY7-U01-S03","PHY7-U01-S04","PHY7-U01-S05","PHY7-U01-S06","PHY7-U01-S08","PHY7-U01-S09","PHY7-U01-S10"]},
       {"key": "additional", "label": "Լրացուցիչ վերջնարդյունք", "skillCodes": ["PHY7-U01-S07"]}
     ]
   },
   "textsHy": {
     "rule": "Ստուգումն անցնելու համար պետք է ճիշտ պատասխանել պարտադիր և օժանդակ հմտություններին վերաբերող 18 հարցից առնվազն 15-ին։ Ինը հմտություններից յուրաքանչյուրի երկու հարցից առնվազն մեկին պետք է ճիշտ պատասխանել։ Չափման միավորների փոխարկման երկու հարցերին նույնպես պետք է պատասխանել։ Դրանց արդյունքը ներկայացվում է առանձին և չի ազդում ստուգումն անցնելու վրա։",
     "ready": "Ստուգմանը մասնակցելու համար անհրաժեշտ հմտություններն ամրապնդված են։",
     "locked": "Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։"
   }
 }'::jsonb);

insert into private.legacy_mastery_rule_activations (unit_code, rule_version, activated_by, reason)
values ('PHY7-U01', 'phy7-u01-v1', 'migration 20261120120000',
        'Records today''s rule as the active Chapter I rule. No behaviour change.');

create function private.legacy_mastery_rule_row(v private.legacy_mastery_rule_versions)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('ruleVersion', v.rule_version, 'unitCode', v.unit_code,
                            'criteria', v.criteria, 'fingerprint', v.fingerprint);
$$;

-- Service-only reads. The active version is the newest activation row for the unit.
create function public.service_legacy_mastery_active_rule(p_unit_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v private.legacy_mastery_rule_versions%rowtype; a private.legacy_mastery_rule_activations%rowtype;
begin
  select * into a from private.legacy_mastery_rule_activations
  where unit_code = p_unit_code order by activation_sequence desc limit 1;
  if not found then raise exception 'legacy_mastery_rule_unavailable'; end if;
  select * into v from private.legacy_mastery_rule_versions where rule_version = a.rule_version;
  return private.legacy_mastery_rule_row(v) || jsonb_build_object(
    'activationSequence', a.activation_sequence, 'activatedAt', a.activated_at);
end;
$$;

create function public.service_legacy_mastery_rule_version(p_rule_version text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v private.legacy_mastery_rule_versions%rowtype;
begin
  select * into v from private.legacy_mastery_rule_versions where rule_version = p_rule_version;
  if not found then raise exception 'legacy_mastery_rule_unknown'; end if;
  return private.legacy_mastery_rule_row(v);
end;
$$;

-- The switch. Each call appends one row; rollback is a new row naming the older
-- version. Refuses an unknown version, a version of another unit and a no-op switch.
create function public.service_activate_legacy_mastery_rule(
  p_unit_code text, p_rule_version text, p_activated_by text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_version text; a private.legacy_mastery_rule_activations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('legacy_mastery_rule_activation|' || coalesce(p_unit_code, ''), 0));
  if not exists (select 1 from private.legacy_mastery_rule_versions where rule_version = p_rule_version) then
    raise exception 'legacy_mastery_rule_unknown';
  end if;
  select rule_version into current_version from private.legacy_mastery_rule_activations
  where unit_code = p_unit_code order by activation_sequence desc limit 1;
  if current_version = p_rule_version then raise exception 'legacy_mastery_rule_already_active'; end if;
  insert into private.legacy_mastery_rule_activations (unit_code, rule_version, activated_by, reason)
  values (p_unit_code, p_rule_version, p_activated_by, p_reason) returning * into a;
  return jsonb_build_object('activationSequence', a.activation_sequence, 'unitCode', a.unit_code,
    'ruleVersion', a.rule_version, 'previousRuleVersion', current_version, 'activatedAt', a.activated_at);
end;
$$;

revoke all on function private.legacy_mastery_rule_fingerprint(), private.legacy_mastery_rule_activation_unit(),
  private.legacy_mastery_rule_immutable(), private.legacy_mastery_rule_row(private.legacy_mastery_rule_versions),
  public.service_legacy_mastery_active_rule(text), public.service_legacy_mastery_rule_version(text),
  public.service_activate_legacy_mastery_rule(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.service_legacy_mastery_active_rule(text), public.service_legacy_mastery_rule_version(text),
  public.service_activate_legacy_mastery_rule(text, text, text, text) to service_role;


commit;
