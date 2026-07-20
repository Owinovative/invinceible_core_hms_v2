# Deployment & Configuration Guide: DHA Integration

## Environment Variables
The application requires strict configuration for DHA integration to function in `sandbox` or `production` modes. `env.validation.ts` enforces these constraints on startup.

Add the following to your `.env` file:

```env
# Enable/Disable DHA Integration entirely
DHA_ENABLED=true

# Mode: 'mock' (local dev), 'sandbox' (UAT), or 'production' (Live)
DHA_MODE=sandbox

# Base URLs
DHA_BASE_URL=https://ilm-dev.dha.go.ke/uat-middleware/api/v1
DHA_TOKEN_URL=https://issued-uat-base/api/v1/tenants/token

# Authentication Credentials provided by DHA
DHA_AUTH_STRATEGY=oauth2
DHA_CLIENT_ID=your_dha_client_id
DHA_CLIENT_SECRET=your_dha_client_secret
DHA_AGENT_ID=your_agent_id
DHA_CALLBACK_USERNAME=callback_username_shared_with_dha
DHA_CALLBACK_PASSWORD=callback_password_shared_with_dha

# Approved contract and verified Facility Registry identity
DHA_SPEC_VERSION=issued-contract-version
DHA_FACILITY_ID=FID-issued-by-dha
DHA_FACILITY_ID_TYPE=fr-code

# Generate with: openssl rand -base64 32
DATA_ENCRYPTION_KEY=base64-encoded-32-byte-key

# Optional Resiliency Config
DHA_TIMEOUT_MS=15000
DHA_MAX_ATTEMPTS=8
INTEGRATION_WORKER_ENABLED=true
```

## Security Best Practices
- **Never commit `.env` files.**
- DHA client secrets and callback credentials must be injected via a secure secret manager.
- Ensure outbound traffic on port 443 is allowed to `*.dha.go.ke`.
- Keep `DHA_PRODUCTION_ACTIVATION_APPROVED=false` until formal certification.

## Pre-Flight Checks
1. Boot the application in `sandbox` mode.
2. Verify that the backend successfully starts without `env.validation.ts` throwing an exception.
3. Exercise authentication, registries, eligibility, OTP/biometric consent,
   visits, preauthorization, claim lines, diagnoses, preview, submission,
   discharge, callbacks and SHR publication using DHA-provided UAT identities.
4. Follow the full gate in
   [`../integrations/dha-production-readiness.md`](../integrations/dha-production-readiness.md).
