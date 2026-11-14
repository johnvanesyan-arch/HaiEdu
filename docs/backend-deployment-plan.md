# Controlled backend deployment — BF-20

Prepared plan only. No automatic migration push, ledger repair or production deployment is enabled.

1. **Fresh structure:** install and qualify the reviewed fresh-only baseline in a disposable local environment. Preserve original migrations and production history; keep technical defaults separate from content and user data.
2. **Forward-update bridge:** define an explicit versioned rule for applying future migrations after the fresh snapshot. Reconcile old aliases, no-op placeholders and environment-bound operations through evidence; never pretend historical production operations ran on the new database. Estimated preparation: 2–4 active hours, subject to discovered data dependencies.
3. **Recovery:** finish the separately deferred BF-02 database and Storage restore exercise before authorizing production automation. A schema rebuild does not restore account/student/file data.
4. **Reviewed release plan:** pin the source tree, target project, current history and relevant schema. List exact changes, prerequisites, data preservation assertions and recovery/roll-forward steps. Refuse unexpected drift. Obtain specific approval for production schema, SQL, settings and function changes.
5. **Release serialization and CI:** verify no competing merger/releaser or pending main workflow; pass all required checks on the exact candidate head. Retain real PostgreSQL, role/isolation, concurrency and fresh-install gates in the aggregate. Isolated CI receives no production credentials.
6. **Every affected consumer:** for shared Edge changes, enumerate all importing functions, preserve each gateway flag, deploy every affected stale bundle when authorized, and read back files/flags. A source merge alone does not update a deployed function.
7. **Post-release evidence:** verify the actual ledger/schema/bundles against the plan and run only separately authorized production acceptance. Record source, checks, exceptions and owned cleanup. Keep the owner QA pause explicit; do not translate skipped checks into passes.

Stop on a target/source mismatch, failed required check, unresolved destructive/data effect, missing recovery proof for the proposed action, or concurrent release. Do not improvise a ledger rewrite, destructive rollback or environment-specific content replay.

No paid project or plan is part of this work. Existing `haiedu-bf16-test` records remain untouched. BF-16 activation and real-classroom qualification are separate decisions; paid stolen-password protection remains declined.
