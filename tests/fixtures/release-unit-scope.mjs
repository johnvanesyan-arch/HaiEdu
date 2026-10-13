import {readFileSync} from 'node:fs';
export const id=n=>`72000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const source=readFileSync('supabase/migrations/20261001001000_sprint_15b_multi_unit_release_governance.sql','utf8');
const start=source.indexOf('create or replace function private.enforce_curriculum_release_activation_gates()');
const gate=source.slice(start,source.indexOf('$$;',start)+3);
export const migration=readFileSync('supabase/migrations/20261013101644_disjoint_curriculum_release_units.sql','utf8');
export const schema=`
create schema private;
do $$begin create role anon;exception when duplicate_object then null;end$$;
do $$begin create role authenticated;exception when duplicate_object then null;end$$;
do $$begin create role service_role;exception when duplicate_object then null;end$$;
create table subject_programs(id uuid primary key);
create table units(id uuid primary key,subject_program_id uuid references subject_programs,code text);
create table curriculum_releases(id uuid primary key,subject_program_id uuid references subject_programs,
 release_key text unique,release_number integer,status text,reconciliation_id uuid,predecessor_release_id uuid,
 source_snapshot jsonb default '{}',content_fingerprint text default 'fixture',activated_at timestamptz,updated_at timestamptz,
 check((status='draft' and activated_at is null) or (status<>'draft' and activated_at is not null)));
create unique index curriculum_releases_one_active_per_program_uq on curriculum_releases(subject_program_id) where status in ('pilot','production');
create table curriculum_release_units(curriculum_release_id uuid references curriculum_releases on delete cascade,unit_id uuid references units,
 unit_code_snapshot text,primary key(curriculum_release_id,unit_id));
create table curriculum_reconciliation_runs(id uuid primary key,unit_id uuid,status text);
create table curriculum_release_reconciliations(curriculum_release_id uuid references curriculum_releases on delete cascade,reconciliation_id uuid,unit_id uuid,
 primary key(curriculum_release_id,unit_id));
create table curriculum_release_outcomes(curriculum_release_id uuid references curriculum_releases on delete cascade,learning_outcome_id uuid);
create table curriculum_release_skills(curriculum_release_id uuid references curriculum_releases on delete cascade,skill_id uuid);
create table curriculum_release_item_families(curriculum_release_id uuid references curriculum_releases on delete cascade,item_family_id uuid);
create table curriculum_release_gate_checks(curriculum_release_id uuid references curriculum_releases on delete cascade,gate_code text,status text,
 primary key(curriculum_release_id,gate_code));
create table assessment_blueprints(id uuid primary key,curriculum_release_id uuid references curriculum_releases,unit_id uuid,purpose text,status text);
${gate}
create trigger curriculum_releases_activation_gate before update of status on curriculum_releases
 for each row execute function private.enforce_curriculum_release_activation_gates();
create function private.guard_release_snapshot_immutability() returns trigger language plpgsql as $$
declare s text;begin select status into s from curriculum_releases where id=coalesce(new.curriculum_release_id,old.curriculum_release_id);
if s<>'draft' then raise exception 'activated_curriculum_release_snapshot_is_immutable';end if;
if tg_op='DELETE' then return old;end if;return new;end;$$;
${['units','reconciliations','outcomes','skills','item_families'].map(n=>`create trigger snapshot_guard before insert or update or delete on curriculum_release_${n} for each row execute function private.guard_release_snapshot_immutability();`).join('\n')}
insert into subject_programs values('${id(1)}'),('${id(2)}');
insert into units values ${[[101,1],[102,1],[103,1],[104,1],[201,2]].map(([u,p])=>`('${id(u)}','${id(p)}','SYN-${u%100}')`).join(',')};
insert into curriculum_reconciliation_runs select id,id,'complete' from units;
`;
export function releaseSQL(n,programme,units){return `
insert into curriculum_releases(id,subject_program_id,release_key,release_number,status) values('${id(n)}','${id(programme)}','fixture_${n}',${n},'draft');
insert into curriculum_release_units select '${id(n)}',id,code from units where id in (${units.map(u=>`'${id(u)}'`).join(',')});
insert into curriculum_release_reconciliations select '${id(n)}',unit_id,unit_id from curriculum_release_units where curriculum_release_id='${id(n)}';
insert into curriculum_release_outcomes values('${id(n)}','${id(1000+n)}');
insert into curriculum_release_skills values('${id(n)}','${id(2000+n)}');
insert into curriculum_release_item_families values('${id(n)}','${id(3000+n)}');
insert into curriculum_release_gate_checks select '${id(n)}',g,case when g='external_sme_approved' then 'pending' else 'passed' end
 from unnest(array['official_programme_identified','normative_sources_registered','outcomes_reconciled','skills_mapped','assessment_scope_bound','content_qa_passed','external_sme_approved'])g;
insert into assessment_blueprints select gen_random_uuid(),'${id(n)}',unit_id,p,'pilot' from curriculum_release_units cross join unnest(array['practice','diagnostic','mastery_check'])p where curriculum_release_id='${id(n)}';
`;}
export const seed=releaseSQL(10,1,[101])+releaseSQL(11,1,[102])+releaseSQL(12,1,[101])+releaseSQL(13,2,[201])+releaseSQL(14,1,[103])+releaseSQL(15,1,[103])+
 `update curriculum_releases set status='pilot' where id='${id(10)}';`;
export async function database(){const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();await db.exec(schema+seed);await db.exec('begin;'+migration+'commit;');return db;}
if(process.argv[1]?.endsWith('release-unit-scope.mjs'))process.stdout.write(JSON.stringify({schema,seed,migration}));
