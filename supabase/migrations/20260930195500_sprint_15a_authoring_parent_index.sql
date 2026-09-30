-- Sprint 15A.1 advisor correction — cover the immutable parent-version FK.

create index if not exists remediation_guide_authoring_parent_idx
  on public.remediation_guide_authoring_versions (parent_version_id)
  where parent_version_id is not null;
