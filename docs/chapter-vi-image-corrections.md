# Chapter VI image corrections

**Sprint 15F.5 · 2026-10-19 Asia/Yerevan**

The owner supplied replacement illustrations for nine Chapter VI questions. The files are stored under new `-v2.png` paths so the previous immutable item snapshots continue to resolve to their original assets and browser/CDN caches cannot substitute an old image at an overwritten URL.

## Exact correction set

| Item | New asset | Learner-text change | Correct answer |
| --- | --- | --- | --- |
| `PHY7-U06-S02-I01` | `p118-pressure-contact-v2.png` | None | Unchanged |
| `PHY7-U06-S04-I01` | `p126-pascal-law-v2.png` | None | Unchanged |
| `PHY7-U06-S06-I01` | `p131-communicating-vessels-v2.png` | None | Unchanged |
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

## Governed write and release boundary

The guarded transaction was rehearsed with rollback and then committed. It changed only the nine current item rows, added their immutable v2 snapshots, and preserved all options, keys, explanations, hints, misconception mappings, v1 snapshots, and prior asset files. The nine items remain `draft`, `needs_review`, and `provisional_no_sme_review`.

At the write checkpoint Chapter VI contained **233 approved questions and these nine review-pending v2 questions**, for 242 total. The 146 guides and 158 misconception definitions remain drafts. Release `physics7_u06_2026_08_14_draft_r6` remains inactive; U06 still has zero pools, form links, learning-session items, or recorded learner exposures. This correction does not authorize assessment allocation, activation, or learner release.

Production asset readback and the nine v2 technical-QA records are completed only after the repository deployment serves every new path with its expected byte hash. See the dated evidence record for the exact asset and database receipts.

