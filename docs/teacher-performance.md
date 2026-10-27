# Sprint 16.5B.7 — Teacher loading performance

2026-10-27 · in progress; no speed improvement released yet.

The production function logs for 148 successful dashboard POSTs in the preceding 24 hours show median 7,610 ms, p95 10,918 ms and maximum 14,394 ms. These are Edge execution times, not end-to-end browser timings or a controlled paired benchmark. Thirty-six denied requests are separate (p95 1,891 ms). The current two designated teachers have 2/3 active and 26/29 archived classes. Database tables have only five enrollment rows; archive metadata and repeated context/analytics reads, rather than learner-volume scale alone, merit investigation.

The read-only workflow records ten iterations per designated teacher for fresh-context Home, same-context Home reload, Classes, Archive, selected class, unit switch and Review. It uses Chromium at 1365×950, unthrottled shared Ubuntu CPU, CDP 4G (150 ms latency, 1.6 Mbps down, 750 Kbps up). It records duration, request count, response bytes and available Server-Timing, never credentials or learner response bodies. Fresh browser context does not imply a cold Edge/database process. Only designated fixture logins and read endpoints are allowed; no learning, class, feedback or invitation writes. Login/logout affects only the run's own sessions.

Initial targets remain p95 useful Home ≤3 s, selected-class opening ≤2 s and loaded in-page navigation ≤200 ms. The baseline must be collected before deploying the implementation. Budgets are measured targets, not release claims; any justified revision and residual bottleneck will be recorded. Synthetic tests will cover a small account and larger archives without manufacturing production learners/classes.

Implementation under preparation: service-only bounded directory (24 metadata rows/page), selected-class detail, on-demand invitations, in-page navigation, actor/request isolation and explicit unknown statistics. Existing full dashboard API consumers retain their contract. Every affected Edge consumer must be source-compared, deployed if stale and read back. English stays at C47; B.8 follows B.7.
