# AI Assistant Safety

AI is disabled by default. External AI calls are blocked unless `AI_ENABLED=true` and a provider key is configured.

## Rules

- AI output is a draft.
- Clinicians must review AI output.
- AI must not make final diagnoses or treatment decisions.
- Do not send M-Pesa credentials, JWTs, database URLs, passwords, or secrets.
- Patient data must be minimized before external calls.
- AI usage should be audited when used in clinical workflows.

## Current behavior

`AiAssistantService` returns `enabled=false` unless `AI_ENABLED=true`. Clinical draft and ID OCR endpoints return a safe unavailable error when the feature flag is off.

## Safe use cases

- summarize visit history
- draft discharge summary
- summarize lab trends
- explain invoice items
- detect duplicate patient candidates
- write referral letters for clinician review
