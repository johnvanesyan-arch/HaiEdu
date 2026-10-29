# Shared Forest Armenian font

Noto Sans Armenian, version 2.008. Copyright 2022 The Noto Project Authors. SIL Open Font License 1.1; see [license](OFL-NotoSansArmenian.txt). The original font and license remain unchanged.

Official Google Fonts source: `ofl/notosansarmenian/NotoSansArmenian[wdth,wght].ttf` in https://github.com/google/fonts. Retrieved 27 October 2026; original Git blob SHA-1 `b36ecaf73f746d66f3ac3e4acb029a5784efdf55` (221,936 bytes). License blob `ff91c77a6d7c685ae633cca02b2092c452a9baf0`.

`forest-tokens.css` supplies typography for every Forest consumer: student, teacher, school administrator, master administrator and content staff. Its existing normal width uses the smaller WOFF2 delivery copy, retaining all 436 glyphs, 430 mapped codepoints and the variable 100–900 weight range. The full original `noto-sans-armenian-variable.ttf` remains the fallback. No new width or typography is introduced. Every consuming HTML entry preloads the same content-hashed WOFF2 URL with anonymous CORS, avoiding the nested stylesheet discovery delay; `font-display: swap` remains.

Reproduce with `python -m pip install -r scripts/requirements-ui-font.txt`, then `python scripts/build-forest-font.py` and `node scripts/check-forest-font.mjs --write`. The pinned recipe fixes only the unused width axis at 100, disables IUP optimization and preserves timestamps. It compares every decomposed glyph outline and advance at seven weights against the original: 3,052 comparisons, all equal to six decimal places. Native Chromium also compares Armenian/Latin text metrics. This is a normal-width delivery derivative, not a claim that the original width axis remains in the WOFF2 file.

`forest-font.json` records source, delivery, recipe and license SHA-256 hashes and tool versions. `npm run check:ui-font` verifies provenance, scope and exact preloads in CI. Browser QA follows both preload and CSS font binaries so font changes cannot bypass affected production checks.
