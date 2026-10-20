# Chapter VI image corrections

**Sprint 15F.5 · original delivery 2026-10-19; S06 follow-up 2026-10-20 Asia/Yerevan**

The owner supplied replacement illustrations for nine Chapter VI questions on October 19, then a figure-92-only replacement for S06-I01 on October 20. Versioned `-v2.png` and `-v3.png` paths preserve prior immutable snapshots and avoid stale-path caching.

## Exact correction set

| Item | New asset | Learner-text change | Correct answer |
| --- | --- | --- | --- |
| `PHY7-U06-S02-I01` | `p118-pressure-contact-v2.png` | None | Unchanged |
| `PHY7-U06-S04-I01` | `p126-pascal-law-v2.png` | None | Unchanged |
| `PHY7-U06-S06-I01` | `p131-communicating-vessels-v3.png` | Accessible description aligned to figure 92 alone | `C`, unchanged |
| `PHY7-U06-S07-I01` | `p135-hydraulic-press-v2.png` | None | Unchanged |
| `PHY7-U06-S08-I04` | `p143-torricelli-v2.png` | Image alt text only | Unchanged |
| `PHY7-U06-S09-I01` | `p148-buoyant-force-measurement-v2.png` | None | Unchanged |
| `PHY7-U06-S11-I01` | `p156-floating-conditions-v2.png` | Image alt text only | Unchanged |
| `PHY7-U06-S12-I01` | `p159-ship-displacement-v2.png` | None | Unchanged |
| `PHY7-U06-S13-I05` | `p152-liquid-density-comparison-v2.png` | Prompt and image alt text clarified | `C`, unchanged |

The revised S13 prompt is:

> Պատկերում կշեռքի երկու կողմերում կախված են հավասար բեռներ, որոնց տակ դրված են ջրով և կերոսինով անոթներ։ Բեռները հեղուկների մեջ լրիվ ընկղմելիս ո՞ր լրացուցիչ պայմանն է կարևոր հեղուկների ազդեցությունը ճիշտ համեմատելու համար։

The retained correct choice is:

> Բեռների ընկղմված ծավալները պետք է հավասար լինեն, իսկ կախված մարմինները չպետք է հպվեն անոթներին։

This makes the pictured balance arrangement explicit while preserving the intended fair-comparison reasoning: equal immersed volume holds displaced volume constant, and no contact with the vessels avoids an additional support force.

## Comparison and language check

The S13 revision was compared against the complete frozen 5,909-profile Chapter VI Batch 3 corpus plus all 82 Batch 3 candidates, for 5,991 profiles total. Its closest match is its own v1 history (`0.878942`). The closest non-self lexical match is `PHY7-U06-S11-I01` (`0.331627`) and asks a different force-equilibrium question. Manual related-item checks against `S09-M02`, `S10-I07`, `S13-I01`, and `S13-I08` found no substantive duplicate: those items predict outcomes, calculate a ratio, identify measurements, or isolate bottom contact, while this revision asks for the combined controls needed to compare two liquids fairly.

Disposition: retain as an intentional Practice variant with zero claimed independent capacity. No untaught science is introduced. Armenian terminology and the physical interpretation remain aligned to *Ֆիզիկա 7* (Մելիքյան–Մաիլյան, 2023), Chapter VI.

## Historical October 19 governed write and release boundary

The guarded transaction was rehearsed with rollback and then committed. It changed only the nine current item rows, added their immutable v2 snapshots, and preserved all options, keys, explanations, hints, misconception mappings, v1 snapshots, and prior asset files. The nine items remain `draft`, `needs_review`, and `provisional_no_sme_review`.

At the write checkpoint Chapter VI contained **233 approved questions and these nine review-pending v2 questions**, for 242 total. The 146 guides and 158 misconception definitions remain drafts. Release `physics7_u06_2026_08_14_draft_r6` remains inactive; U06 still has zero pools, form links, learning-session items, or recorded learner exposures. This correction does not authorize assessment allocation, activation, or learner release.

PR #271 merged at `f64deec141f4825e51b8c12f1d264882178f4b28` after every PR and post-merge release check passed. That exact commit was verified live on `www.haiedu.am` at the October 19 checkpoint. All nine public PNGs returned their expected byte counts, SHA-256 hashes and dimensions. The follow-up QA transaction recorded **9/9 passes, zero errors and zero warnings**; final database readback confirms all nine v2 items are still review-pending, all supporting content is preserved, and the inactive zero-allocation/zero-exposure boundary remains intact. See the dated evidence record for the exact receipts.


## October 20 S06-I01 figure-92 replacement

**2026-10-20 11:29 Asia/Yerevan checkpoint:** 242 questions — **241 approved and only `PHY7-U06-S06-I01` v3 awaiting review**; **146 published guides**; **33 active and 125 draft misconception definitions**. These counts record the observed review checkpoint.

The owner supplied figure 92 alone for `PHY7-U06-S06-I01`. Version 3 uses `p131-communicating-vessels-v3.png` and an accessible description of the three connected-vessel pairs. The prompt, four choices, answer `C`, explanation, hints, mappings and v1/v2 history are preserved. The image is live and matches the supplied 1,619,301-byte PNG (1028 × 1024); the guarded save and current-version QA passed with zero errors or warnings.

The removed figure 91 showed an additional setup and is no longer part of the current illustration. The replacement shows only figure 92: three independent connected-vessel pairs; equal levels apply within each pair. Source: *Ֆիզիկա 7*, Մելիքյան–Մաիլյան, 2023, §44, printed p.131, figure 92; programme Theme 6, mandatory outcome 1(4).

The refreshed S06 comparison covers all 20 current questions and 21 historical snapshots, with the unchanged related-skill corpus from Batch 2 reused. Related I03/I04 and D01 repeat the same taught law in different response demands; M01/M04 add combined-condition reasoning. This existing Practice item keeps its intentional-variant disposition and claims no new capacity. No question, guide, misconception or assessment scenario was added.

Asset commit `800b4771660dcf62a9c1b2483dc45ef71bbe9276` passed all five release checks in [CI 39385891974](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39385891974). The uploaded PNG's SHA-256 is `26f41a879ab9302ad8303e5efb1527e9866d77528081e40f8ab972f66d57d43d`. Rollback rehearsal, guarded commit, snapshot preservation and version-bound QA pass; QA run `15F5-s06-image-v3-20261020` is actor-null technical verification. The dedicated reviewer browser was signed out; the public image was visually checked and the saved question-to-image link was verified directly.

Release `physics7_u06_2026_08_14_draft_r6` remains draft and never activated, with zero U06 pool, form, session or exposure rows. Exact-version review of S06-I01 v3 and the remaining definitions is still open. Assessment contract, qualification, allocation and learner release remain separate.

[S06 v3 evidence](evidence/chapter-vi-s06-image-v3-20261020.json) · [Correction record](chapter-vi-image-corrections.md).
