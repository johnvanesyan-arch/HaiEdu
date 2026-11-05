# BF-03 — Public identifiers: text redaction and publication guard

**5 November 2026. Partial mitigation; account login and evidence-publication decisions remain open.** The current-source text exposure is corrected and a required-CI email guard is added. No account, credential, CI secret, learning record, application runtime or public history is changed. BF-02 remains deferred. BF-01 independent review remains unavailable; [PR407](https://github.com/johnvanesyan-arch/HaiEdu/pull/407) is still a separate draft despite its five passing CI jobs.

## Confirmed exposure and correction

The supplied QA report, Part 1 pages 12–13 (R1/R4), reports a personal login address in two public documents and older operational evidence containing identifiers. Fresh scanning at main `d0bbaa5488139b92346b8b720a760601896d5f29` reproduces exactly two unapproved email locations in 2,030 tracked UTF-8 files:

- `docs/sprint-roadmap.md`
- `docs/sprint-11g-multi-subject-learner-shell.md`

Both now use the role label **designated legacy multi-subject QA learner**, preserving the documented Physics/Mathematics fixture relationship. The original address and a hash of it are deliberately absent from this receipt. The account's current login address has not been changed or freshly verified against Auth. The report's account observation is historical, not evidence of compromise.

## Guard and reviewed exceptions

The `test` job in `.github/workflows/ci.yml` runs `node tests/support/public-email-scan.mjs`, so a failed scan fails the existing required `Platform release checks` aggregate. The guard reads all tracked regular text files and rejects unapproved email literals in documentation, evidence, application code and tests. It also checks filenames, refuses symlinks/unsupported text encodings, and recognizes common HTML, URL and JavaScript/JSON encodings of email punctuation. It neither evaluates source nor contacts external services.

The scan allows the reserved documentation/test namespaces `example.com`, `example.net`, `example.org`, `.example`, `.invalid` and `.test`, including their subdomains. Numeric package-version syntax is not an email. These deliberate fixture/placeholder exceptions are supported by [IANA's example domains](https://www.iana.org/help/example-domains) and [special-use domain registry](https://www.iana.org/assignments/special-use-domain-names).

[The reviewed public-email exception list](public-email-exceptions.json) is empty. Any future legitimate public contact or attribution needs an exact file/address pair and a reason; an exception does not exempt other files or arbitrary addresses. Do not add a personal QA login as an exception to silence the guard. Failure output contains file/line/category only, with email-like filenames redacted; neither the address nor source snippets are printed into CI logs.

This is a bounded ASCII email-literal check, not a complete PII or credential scanner. It does not detect every obfuscation, internationalized address, person name, UUID, screenshot pixel, old branch, commit-history value, remote workflow artifact or account configuration. Binary assets are explicitly counted outside text coverage. Eight focused regressions cover the original failure class, reserved-domain boundary tricks, encodings, exact exceptions, real tracked-file CLI behavior, safe failure logs, unsupported text/symlinks and identifiers in filenames. The before-fix scan reproduces both document findings; the after-fix scan is clear without new exceptions.

## Evidence inventory and limits

The [sanitized audit](../evidence/public-identifier-audit-20261105.json) records paths and counts without the underlying account/class/session values. At the baseline, 548 JSON evidence files were inspected. A direct field-name screen finds **23 files** containing UUIDs under account, school, class or session-related keys. This is a candidate inventory, not proof that every UUID identifies a real person or a complete inventory of every embedded identifier. Content/release IDs and preservation evidence must not be automatically removed as though they were credentials.

Automated English OCR completes on **72** tracked evidence/design PNG/JPEG images. It finds no non-reserved email strings. Six matches across three teacher analytics captures are the existing `example.com` form placeholders; the 390px capture was also visually checked. OCR can miss text and does not establish that all images are free of names, IDs or other private data. The original bytes of all evidence images are preserved. The first unconstrained OCR attempt timed out; the bounded single-thread-per-process pass completes without failed images.

Remote Actions logs/artifacts, old branches and Git history have not been comprehensively audited or erased. Updating current documents does not remove older public copies. No rewrite, bulk branch deletion or evidence deletion is performed. No credential leak or account compromise is inferred from an exposed login address or UUID.

## Remaining decisions and completion

1. **Replacement QA login:** John supplies a dedicated address he controls. Before changing it, identify the exact legacy QA account and any current runner/CI-secret dependencies without printing credentials. Preserve the account ID, memberships and learning history. Coordinate the login and any necessary secret update, then verify sign-in and affected fixture guards. Do not invent an address or repurpose a different QA account.
2. **Evidence publication:** before real learner use, John chooses a restricted destination or an approved redacted publication scope for operational evidence. Public summaries should use scoped role aliases, counts and outcomes; private originals retain any exact identifiers needed for controlled verification. Confirm destination access before moving records, and inspect screenshots/attachments as well as JSON. Until that disposition is complete, R4 remains open.
3. **History:** retain the documented fact that older public commits/copies can still contain the previous address. The report recommends against rewriting history; no rewrite is part of this mitigation.

BF-03 is not fully closed by the two text edits and passing scanner. Its login coordination, evidence-publication disposition and corresponding verification remain explicit. This does not waive BF-01, resume BF-02, or change the owner usability/content/security gates.
