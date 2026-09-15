# Sprint 10.5A — Low-Fidelity Student Wireframes

These layouts define hierarchy and interaction priority only. They are not visual-design specifications and should not be treated as pixel targets.

---

## 1. Student Home — desktop

```text
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ PLATFORM             │  Home                                      [Account ▾] │
│                      │                                                         │
│ ● Home               │  Բարի վերադարձ                                         │
│   Physics 7          │  What should I do next?                                 │
│   Assessment         │                                                         │
│   Progress           │  ┌───────────────────────────────────────────────────┐  │
│                      │  │ CONTINUE / RECOMMENDED NEXT ACTION                │  │
│                      │  │ S08 · Scale reading                               │  │
│                      │  │ Short backend-supplied reason                     │  │
│                      │  │                                   [Continue]      │  │
│                      │  └───────────────────────────────────────────────────┘  │
│                      │                                                         │
│                      │  ┌────────────────────┐  ┌───────────────────────────┐  │
│                      │  │ Chapter I progress │  │ Assessment status         │  │
│                      │  │ 6 / 10 secure      │  │ Diagnostic complete       │  │
│                      │  │ [progress bar]     │  │ Mastery check: locked     │  │
│                      │  └────────────────────┘  └───────────────────────────┘  │
│                      │                                                         │
│                      │  Recommended / recent skills                            │
│                      │  [skill row] [skill row] [skill row]                   │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

### Home priority states

**Active session:** the first card becomes “Continue learning” and resumes that session.

**No active session:** show backend recommended next skill/action.

**Assessment action due:** assessment card becomes visually prominent but does not override an active-session resume unless the backend says so.

**Chapter verified:** first card becomes a completion/next-course state rather than inventing new work.

---

## 2. Physics 7 browser — desktop

```text
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ PLATFORM             │  Physics 7                                  [Account ▾] │
│                      │                                                         │
│   Home               │  Ֆիզիկա 7                                              │
│ ● Physics 7          │  Grade 7 Physics                                       │
│   Assessment         │                                                         │
│   Progress           │  ┌───────────────────────────────────────────────────┐  │
│                      │  │ CHAPTER I · active                                │  │
│                      │  │ Բնության ուսումնասիրության ֆիզիկական մեթոդները    │  │
│                      │  │ Topic A                                            │  │
│                      │  │ S01  Skill name          Secure        [Review]    │  │
│                      │  │ S02  Skill name          Developing    [Practice]  │  │
│                      │  │ S03  Skill name          Not started   [Start]     │  │
│                      │  │                                                   │  │
│                      │  │ Topic B                                            │  │
│                      │  │ S04 ...                                            │  │
│                      │  └───────────────────────────────────────────────────┘  │
│                      │                                                         │
│                      │  Chapter II   Coming later                              │
│                      │  Chapter III  Coming later                              │
│                      │  Chapter IV   Coming later                              │
│                      │  Chapter V    Coming later                              │
│                      │  Chapter VI   Coming later                              │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

### Skill-row content contract

```text
[code] [Armenian skill name]
[layer badge] [student-facing mastery state] [mastery/progress indicator]
[action: Start / Practice / Continue / Ready for check / Review]
```

The action is derived from backend state; the row does not calculate eligibility independently.

---

## 3. Practice — desktop

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ ← Physics 7 / Chapter I / S08                         Mastery 58%  [Account ▾] │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Scale reading                                                               │
│  Question 3 of max 8                                      [progress bar]     │
│                                                                               │
│        ┌──────────────────────────────────────────────────────────────┐       │
│        │ stimulus / diagram                                          │       │
│        │                                                              │       │
│        │ Question prompt                                              │       │
│        │                                                              │       │
│        │ answer controls                                              │       │
│        │                                                              │       │
│        │ [Help]                                      [Submit answer]  │       │
│        └──────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  HELP STATE (practice only)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Hint 1 / Hint 2 / Worked example                                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  RESULT STATE                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Correct / Needs another try                                            │  │
│  │ brief remediation message                       [Continue]             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Practice rules visible in the layout

- Question is the primary visual object.
- Mastery is visible but secondary.
- Help is available only during practice.
- No speed timer or speed score.
- Incorrect-answer state may show remediation; identical immediate repetition is not implied by the UI.
- Session remains bounded by the existing backend.

---

## 4. Assessment hub — desktop

