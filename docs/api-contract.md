# API contract — `submit-answer` v0.1

## Request

`POST /functions/v1/submit-answer`

Authenticated student request:

```json
{
  "itemId": "uuid",
  "response": {
    "value": 36,
    "unit": "km/h"
  },
  "responseTimeMs": 18400,
  "hintUsed": false
}
```

## Response

```json
{
  "itemId": "uuid",
  "skillId": "uuid",
  "grading": {
    "correct": true,
    "score": 1,
    "errorCode": null,
    "feedbackCode": "speed_correct"
  },
  "mastery": {
    "score": 0.61,
    "evidenceCount": 3,
    "status": "developing"
  },
  "recommendation": {
    "action": "continue_current_skill",
    "reason": "Continue practising the current skill before advancing."
  }
}
```

## Important boundary

The API never returns the protected answer key.
