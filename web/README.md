# Student Web Prototype

This folder contains the first browser-based student interface for the Grade 7 Physics MVP.

## What it does

1. Student signs up or signs in with Supabase Auth.
2. The app calls the JWT-protected `get-practice-item` Edge Function.
3. It renders multiple-choice, true/false, numeric and quantity items.
4. Structured stimuli are rendered locally for measurement scales, displacement experiments, unit conversions and indirect-measurement tasks.
5. The app sends the answer to the JWT-protected `submit-answer` Edge Function.
6. The backend grades deterministically, records the attempt and updates skill mastery.
7. The UI displays correctness, mastery estimate and recommendation.

The answer key is never shipped to this frontend.

## Run locally

Serve this directory through any static HTTP server. For example, from the repository root:

```bash
npx serve web
```

Then open the localhost URL printed by the server.

Opening `index.html` directly through `file://` is not the recommended test path because browser module/CORS behavior can vary.

## Supabase configuration

`config.js` contains only the project URL and the **publishable** browser key. It must never contain the service-role key.

## Content status

Current Chapter I content is development-only and tagged `provisional_no_sme_review`. It is suitable for engineering tests, not yet for a formal student pilot.
