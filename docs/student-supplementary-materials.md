# Student supplementary materials — «Հավելյալ նյութեր»

**Owner request:** 2026-10-27 Asia/Yerevan. John requests a section below «Իմ աշխատանքները» for additional practice materials supplied by teachers or the platform for each subject.

**Status:** S45 is deployed under 16.5B.3: student library, teacher sharing, platform publication, protected PDFs and HTTPS delivery. [Implementation and exact production verification](student-supplementary-materials-implementation.md) supersede the design-only statements below. English remains paused after C47 for the dashboard handoff; full four-subject acceptance remains separate.

## Student experience

- Add a separate navigation entry, **«Հավելյալ նյութեր»**, directly below **«Իմ աշխատանքները»**. Also provide an entry from My work and the selected course. On narrow screens, the bottom navigation may show «Նյութեր» with the full accessible name and page heading.
- Use the learner's selected authorized subject/course context. Filter by unit/topic, provider (**«Ուսուցչից» / «Հարթակից»**) and format. The context retains school, academic year, class, enrollment, grade, programme and release; a filter never grants access.
- Lead with illustrated cards for the learning purpose: **«Վարժանք» / «Ընթերցանություն»**, a clear learning goal and one preview action. Search title, goal, description and topic within the selected authorized context; combine search with purpose chips and the disclosed topic/provider/format filters. Keep the active filter count visible, reset filters on course changes and retain search focus while results update.
- Show a concise title, description, subject/topic, provider and file/link type. In production, show publication/version information and file size when applicable and known. Offer preview/open and permitted download actions only for an available resource.
- An approximate time is shown only when the provider supplies a valid positive estimate; label it as approximate and explain its source in details. It is neither measured learner activity nor a time limit. Omit it when unknown. A teacher-recommendation badge requires an explicit teacher choice for the authorized audience, never a score-based inference or the mere fact that a teacher uploaded it. Missing goal text falls back to the description.
- Use brief hover/focus feedback with no essential hover-only information. Respect the operating-system reduced-motion preference; the local review toolbar offers **«Առանց շարժման»** for inspection only. No persistent preference, animation reward, autoplay or engagement tracking is introduced.
- Distinguish no published materials, no filter matches, loading, failed loading, withdrawn material and lost access. Preserve filter focus and discard stale responses after context/account changes.
- These are optional supplementary resources. Opening or downloading a file is not a completed learning attempt or mastery evidence. Required assignments, due dates, submissions and teacher feedback remain in My work through their governed workflows. Existing unit guides keep their own publication and assessment-access rules.

## Implemented first delivery

Use **PDF worksheets/reference sheets up to 5 MiB and external HTTPS links**. The implementation contract enforces this bounded MVP allowlist. Later add audio, video or interactive resources through declared media capabilities. Existing protected listening recordings and assessed content do not become downloadable supplementary files.

Teachers prepare, preview and share resources with their authorized subject classes. Teacher-shared material is visibly identified as such; it does not acquire platform-reviewed status by being uploaded. HaiEdu-authored material follows the existing platform content review/publication controls and its declared curriculum audience. The student page exposes published, currently authorized versions only. Publishing and withdrawal must be explicit, auditable operations.

The student library, teacher upload/manage/share surface and platform author/reviewer surface form one capability slice. A working student menu alone does not complete the feature. Do not add student uploads, public sharing, social comments, automatic grading, badges or activity analytics to this slice.

## Delivery and integration requirements

This is a subject-neutral resource capability under **16.5B**, with end-to-end acceptance under **16.5C**. Its complete resource service and authoring surfaces are deployed as the bounded 16.5B.3 slice. Student navigation is enabled now that authorized delivery exists. No new top-level sprint or formal-pilot gate is introduced by this design addition.

The deployed implementation contract covers:

1. Versioned resource metadata, explicit provider provenance, curriculum context and publication state. Include purpose and learning-goal authoring, optional validated approximate duration and an explicit provider recommendation with class/audience scope; omit unsupported optional values. These fields are implemented in immutable version metadata. Preserve replacement/withdrawal audit history and avoid orphaned student links.
2. Teacher assignment/class audience checks, platform publication entitlement and server-enforced list/detail/download access. An audience cannot be inferred from a filename, subject title or client filter. Cross-school and unauthorized class access must be denied.
3. Protected file storage with a scoped upload flow, type/size validation and safe delivery. External links must have validated schemes and clear destinations; arbitrary active documents are not rendered inside the application. The implemented file policy is PDF-only, 5 MiB, download attachment with no public/signed URLs.
4. Class/year/context changes, removal and stale-tab behavior. Prior-year availability follows the separate 18.5 history policy; this feature does not authorize historical writes or broaden access to old class files.
5. Compatibility with existing guide visibility, learner assessment/help restrictions and content/release gates. General material sharing must not expose protected question-bank answers or assessed stimuli.
6. Teacher and platform publication, learner filtering/opening/download, revision/withdrawal, denied access, empty/error states, Armenian labels, keyboard and 360/768/1280 px/200% zoom evidence before production acceptance.

The historical design delivery created no runtime resources. B.3 now adds the guarded `manage-supplementary-resources` endpoint, two version/event tables and a private bucket. It does not add notifications or student uploads; see the [API contract](api-contract.md).

## Review preview and evidence

The later [colour/navigation review](student-dashboard-visual-options.md) applies the three review palettes consistently to materials discovery, cards and dialogs. It keeps this section directly below My work in both navigation layouts. Search/filter state survives palette switching; these review controls create no persistent learner preference or resource API change.

The [interactive preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) contains five explicitly fictional English and Physics examples with illustrated cards, search, practice/reading chips, three disclosed filters, learning-goal details, optional estimates/recommendations, a My work/course shortcut and empty/withdrawn states. This illustrates the common component contract; it does not restrict the feature to those subjects. Network requests remain blocked and there are no real files, external links, credentials or learner records in the preview.

The original [26 October evidence](evidence/student-dashboard-design-20261026.json) and [27 October addition record](evidence/student-materials-design-20261027.json) remain historical. The [current refinement evidence](evidence/student-materials-engagement-20261027.json) covers 57 responsive layout checks and 21 interactions. The design aims to help students choose purposeful optional practice; no improvement in engagement or learning outcomes is claimed without student evidence. Those historical preview checks are supplemented by B.3 deployed file delivery, teacher publishing and production isolation evidence linked above.
