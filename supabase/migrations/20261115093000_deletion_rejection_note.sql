-- A short written reason for a rejected account deletion request (owner decision, 15 November 2026).
-- The rejection reason "other" replaces "legal_hold" and has no fixed sentence on the account page:
-- the account owner sees what the administrator wrote, or no reason line when nothing was written.
-- No existing row is changed. Rollback: alter table public.account_deletion_requests drop column resolution_note;
alter table public.account_deletion_requests
  add column resolution_note text;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_resolution_note_check
  check (
    resolution_note is null
    or (status = 'rejected' and resolution_code = 'other' and char_length(btrim(resolution_note)) between 1 and 300)
  );

comment on column public.account_deletion_requests.resolution_note is
  'Administrator-written reason shown to the account owner when resolution_code is other. Never a fixed text.';
