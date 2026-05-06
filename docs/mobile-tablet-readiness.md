# Mobile And Tablet Readiness

Hospital users need fast tablet workflows for rounds, triage, pharmacy, and queue work.

## Design rules

- Use large touch targets.
- Avoid wide tables on phones.
- Provide card views for queue, triage, prescriptions, and ward rounds.
- Keep search debounced.
- Keep critical actions as explicit buttons.
- Disable double-submit on forms.

## Target areas

- doctor queue
- triage
- consultation summary
- pharmacy dispense
- IPD ward rounds
- facility manager dashboard

The feature flag `MOBILE_OPTIMIZED_VIEWS_ENABLED` keeps the rollout controlled.
