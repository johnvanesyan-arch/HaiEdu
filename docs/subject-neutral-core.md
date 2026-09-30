# Subject-Neutral Core and Subject-Aware Extension Invariant

**Status:** Normative core requirement  
**Effective:** 2026-09-30  
**Decision owner:** Product owner  
**Applies to:** schemas, services, APIs, learning engine, web applications, navigation, analytics, authorization, curriculum tooling, deployments and project planning

## Core requirement

HaiEdu is a multi-subject platform. The platform core must be subject-neutral; subject-specific behavior must be implemented through explicit, versioned configuration or extension points.

The platform must support Mathematics, Armenian Language, English, Physics and later subjects such as Biology and Chemistry without redesigning shared identity, tenancy, enrollment, curriculum versioning, learning sessions, evidence provenance, authorization, navigation or analytics.

All subjects have equal architectural and product status. Physics is one subject taught and assessed through the platform. No subject may be designated the platform default, reference course, reference implementation or privileged path. Differences in current content coverage or implementation sequence record delivery status only; they create no architectural or product precedence.

## Shared core responsibilities

The subject-neutral core owns capabilities whose meaning is stable across subjects:

- user identity, roles, school membership and tenant isolation;
- academic years, grades, programmes, courses, classes and enrollment;
- standards, curriculum releases, units, outcomes, skills and prerequisite relationships;
- session lifecycle, item exposure, attempts and immutable evidence provenance;
- authorization, audit logging, privacy controls and release gates;
- navigation, discovery, entitlement checks and shared accessibility behavior;
- shared analytics contracts based on governed identifiers and evidence types;
- registries and contracts through which subject extensions declare capabilities.

Shared code must derive subject, grade, programme, unit, skill and assessment scope from governed data. It must not assume a specific subject, grade, course code, unit size, skill count, item count, response format, mastery rule, language or content model.

## Subject-aware extension responsibilities

A subject-aware extension may define behavior that legitimately differs by discipline:

- curriculum structure and terminology;
- content and stimulus models;
- response editors and renderers;
- deterministic graders or governed scoring strategies;
- rubric structures for constructed responses;
- unit conversion, symbolic mathematics, writing, reading, listening, speaking, diagram or laboratory-interaction capabilities;
- subject-specific mastery or evidence rules when approved and versioned;
- assessment blueprints, item families, hints, misconceptions and remediation strategies;
- subject-specific analytics views derived from shared evidence.

Every extension must declare its subject/programme scope, version, supported capabilities and compatibility contract. An extension must remain replaceable without changing shared authorization, tenancy, provenance or curriculum-release semantics.

## Evidence and scoring versatility

The core stores and transports evidence through neutral contracts. It may support registered response and scoring capabilities, but it must not treat the capability used first by Physics as universal.

A subject extension can select or compose supported capabilities. New capabilities must be added through a stable registration or extension contract, preserve server-authoritative grading and provenance where required, and avoid branching shared behavior on hard-coded subject identifiers.

## Subject isolation

Subject-specific configuration, content, policies and runtime behavior must be isolated by the exact governed programme and curriculum release. Adding or changing one subject must not silently change another subject's:

- curriculum interpretation;
- item selection or assessment blueprint;
- scoring and mastery behavior;
- terminology or UI controls;
- analytics meaning;
- entitlement or authorization boundary;
- historical evidence.

Cross-subject features must use explicit mappings and policy. They must never infer equivalence from names, grades or implementation convenience.

## User-interface requirement

Shared role surfaces must render from the learner's or staff member's authorized academic context and the active extension's declared capabilities. Shared navigation and layouts must not contain Physics-only routes, labels, icons, actions or assumptions.

Subject-specific screens may exist, but they must enter through the same entitlement, context, accessibility and authorization contracts as every other subject.

## Acceptance criteria

A change satisfies this invariant only when the relevant criteria can be demonstrated:

1. The platform designates no default, reference or privileged subject, and a new subject or grade can be onboarded without redesigning shared identity, tenancy, enrollment, curriculum versioning, session, provenance, authorization, navigation or analytics contracts.
2. Shared code contains no hard-coded subject, grade, course code, unit size, skill/item count, language, response format, scoring rule or mastery rule used as a platform default.
3. Counts, labels, available actions and assessment coverage are derived from governed programme, release, blueprint or capability data.
4. Subject-specific renderers, response types, graders, rubrics and policies are selected through declared capability or extension contracts.
5. Every subject-specific policy and assessment blueprint is versioned and bound to the exact curriculum release and evidence it governs.
6. An extension cannot weaken tenant isolation, role authorization, protected-answer handling, auditability or historical provenance.
7. Shared APIs and analytics expose stable, subject-neutral contracts; subject-specific fields are namespaced or carried through explicit typed extension data.
8. Automated isolation tests prove that configuration or evidence from one subject cannot affect another subject's delivery, scoring, mastery, analytics or access.
9. Shared UI works with multiple authorized subjects and does not expose subject-specific routes, labels or actions outside the active context.
10. The Grade 7 four-subject MVP demonstrates Physics, Mathematics, Armenian Language and English operating together without subject leakage or core redesign.

## Exceptions

A subject-specific behavior may enter shared code only when it is shown to be a genuinely cross-subject platform capability and is represented through neutral terminology and contracts.

Any temporary exception requires an explicit architecture decision that records:

- the affected subject and surface;
- why the extension boundary cannot currently be used;
- the authorization, isolation and provenance impact;
- the migration owner and plan;
- the expiry date or review condition.

## Adoption and current compliance

This invariant is effective immediately for new work and for modifications to shared platform surfaces. Existing subject routes, content and assessment behavior remain valid only within their declared subject extensions; none establishes a platform default or reference model.

Adoption of this document is a governance and architecture milestone. It is not a claim that all historical code already satisfies every acceptance criterion. Existing subject-coupled assumptions must be inventoried and resolved in bounded, tested migration slices before the platform or a milestone is described as fully compliant.
