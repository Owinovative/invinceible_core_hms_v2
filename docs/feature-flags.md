# Feature Flags

Feature flags let the platform roll out enterprise features safely.

## Flags

- `PATIENT_PORTAL_ENABLED=false`
- `AI_ENABLED=false`
- `SMS_ENABLED=false`
- `WHATSAPP_ENABLED=false`
- `SHA_ENABLED=true`
- `DATA_WAREHOUSE_ENABLED=false`
- `CLINICAL_DECISION_SUPPORT_ENABLED=true`
- `MOBILE_OPTIMIZED_VIEWS_ENABLED=true`

## Endpoint

`GET /enterprise/status` returns sanitized enabled/disabled values and no secrets.

Disabled features must fail safely with clear errors or hidden UI, not partial behavior.
