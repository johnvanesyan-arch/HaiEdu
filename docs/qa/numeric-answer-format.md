# BF-09 numeric answer formatting

## Decision and scope

The owner selected automatic interpretation. Under `haiedu-decimal-input-v1`, a comma or period marks a decimal fraction. `10,800` means `10.8`, following the existing comma convention. A space separates groups of three digits, so `10 800` means `10800`. Regular, no-break and narrow no-break spaces are accepted. Both minus signs and decimal exponent notation are supported. The grader retains the dash and decimal aliases previously converted in the browser.

The active legacy Physics 7 Chapter I adapter serves numeric and quantity items in Practice, Chapter Review, Diagnostic and Mastery Check. The deployed governed SQL dispatcher and active governed policies have separate response capabilities. This change applies to the legacy adapter and its mirrored grader.

## Reproduction and candidate behavior

The deployed TypeScript source matched the audited repository files. Using the real handlers with isolated SQL and synthetic identities, an input of `10 800` scored zero and advanced the question in all four legacy modes. The quantity fixture reproduced the same problem with `38 880 կմ/ժ`. Entering the ungrouped digits graded the equivalent value normally.

The browser sends the learner’s numeric text without dropping internal spaces or characters. The candidate checks the numeric syntax before recording new attempts. A malformed number produces a versioned HTTP 422 format response with no score, attempt, progress, mastery evidence or answer receipt. The learner sees formatting guidance associated with the number field and can edit the same question. Legacy Mastery forwards the format response. A known format rejection also resolves an uncertain submission after an identical retry, while a saved receipt continues to take precedence.

Local focused tests cover both graders through source parity, supported and malformed inputs, quantity conversion, the no-write response, recovery after a lost format reply, and an earlier stored response. The Chromium suite covers the four legacy pages at a narrow viewport, including field guidance, editability and saved-answer recovery. Hosted Chromium and release verification are pending.