```text
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ PLATFORM             │  Assessment                                 [Account ▾] │
│                      │                                                         │
│   Home               │  Գնահատում                                             │
│   Physics 7          │  Chapter I assessments                                 │
│ ● Assessment         │                                                         │
│   Progress           │  ┌──────────────────────────┐ ┌──────────────────────┐  │
│                      │  │ DIAGNOSTIC               │ │ MASTERY CHECK        │  │
│                      │  │ 20 questions             │ │ Independent check    │  │
│                      │  │ Latest: 14/20            │ │ Status: Locked       │  │
│                      │  │ No hints                 │ │ Why locked?          │  │
│                      │  │ Chapter I only           │ │ Provisional pass rule│  │
│                      │  │ [View / Retake]          │ │ [View requirements]  │  │
│                      │  └──────────────────────────┘ └──────────────────────┘  │
│                      │                                                         │
│                      │  Assessment history / latest result summary             │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

The hub must make diagnostic and mastery check conceptually distinct before the student enters either task.

---

## 5. Diagnostic — active question

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ ← Exit diagnostic                 Chapter I Diagnostic              7 / 20     │
├───────────────────────────────────────────────────────────────────────────────┤
│  Purpose: find strengths and gaps; no hints or per-question feedback          │
│                                                                               │
│        ┌──────────────────────────────────────────────────────────────┐       │
│        │ stimulus / diagram                                          │       │
│        │                                                              │       │
│        │ Question prompt                                              │       │
│        │                                                              │       │
│        │ answer controls                                              │       │
│        │                                                              │       │
│        │                                             [Record answer]  │       │
│        └──────────────────────────────────────────────────────────────┘       │
│                                                                               │
│  After submit: neutral “Answer recorded” → next question                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Diagnostic completion

```text
Chapter I Diagnostic complete
14 / 20

Strengths        Developing        Needs support
[S01] [S03]      [S02] [S08]       [S09]

Recommended next action: S08 ...
[Start recommended practice]   [View full progress]
```

No result wording implies a whole-Grade-7 proficiency judgment.

---

## 6. Mastery Check — states

### Locked / remediation required

```text
Chapter I Mastery Check
Status: Not ready yet

Requirements still needing work:
S08  Developing
S09  Needs support

[Practice recommended skill]
```

### Ready

```text
Chapter I Mastery Check
Ready to verify your learning
20 questions · no help · no per-question feedback
Pass rule is provisional for the pilot

[Start mastery check]
```

### Passed

```text
Chapter I verified
Overall result: PASS
Per-skill result rows

[View Progress]
```

### Failed

```text
More practice needed
Overall result: NOT YET VERIFIED
Per-skill result rows
Recommended remediation skill

[Start remediation]
```

---

## 7. Progress — desktop

```text
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ PLATFORM             │  Progress                                   [Account ▾] │
│                      │                                                         │
│   Home               │  Իմ առաջընթացը                                         │
│   Physics 7          │                                                         │
│   Assessment         │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│ ● Progress           │  │ Chapter I   │ │ Diagnostic   │ │ Mastery Check   │   │
│                      │  │ 6/10 secure │ │ 14/20        │ │ Not verified    │   │
│                      │  └─────────────┘ └──────────────┘ └─────────────────┘   │
│                      │                                                         │
│                      │  SKILLS                                                 │
│                      │  S01  Secure      mastery 78      diag 2/2              │
│                      │  S02  Developing  mastery 63      diag 1/2              │
│                      │  S03  Verified?*  ...                                   │
│                      │  ...                                                    │
│                      │                                                         │
│                      │  Next recommended action                                │
│                      │  S08 ...                                    [Practice]  │
└──────────────────────┴─────────────────────────────────────────────────────────┘
```

`Verified` is only used where mastery-check semantics support it. Diagnostic and practice data remain separate columns/concepts.

---

## 8. Mobile browsing shell

```text
┌───────────────────────────────┐
│ Page title          [Account] │
├───────────────────────────────┤
│                               │
│ main page content             │
│ single-column cards           │
│                               │
│                               │
├───────────────────────────────┤
│ Home | Physics | Assess | Prog│
└───────────────────────────────┘
```

Long Armenian labels may shorten visually only if accessible names remain complete. Core task content must not require horizontal scrolling.

---

## 9. Mobile practice/assessment focus

```text
┌───────────────────────────────┐
│ ← Exit      S08        3 / 8  │
├───────────────────────────────┤
│ stimulus                      │
│                               │
│ question                      │
│                               │
│ answer controls               │
│                               │
│ [Help]                        │
│                               │
│ [Submit]                      │
└───────────────────────────────┘
```

The browsing bottom navigation is suppressed while a focused learning/assessment task is active. A clear exit/back action remains available.

---

## 10. Phase-B implementation constraint

Phase B should implement the shell and design primitives against these wireframes without moving grading, mastery, session, remediation or authorization logic into UI components. Visual polish may change proportions and arrangement, but the hierarchy and route responsibilities defined here are the approved architecture baseline.
