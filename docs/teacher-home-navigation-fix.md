# Teacher home navigation and session preservation — 2026-09-28

The reported teacher header control linked to `index.html`, the public/student entry page, instead of the teacher home view. The screenshots show the resulting public landing screen; they do not establish whether the underlying Auth session was revoked. Code inspection also found that the shared UX check signed out locally on any `getUser()` error, including network and service failures.

The header now links directly to `teacher.html?view=home` and is labelled **Ուսուցչի գլխավոր էջ**. Staff sidebar logos likewise use their own workspace home route. Explicit sign-out controls remain separate.

The shared check clears local credentials only for explicit terminal Supabase Auth codes (missing/banned user, missing/expired/revoked session or invalid JWT). Network exceptions, timeouts, rate limits, service conflicts and unknown failures preserve the stored session and show a retry message. A delayed error for an old token cannot clear a refreshed or switched session. Server-side authorization, active-profile checks and MFA are unchanged.

Verification: 18 local regression tests cover navigation targets, healthy and anonymous sessions, transient failures, confirmed invalid sessions and stale responses. Browser JavaScript syntax and whitespace checks passed. CI #918 passed all 530 tests, typecheck, browser syntax and the institutional concurrency job. [PR #48](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/48) merged as `a3da7d56c3947decc3f4a3b9236cdf03b4b6d363`. Vercel deployment `ESrUy3D5TK9XiTBKQsh2sAs63zHT` succeeded; production teacher HTML, role navigation and shared UX script returned HTTP 200 and matched the tested source exactly. No user credentials or accounts are modified for QA; authenticated Safari reproduction is not claimed.

This is a bounded Sprint 14 navigation correction. It does not close the remaining authenticated two-school, teacher action, second-context or 14D analytics gates.
